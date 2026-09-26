import { startCamera, stopCamera } from "./camera.js";
import { clearAnchor, placeAnchor } from "./anchor.js";
import {
    screenToVideoPoint,
    videoToScreenPoint,
    setTrackingTarget,
    startTracking,
    stopTracking,
} from "./tracker.js";

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

async function openCamera() {
    if (!selectedWindow) {
        readout.innerHTML = `
            <span>CAMERA</span>
            <strong>Select a window first</strong>
            <p>Choose Window 1, 2 or 3 before opening the camera.</p>
        `;
        return;
    }

    stopTracking();
    clearAnchor(anchorMarker);

    cameraInstruction.textContent =
        "Tap a sharp corner or distinctive point on the wall.";

    try {
        await startCamera(cameraVideo);
        hud.hidden = true;
        cameraView.hidden = false;
    } catch (error) {
        readout.innerHTML = `
            <span>CAMERA ERROR</span>
            <strong>Camera unavailable</strong>
            <p>${error.message}</p>
        `;
    }
}

function closeCamera() {
    stopTracking();
    stopCamera(cameraVideo);
    cameraView.hidden = true;
    hud.hidden = false;
}

function showTrackedPoint(point, score) {
    const screenPoint = videoToScreenPoint(
        cameraVideo,
        cameraStage,
        point.x,
        point.y,
    );

    placeAnchor(
        cameraStage,
        anchorMarker,
        `W${selectedWindow} · TRACKING`,
        cameraStage.getBoundingClientRect().left + screenPoint.x,
        cameraStage.getBoundingClientRect().top + screenPoint.y,
    );

    cameraInstruction.textContent =
        `W${selectedWindow} tracking · match ${score.toFixed(1)}`;
}

function showTrackingLost() {
    const label = anchorMarker.querySelector("[data-anchor-label]");

    if (label) {
        label.textContent = `W${selectedWindow} · TRACK LOST`;
    }

    cameraInstruction.textContent =
        "Tracking lost. Tap the physical point again.";
}

windows.forEach((element) => {
    element.addEventListener("click", () => selectWindow(element.dataset.window));
});

selectors.forEach((element) => {
    element.addEventListener("click", () => selectWindow(element.dataset.select));
});

cameraLaunch.addEventListener("click", openCamera);
cameraClose.addEventListener("click", closeCamera);

cameraStage.addEventListener("click", (event) => {
    if (event.target.closest("#camera-close")) {
        return;
    }

    stopTracking();

    const videoPoint = screenToVideoPoint(
        cameraVideo,
        cameraStage,
        event.clientX,
        event.clientY,
    );

    const targetSet = setTrackingTarget(cameraVideo, videoPoint);

    if (!targetSet) {
        cameraInstruction.textContent =
            "Too close to the camera edge. Tap farther inside the picture.";
        return;
    }

    placeAnchor(
        cameraStage,
        anchorMarker,
        `W${selectedWindow} · LOCKED`,
        event.clientX,
        event.clientY,
    );

    cameraInstruction.textContent =
        `W${selectedWindow} locked · move the camera slowly`;

    startTracking(
        cameraVideo,
        showTrackedPoint,
        showTrackingLost,
    );
});
