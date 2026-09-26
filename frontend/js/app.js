import { startCamera, stopCamera } from "./camera.js";
import { clearAnchor, placeAnchor } from "./anchor.js";

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
let anchor = null;

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

    clearAnchor(anchorMarker);
    anchor = null;
    cameraInstruction.textContent = "Point at the wall, then tap the anchor point.";

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
    stopCamera(cameraVideo);
    cameraView.hidden = true;
    hud.hidden = false;
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

    anchor = placeAnchor(
        cameraStage,
        anchorMarker,
        `W${selectedWindow} · ANCHOR`,
        event.clientX,
        event.clientY,
    );

    cameraInstruction.textContent =
        `W${selectedWindow} anchored · tap another point to reposition`;
});
