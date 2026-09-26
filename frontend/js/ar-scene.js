import * as THREE from "../vendor/three.module.js";

let renderer = null;
let scene = null;
let camera = null;
let root = null;

const MATERIAL = new THREE.LineBasicMaterial({
    color: 0xffd978,
});

function line(points) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.Line(geometry, MATERIAL);
}

function wallPoint(wall, distanceMm, heightMm, offsetMm = 0) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const length = Math.hypot(dx, dy);

    if (!length) {
        throw new Error(`Wall ${wall.id} has zero length.`);
    }

    const ux = dx / length;
    const uy = dy / length;

    // Perpendicular to the wall in the XY plane.
    const nx = -uy;
    const ny = ux;

    return new THREE.Vector3(
        wall.start.x + ux * distanceMm + nx * offsetMm,
        wall.start.y + uy * distanceMm + ny * offsetMm,
        heightMm,
    );
}

function wallRectangle(
    wall,
    startMm,
    bottomMm,
    endMm,
    topMm,
    offsetMm = 0,
) {
    return line([
        wallPoint(wall, startMm, bottomMm, offsetMm),
        wallPoint(wall, endMm, bottomMm, offsetMm),
        wallPoint(wall, endMm, topMm, offsetMm),
        wallPoint(wall, startMm, topMm, offsetMm),
        wallPoint(wall, startMm, bottomMm, offsetMm),
    ]);
}

function addLabel(text, position) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;

    const context = canvas.getContext("2d");

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "900 54px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";

    context.lineWidth = 10;
    context.strokeStyle = "rgba(0,0,0,.9)";
    context.strokeText(text, 128, 64);

    context.fillStyle = "#ffd978";
    context.fillText(text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(700, 350, 1);

    root.add(sprite);
}

function buildWall(wall) {
    const length = Math.hypot(
        wall.end.x - wall.start.x,
        wall.end.y - wall.start.y,
    );

    // Full wall outline in its real XY position.
    root.add(
        wallRectangle(
            wall,
            0,
            0,
            length,
            wall.height,
        ),
    );

    for (const opening of wall.openings ?? []) {
        const left = opening.startMm;
        const right = opening.startMm + opening.widthMm;

        const bottom =
            opening.type === "door"
                ? 0
                : opening.sillMm;

        const top = opening.headMm;

        root.add(
            wallRectangle(
                wall,
                left,
                bottom,
                right,
                top,
                -10,
            ),
        );

        const labelPosition = wallPoint(
            wall,
            left + opening.widthMm / 2,
            bottom + (top - bottom) / 2,
            -25,
        );

        addLabel(opening.id, labelPosition);
    }
}

function buildRoom(model) {
    for (const wall of model.walls) {
        buildWall(wall);
    }
}

export function initialiseARScene(stage) {
    if (renderer) {
        return;
    }

    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
    });

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 2),
    );

    renderer.domElement.className = "three-ar-canvas";
    stage.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        60,
        1,
        10,
        50000,
    );

    // BrickHUD uses Z as vertical.
    camera.up.set(0, 0, 1);

    root = new THREE.Group();
    scene.add(root);

    resizeARScene(stage);
}

export function loadRoom(model) {
    if (!root) {
        throw new Error("AR scene has not been initialised.");
    }

    root.clear();
    buildRoom(model);
}

export function setPrototypeCamera() {
    if (!camera || !root) {
        return;
    }

    /*
     * Temporary camera pose only.
     *
     * This lets us inspect the room geometry.
     * Real camera pose will replace this later.
     */
    camera.position.set(
        2170,
        -6500,
        1500,
    );

    camera.lookAt(
        2170,
        1500,
        1200,
    );
}

export function resizeARScene(stage) {
    if (!renderer || !camera) {
        return;
    }

    const bounds = stage.getBoundingClientRect();

    renderer.setSize(
        bounds.width,
        bounds.height,
        false,
    );

    camera.aspect =
        bounds.width / bounds.height;

    camera.updateProjectionMatrix();
}

export function renderARScene() {
    if (!renderer || !scene || !camera) {
        return;
    }

    renderer.render(scene, camera);
}

export function clearARScene() {
    if (root) {
        root.clear();
    }
}

export function setARProjectionMatrix(matrix) {
    if (!camera) {
        throw new Error("AR scene has not been initialised.");
    }

    camera.projectionMatrix.copy(matrix);
    camera.projectionMatrixInverse
        .copy(matrix)
        .invert();
}

