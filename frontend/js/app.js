import { startCamera, stopCamera } from "./camera.js";
import { clearAnchor, placeAnchor } from "./anchor.js";
import {
    screenToVideoPoint,
    videoToScreenPoint,
    addTrackingTarget,
    startMultiTracking,
    pauseTracking,
    stopTracking,
} from "./tracker.js";
import { BED_1 } from "./room-data.js";
import { BED_1_MODEL, getOpeningAnchorPoints } from "./room-model.js";
import { solveDatumPose } from "./datum-pose.js";
import {
    initialiseARScene,
    loadRoom,
    resizeARScene,
    renderARScene,
    clearARScene,
    setARProjectionMatrix,
    setARMarkerPose,
    setARTrackingVisible,
    setDatumCameraPose,
    supportsWalkAR,
    startWalkAR,
    stopWalkAR,
    isWalkARActive,
} from "./ar-scene.js";



import {
    clearRoomOverlay,
    renderWallFromAnchor,
} from "./room-overlay.js";

const windows = document.querySelectorAll("[data-window]");
const selectors = document.querySelectorAll("[data-select]");
const readout = document.getElementById("readout");

const hud = document.getElementById("hud");
const cameraLaunch = document.getElementById("camera-launch");
const cameraView = document.getElementById("camera-view");
const cameraStage = document.getElementById("camera-stage");
const cameraVideo = document.getElementById("camera-video");
const cameraClose = document.getElementById("camera-close");
const cameraOpening = document.getElementById("camera-opening");
const cameraInstruction = document.getElementById("camera-instruction");
const anchorMarker = document.getElementById("anchor-marker");
const alignmentStatus = document.getElementById("alignment-status");
const alignRoom = document.getElementById("align-room");
const walkAR = document.getElementById("walk-ar");

let selectedWindow = null;

function selectWindow(number) {
    selectedWindow = number;

    windows.forEach((element) => {
        element.classList.toggle("active", element.dataset.window === number);
    });

    selectors.forEach((element) => {
        element.classList.toggle("active", element.dataset.select === number);
    });

    readout.innerHTML = `
        <span>BACK WALL · OPENING</span>
        <strong>Window ${number}</strong>
        <p>Selected on the 4200 mm back wall.</p>
    `;

    cameraOpening.textContent = `W${number} · WINDOW ${number}`;
}

const anchorPicker = document.getElementById("anchor-picker");
const anchorReference = document.getElementById("anchor-reference");
const anchorConfirm = document.getElementById("anchor-confirm");
const anchorCancel = document.getElementById("anchor-cancel");

const planAnchorPoints = getOpeningAnchorPoints(BED_1_MODEL);

let pendingVideoPoint = null;
let pendingScreenPoint = null;
let roomAnchors = [];

function populateAnchorReferences() {
    anchorReference.innerHTML = "";

    for (const anchor of planAnchorPoints) {
        const option = document.createElement("option");
        option.value = anchor.id;
        option.textContent = anchor.label;
        anchorReference.appendChild(option);
    }
}

function findPlanAnchor(id) {
    return planAnchorPoints.find((anchor) => anchor.id === id);
}

function updateAlignmentStatus() {
    const count = roomAnchors.length;

    alignRoom.disabled = count < 4;

    if (count === 0) {
        alignmentStatus.textContent =
            "SET 4 ROOM REFERENCES";

        cameraInstruction.textContent =
            "Tap a known BED 1 point to set Anchor 1.";

        return;
    }

    if (count === 1) {
        alignmentStatus.textContent =
            "ANCHOR 1 SET · ADD 2 MORE";

        cameraInstruction.textContent =
            "Anchor 1 set · tap another known point.";

        return;
    }

    if (count === 2) {
        alignmentStatus.textContent =
            "2 ANCHORS SET · ADD 2 MORE";

        cameraInstruction.textContent =
            "Two references set · add two more.";

        return;
    }

    if (count === 3) {
        alignmentStatus.textContent =
            "3 ANCHORS SET · ADD 1 MORE";

        cameraInstruction.textContent =
            "Three references set · add one more.";

        return;
    }

    alignmentStatus.textContent =
        `${count} ANCHORS SET · READY TO ALIGN`;

    cameraInstruction.textContent =
        "Press ALIGN BED 1.";
}

