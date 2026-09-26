const PATCH_SIZE = 32;
const SEARCH_RADIUS = 55;
const SAMPLE_STEP = 4;
const FRAME_INTERVAL_MS = 80;
const LOST_THRESHOLD = 38;

let running = false;
let frameCanvas = null;
let frameContext = null;
let lastFrameTime = 0;

/*
 * Multiple physical reference points can now be tracked at once.
 *
 * Each target:
 * {
 *   id,
 *   template,
 *   point: { x, y },
 *   score,
 *   visible
 * }
 */
const targets = new Map();

function ensureCanvas(video) {
    if (!frameCanvas) {
        frameCanvas = document.createElement("canvas");
        frameContext = frameCanvas.getContext("2d", {
            willReadFrequently: true,
        });
    }

    if (
        frameCanvas.width !== video.videoWidth ||
        frameCanvas.height !== video.videoHeight
    ) {
        frameCanvas.width = video.videoWidth;
        frameCanvas.height = video.videoHeight;
    }
}

function captureFrame(video) {
    ensureCanvas(video);

    frameContext.drawImage(
        video,
        0,
        0,
        frameCanvas.width,
        frameCanvas.height,
    );
}

function getPatch(x, y) {
    const half = PATCH_SIZE / 2;

    const left = Math.round(x - half);
    const top = Math.round(y - half);

    if (
        left < 0 ||
        top < 0 ||
        left + PATCH_SIZE >= frameCanvas.width ||
        top + PATCH_SIZE >= frameCanvas.height
    ) {
        return null;
    }

    return frameContext.getImageData(
        left,
        top,
        PATCH_SIZE,
        PATCH_SIZE,
    );
}

function patchDifference(a, b) {
    let difference = 0;
    let samples = 0;

    for (let y = 0; y < PATCH_SIZE; y += SAMPLE_STEP) {
        for (let x = 0; x < PATCH_SIZE; x += SAMPLE_STEP) {
            const index = (y * PATCH_SIZE + x) * 4;

            difference += Math.abs(
                a.data[index] - b.data[index],
            );
            difference += Math.abs(
                a.data[index + 1] - b.data[index + 1],
            );
            difference += Math.abs(
                a.data[index + 2] - b.data[index + 2],
            );

            samples += 3;
        }
    }

    return difference / samples;
}

function findBestMatch(target) {
    if (!target.template || !target.point) {
        return null;
    }

    let best = null;

    for (
        let y = target.point.y - SEARCH_RADIUS;
        y <= target.point.y + SEARCH_RADIUS;
        y += SAMPLE_STEP
    ) {
        for (
            let x = target.point.x - SEARCH_RADIUS;
            x <= target.point.x + SEARCH_RADIUS;
            x += SAMPLE_STEP
        ) {
            const patch = getPatch(x, y);

            if (!patch) {
                continue;
            }

            const score = patchDifference(
                target.template,
                patch,
            );

            if (!best || score < best.score) {
                best = { x, y, score };
            }
        }
    }

    return best;
}

export function screenToVideoPoint(
    video,
    stage,
    clientX,
    clientY,
) {
    const bounds = stage.getBoundingClientRect();

    const scale = Math.max(
        bounds.width / video.videoWidth,
        bounds.height / video.videoHeight,
    );

    const renderedWidth = video.videoWidth * scale;
    const renderedHeight = video.videoHeight * scale;

    const cropX = (renderedWidth - bounds.width) / 2;
    const cropY = (renderedHeight - bounds.height) / 2;

    return {
        x: (clientX - bounds.left + cropX) / scale,
        y: (clientY - bounds.top + cropY) / scale,
    };
}

export function videoToScreenPoint(
    video,
    stage,
    x,
    y,
) {
    const bounds = stage.getBoundingClientRect();

    const scale = Math.max(
        bounds.width / video.videoWidth,
        bounds.height / video.videoHeight,
    );

    const renderedWidth = video.videoWidth * scale;
    const renderedHeight = video.videoHeight * scale;

    const cropX = (renderedWidth - bounds.width) / 2;
    const cropY = (renderedHeight - bounds.height) / 2;

    return {
        x: x * scale - cropX,
        y: y * scale - cropY,
    };
}

/*
 * Add or replace one tracked reference.
 * Captures its own template from the current video frame.
 */
export function addTrackingTarget(video, id, point) {
    captureFrame(video);

    const patch = getPatch(point.x, point.y);

    if (!patch) {
        return false;
    }

    targets.set(id, {
        id,
        template: patch,
        point: {
            x: point.x,
            y: point.y,
        },
        score: 0,
        visible: true,
    });

    return true;
}

export function removeTrackingTarget(id) {
    targets.delete(id);
}

export function clearTrackingTargets() {
    targets.clear();
}

/*
 * Temporary compatibility function.
 * Old callers can still set one target while we migrate.
 */
export function setTrackingTarget(video, point) {
    clearTrackingTargets();
    return addTrackingTarget(
        video,
        "legacy-target",
        point,
    );
}

export function getTrackingTargets() {
    return Array.from(targets.values()).map((target) => ({
        id: target.id,
        point: {
            x: target.point.x,
            y: target.point.y,
        },
        score: target.score,
        visible: target.visible,
    }));
}

export function startMultiTracking(
    video,
    onUpdate,
    onLost,
) {
    running = true;
    lastFrameTime = 0;

    function processFrame(now) {
        if (!running) {
            return;
        }

        if (now - lastFrameTime >= FRAME_INTERVAL_MS) {
            lastFrameTime = now;

            captureFrame(video);

            const observations = [];

            for (const target of targets.values()) {
                const match = findBestMatch(target);

                if (
                    !match ||
                    match.score > LOST_THRESHOLD
                ) {
                    target.visible = false;

                    observations.push({
                        id: target.id,
                        point: { ...target.point },
                        score: match?.score ?? Infinity,
                        visible: false,
                    });

                    continue;
                }

                target.point = {
                    x: match.x,
                    y: match.y,
                };

                target.score = match.score;
                target.visible = true;

                observations.push({
                    id: target.id,
                    point: { ...target.point },
                    score: target.score,
                    visible: true,
                });
            }

            const visible = observations.filter(
                (observation) => observation.visible,
            );

            if (visible.length) {
                onUpdate(observations);
            } else if (targets.size) {
                onLost(observations);
            }
        }

        video.requestVideoFrameCallback(processFrame);
    }

    video.requestVideoFrameCallback(processFrame);
}

export function startTracking(
    video,
    onUpdate,
    onLost,
) {
    startMultiTracking(
        video,
        (observations) => {
            const observation = observations.find(
                (item) => item.visible,
            );

            if (observation) {
                onUpdate(
                    observation.point,
                    observation.score,
                );
            }
        },
        () => onLost(),
    );
}

/*
 * Stop processing frames but KEEP the targets.
 * This is useful while adding another anchor.
 */
export function pauseTracking() {
    running = false;
}

/*
 * Full stop/reset.
 */
export function stopTracking() {
    running = false;
    clearTrackingTargets();
}
