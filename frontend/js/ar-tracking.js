import { loadARjs } from "./arjs-loader.js";

let context = null;
let markerRoot = null;
let markerControls = null;
let running = false;
let frameHandle = null;

export async function initialiseMarkerTracking(video) {
    const { THREE, THREEx } = await loadARjs();

    context = new THREEx.ArToolkitContext({
        cameraParametersUrl:
            "/static/vendor/arjs/data/camera_para.dat",
        detectionMode: "mono",
        canvasWidth: 640,
        canvasHeight: 480,
        maxDetectionRate: 60,
    });

    await new Promise((resolve) => {
        context.init(resolve);
    });

    markerRoot = new THREE.Group();
    markerRoot.matrixAutoUpdate = false;

    markerControls = new THREEx.ArMarkerControls(
        context,
        markerRoot,
        {
            type: "pattern",
            patternUrl:
                "/static/vendor/arjs/data/patt.hiro",
            size: 1,
            changeMatrixMode: "modelViewMatrix",
        },
    );

    return {
        projectionMatrix:
            context.getProjectionMatrix().clone(),
        markerRoot,
    };
}

export function startMarkerTracking(
    video,
    onPose,
    onLost,
) {
    if (!context || !markerRoot) {
        throw new Error(
            "Marker tracking has not been initialised.",
        );
    }

    stopMarkerTracking();
    running = true;

    const tick = () => {
        if (!running) {
            return;
        }

        if (
            video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
            context.update(video);

            if (markerRoot.visible) {
                markerRoot.updateMatrixWorld(true);

                onPose?.(
                    markerRoot.matrix.clone(),
                );
            } else {
                onLost?.();
            }
        }

        frameHandle = requestAnimationFrame(tick);
    };

    tick();
}

export function stopMarkerTracking() {
    running = false;

    if (frameHandle !== null) {
        cancelAnimationFrame(frameHandle);
        frameHandle = null;
    }
}

export function disposeMarkerTracking() {
    stopMarkerTracking();

    markerControls?.dispose?.();
    context?.dispose?.();

    markerControls = null;
    markerRoot = null;
    context = null;
}