async function openCamera() {
    stopTracking();
    clearAnchor(anchorMarker);
    clearRoomOverlay();

    roomAnchors = [];
    pendingVideoPoint = null;
    pendingScreenPoint = null;

    alignRoom.disabled = true;
    alignmentStatus.textContent =
        "SET 4 ROOM REFERENCES";

    populateAnchorReferences();

    cameraOpening.textContent = "BED 1 · ALIGN ROOM";
    cameraInstruction.textContent =
        "Tap a known BED 1 point to set Anchor 1.";

    try {
        await startCamera(cameraVideo);

        hud.hidden = true;
        cameraView.hidden = false;

        initialiseARScene(cameraStage);
        loadRoom(BED_1_MODEL);

        resizeARScene(cameraStage);

        setARTrackingVisible(true);
        resizeARScene(cameraStage);
        renderARScene();

        alignmentStatus.textContent =
            "SET 4 ROOM DATUMS";

        cameraInstruction.textContent =
            "Tap W1, W2, W3 and W4 reference points to register BED 1.";
    } catch (error) {
        readout.innerHTML = `
            <span>CAMERA ERROR</span>
            <strong>Camera unavailable</strong>
            <p>${error.message}</p>
        `;
    }
}

async function closeCamera() {
    if (isWalkARActive()) {
        await stopWalkAR();
    }

    stopTracking();
    clearRoomOverlay();
    clearAnchor(anchorMarker);
    clearARScene();
    stopCamera(cameraVideo);

    anchorPicker.hidden = true;
    pendingVideoPoint = null;
    pendingScreenPoint = null;
    roomAnchors = [];

    cameraView.hidden = true;
    hud.hidden = false;
}

function showTrackedPoints(observations) {
    let visibleCount = 0;

    for (const tracked of observations) {
        const observation = roomAnchors.find(
            (anchor) => anchor.id === tracked.id,
        );

        if (!observation || !tracked.visible) {
            continue;
        }

        visibleCount += 1;

        observation.videoPoint = {
            x: tracked.point.x,
            y: tracked.point.y,
        };

        observation.score = tracked.score;
        observation.visible = true;
    }

    for (const observation of roomAnchors) {
        const tracked = observations.find(
            (item) => item.id === observation.id,
        );

        observation.visible = Boolean(tracked?.visible);
    }

    cameraInstruction.textContent =
        `${roomAnchors.length} anchor(s) set · ${visibleCount} tracking`;
}

function showTrackingLost() {
    cameraInstruction.textContent =
        `${roomAnchors.length} anchor(s) stored · references out of view`;
}

function restartRoomTracking() {
    pauseTracking();

    if (!roomAnchors.length) {
        return;
    }

    startMultiTracking(
        cameraVideo,
        showTrackedPoints,
        showTrackingLost,
    );
}

function cancelPendingAnchor() {
    pendingVideoPoint = null;
    pendingScreenPoint = null;
    anchorPicker.hidden = true;
    updateAlignmentStatus();
}

function confirmPendingAnchor() {
    if (!pendingVideoPoint || !pendingScreenPoint) {
        return;
    }

    const planAnchor = findPlanAnchor(anchorReference.value);

    if (!planAnchor) {
        return;
    }

    const observation = {
        id: `anchor-${roomAnchors.length + 1}`,
        planAnchor,
        videoPoint: {
            x: pendingVideoPoint.x,
            y: pendingVideoPoint.y,
        },
    };

    roomAnchors.push(observation);

    anchorPicker.hidden = true;

    placeAnchor(
        cameraStage,
        anchorMarker,
        `${planAnchor.openingId} · A${roomAnchors.length}`,
        pendingScreenPoint.x,
        pendingScreenPoint.y,
    );

    pauseTracking();

    const targetSet = addTrackingTarget(
        cameraVideo,
        observation.id,
        observation.videoPoint,
    );

    if (!targetSet) {
        roomAnchors.pop();

        cameraInstruction.textContent =
            "Anchor too close to camera edge · tap again.";

        pendingVideoPoint = null;
        pendingScreenPoint = null;
        return;
    }

    restartRoomTracking();

    pendingVideoPoint = null;
    pendingScreenPoint = null;

    updateAlignmentStatus();

    console.table(
        roomAnchors.map((anchor) => ({
            anchor: anchor.id,
            reference: anchor.planAnchor.label,
            videoX: Math.round(anchor.videoPoint.x),
            videoY: Math.round(anchor.videoPoint.y),
            worldX: anchor.planAnchor.position.x,
            worldY: anchor.planAnchor.position.y,
            worldZ: anchor.planAnchor.position.z,
        })),
    );
}