export function setARMarkerPose(markerMatrix) {
    if (!camera || !root) {
        return;
    }

    /*
     * AR.js gives us marker -> camera coordinates.
     *
     * Keep the Three camera at the AR origin and apply the
     * tracked marker transform to the complete BED 1 model.
     *
     * BrickHUD geometry is millimetres while the marker pose
     * uses marker-size units, so scale the room to metres here.
     */
    camera.matrixAutoUpdate = true;
    camera.position.set(0, 0, 0);
    camera.quaternion.identity();
    camera.scale.set(1, 1, 1);

    root.matrixAutoUpdate = false;
    root.matrix.copy(markerMatrix);

    const scale = new THREE.Matrix4().makeScale(
        0.001,
        0.001,
        0.001,
    );

    root.matrix.multiply(scale);
    root.visible = true;
}

export function setARTrackingVisible(visible) {
    if (root) {
        root.visible = visible;
    }
}

export function setDatumCameraPose(pose, fovDegrees = 55) {
    if (!camera || !root) {
        throw new Error("AR scene has not been initialised.");
    }

    /*
     * Return from the old AR.js marker-root transform to normal
     * world coordinates.
     */
    root.matrixAutoUpdate = true;
    root.position.set(0, 0, 0);
    root.quaternion.identity();
    root.scale.set(1, 1, 1);
    root.visible = true;

    camera.matrixAutoUpdate = true;
    camera.up.set(0, 0, 1);

    camera.position.set(
        pose.x,
        pose.y,
        pose.z,
    );

    /*
     * Recreate the same camera orientation used by datum-pose.js.
     *
     * Base forward direction is +Y with +Z as world up.
     */
    const euler = new THREE.Euler(
        pose.rx,
        pose.ry,
        pose.rz,
        "ZXY",
    );

    const forward = new THREE.Vector3(
        0,
        1,
        0,
    );

    forward.applyEuler(euler);

    camera.lookAt(
        pose.x + forward.x * 1000,
        pose.y + forward.y * 1000,
        pose.z + forward.z * 1000,
    );

    camera.fov = fovDegrees;
    camera.updateProjectionMatrix();
}


let xrSession = null;
let xrPlaced = false;

export async function supportsWalkAR() {
    if (!navigator.xr) {
        return false;
    }

    try {
        return await navigator.xr.isSessionSupported(
            "immersive-ar",
        );
    } catch {
        return false;
    }
}

export async function startWalkAR({
    stage,
    onStatus,
    onEnded,
} = {}) {
    if (!renderer || !scene || !camera || !root) {
        throw new Error(
            "AR scene has not been initialised.",
        );
    }

    if (!navigator.xr) {
        throw new Error(
            "WebXR is not available in this browser.",
        );
    }

    const supported =
        await navigator.xr.isSessionSupported(
            "immersive-ar",
        );

    if (!supported) {
        throw new Error(
            "Immersive AR is not supported on this device/browser.",
        );
    }

    if (xrSession) {
        return;
    }

    /*
     * WebXR/ARCore owns the real camera while the XR session is active.
     * Three.js receives the tracked viewer pose every XR frame.
     */
    xrSession = await navigator.xr.requestSession(
        "immersive-ar",
        {
            requiredFeatures: [
                "local-floor",
            ],
            optionalFeatures: [
                "dom-overlay",
            ],
            domOverlay: stage
                ? { root: stage }
                : undefined,
        },
    );

    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType(
        "local-floor",
    );

    /*
     * BrickHUD model coordinates:
     *
     * X = right
     * Y = forward through plan
     * Z = height
     *
     * WebXR:
     *
     * X = right
     * Y = height
     * -Z = forward
     *
     * Rotate the complete building -90 degrees around X:
     *
     * BrickHUD +Y -> WebXR -Z
     * BrickHUD +Z -> WebXR +Y
     *
     * Then convert millimetres to metres.
     */
    root.matrixAutoUpdate = true;
    root.position.set(
        0,
        0,
        -2,
    );

    root.rotation.set(
        -Math.PI / 2,
        0,
        0,
    );

    root.scale.set(
        0.001,
        0.001,
        0.001,
    );

    root.visible = true;
    xrPlaced = true;

    xrSession.addEventListener(
        "end",
        () => {
            xrSession = null;
            xrPlaced = false;

            renderer.setAnimationLoop(null);
            renderer.xr.enabled = false;

            /*
             * Restore normal BrickHUD model transform.
             * Desktop datum mode can then be used again.
             */
            root.position.set(0, 0, 0);
            root.rotation.set(0, 0, 0);
            root.scale.set(1, 1, 1);

            if (onEnded) {
                onEnded();
            }
        },
        { once: true },
    );

    await renderer.xr.setSession(
        xrSession,
    );

    renderer.setAnimationLoop(() => {
        renderer.render(
            scene,
            camera,
        );
    });

    if (onStatus) {
        onStatus(
            "WALK AR ACTIVE · BED 1 FIXED IN WORLD",
        );
    }
}

export async function stopWalkAR() {
    if (!xrSession) {
        return;
    }

    await xrSession.end();
}

export function isWalkARActive() {
    return Boolean(
        xrSession && xrPlaced,
    );
}
