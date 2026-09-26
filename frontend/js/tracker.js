const PATCH_SIZE = 32;
const SEARCH_RADIUS = 55;
const SAMPLE_STEP = 4;
const FRAME_INTERVAL_MS = 80;
const LOST_THRESHOLD = 38;

let running = false;
let frameCanvas = null;
let frameContext = null;
let template = null;
let trackedPoint = null;
let lastFrameTime = 0;

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

            difference += Math.abs(a.data[index] - b.data[index]);
            difference += Math.abs(a.data[index + 1] - b.data[index + 1]);
            difference += Math.abs(a.data[index + 2] - b.data[index + 2]);

            samples += 3;
        }
    }

    return difference / samples;
}

function findBestMatch() {
    if (!template || !trackedPoint) {
        return null;
    }

    let best = null;

    for (
        let y = trackedPoint.y - SEARCH_RADIUS;
        y <= trackedPoint.y + SEARCH_RADIUS;
        y += SAMPLE_STEP
    ) {
        for (
            let x = trackedPoint.x - SEARCH_RADIUS;
            x <= trackedPoint.x + SEARCH_RADIUS;
            x += SAMPLE_STEP
        ) {
            const patch = getPatch(x, y);

            if (!patch) {
                continue;
            }

            const score = patchDifference(template, patch);

            if (!best || score < best.score) {
                best = { x, y, score };
            }
        }
    }

    return best;
}

export function screenToVideoPoint(video, stage, clientX, clientY) {
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

export function videoToScreenPoint(video, stage, x, y) {
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

export function setTrackingTarget(video, point) {
    captureFrame(video);

    const patch = getPatch(point.x, point.y);

    if (!patch) {
        return false;
    }

    template = patch;
    trackedPoint = {
        x: point.x,
        y: point.y,
    };

    return true;
}

export function startTracking(video, onUpdate, onLost) {
    running = true;
    lastFrameTime = 0;

    function processFrame(now) {
        if (!running) {
            return;
        }

        if (now - lastFrameTime >= FRAME_INTERVAL_MS) {
            lastFrameTime = now;

            captureFrame(video);

            const match = findBestMatch();

            if (!match || match.score > LOST_THRESHOLD) {
                running = false;
                onLost();
                return;
            }

            trackedPoint = {
                x: match.x,
                y: match.y,
            };

            onUpdate(trackedPoint, match.score);
        }

        video.requestVideoFrameCallback(processFrame);
    }

    video.requestVideoFrameCallback(processFrame);
}

export function stopTracking() {
    running = false;
    template = null;
    trackedPoint = null;
}