windows.forEach((element) => {
    element.addEventListener("click", () => selectWindow(element.dataset.window));
});

selectors.forEach((element) => {
    element.addEventListener("click", () => selectWindow(element.dataset.select));
});

walkAR.addEventListener("click", async (event) => {
    event.stopPropagation();

    try {
        /*
         * The normal webcam stream must release the physical camera.
         * ARCore/WebXR becomes the camera owner during immersive AR.
         */
        stopTracking();
        stopCamera(cameraVideo);

        cameraVideo.hidden = true;
        anchorPicker.hidden = true;

        initialiseARScene(cameraStage);
        loadRoom(BED_1_MODEL);

        alignmentStatus.textContent =
            "STARTING WALK AR";

        cameraInstruction.textContent =
            "ARCore is establishing world tracking.";

        await startWalkAR({
            stage: cameraStage,

            onStatus(message) {
                alignmentStatus.textContent =
                    message;

                cameraInstruction.textContent =
                    "Walk toward, away from and around BED 1.";
            },

            onEnded() {
                cameraVideo.hidden = false;

                alignmentStatus.textContent =
                    "WALK AR ENDED";

                cameraInstruction.textContent =
                    "Open the camera again for datum alignment.";
            },
        });
    } catch (error) {
        console.error(
            "BrickHUD Walk AR:",
            error,
        );

        cameraVideo.hidden = false;

        alignmentStatus.textContent =
            "WALK AR UNAVAILABLE";

        cameraInstruction.textContent =
            error.message;
    }
});

supportsWalkAR().then((supported) => {
    if (!supported) {
        walkAR.disabled = true;
        walkAR.title =
            "Requires an ARCore/WebXR compatible phone browser.";
    }
});

cameraLaunch.addEventListener("click", openCamera);
cameraClose.addEventListener("click", closeCamera);

cameraStage.addEventListener("click", (event) => {
    if (
        event.target.closest("#camera-close") ||
        event.target.closest("#anchor-picker")
    ) {
        return;
    }

    pauseTracking();

    const videoPoint = screenToVideoPoint(
        cameraVideo,
        cameraStage,
        event.clientX,
        event.clientY,
    );

    pendingVideoPoint = videoPoint;
    pendingScreenPoint = {
        x: event.clientX,
        y: event.clientY,
    };

    placeAnchor(
        cameraStage,
        anchorMarker,
        `ANCHOR ${roomAnchors.length + 1}`,
        event.clientX,
        event.clientY,
    );

    anchorPicker.hidden = false;

    cameraInstruction.textContent =
        "Choose which BED 1 plan point you tapped.";
});

anchorConfirm.addEventListener("click", (event) => {
    event.stopPropagation();
    confirmPendingAnchor();
});

anchorCancel.addEventListener("click", (event) => {
    event.stopPropagation();
    cancelPendingAnchor();
});

alignRoom.addEventListener("click", (event) => {
    event.stopPropagation();

    if (roomAnchors.length < 4) {
        return;
    }

    pauseTracking();

    try {
        const result = solveDatumPose(
            roomAnchors,
            cameraVideo.videoWidth,
            cameraVideo.videoHeight,
        );

        /*
         * datum-pose.js assumes a 70 degree horizontal FOV.
         * Convert that to the vertical FOV Three.js expects.
         */
        const horizontalFov =
            70 * Math.PI / 180;

        const verticalFov =
            2 * Math.atan(
                Math.tan(horizontalFov / 2) *
                (
                    cameraVideo.videoHeight /
                    cameraVideo.videoWidth
                ),
            ) *
            180 / Math.PI;

        setDatumCameraPose(
            result.pose,
            verticalFov,
        );

        resizeARScene(cameraStage);
        renderARScene();

        alignmentStatus.textContent =
            `BED 1 ALIGNED · ${result.rmsPixels.toFixed(1)} PX`;

        cameraInstruction.textContent =
            "BED 1 registered to the four selected datums.";

        console.log(
            "BrickHUD datum pose:",
            result,
        );
    } catch (error) {
        console.error(error);

        alignmentStatus.textContent =
            "ALIGNMENT FAILED";

        cameraInstruction.textContent =
            error.message;
    }
});

