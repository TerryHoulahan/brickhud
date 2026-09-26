const APPROX_PIXELS_PER_MM = 0.18;

let overlay = null;

function ensureOverlay(stage) {
    if (overlay) {
        return overlay;
    }

    overlay = document.createElement("div");
    overlay.className = "room-camera-overlay";
    stage.appendChild(overlay);

    return overlay;
}

function createOpeningLabel(opening) {
    const element = document.createElement("div");

    element.className = "mapped-opening";
    element.dataset.openingId = opening.id;

    element.innerHTML = `
        <strong>${opening.id}</strong>
        <span>${opening.type.toUpperCase()}</span>
    `;

    return element;
}

export function clearRoomOverlay() {
    if (overlay) {
        overlay.replaceChildren();
    }
}

export function renderWallFromAnchor(
    stage,
    room,
    wall,
    referenceOpeningId,
    anchorScreenPoint,
) {
    const layer = ensureOverlay(stage);
    layer.replaceChildren();

    const reference = wall.openings.find(
        (opening) => opening.id === referenceOpeningId,
    );

    if (!reference) {
        return;
    }

    const roomLabel = document.createElement("div");
    roomLabel.className = "mapped-room-name";
    roomLabel.textContent = room.name;

    roomLabel.style.left = `${anchorScreenPoint.x}px`;
    roomLabel.style.top = `${Math.max(90, anchorScreenPoint.y - 110)}px`;

    layer.appendChild(roomLabel);

    for (const opening of wall.openings) {
        const label = createOpeningLabel(opening);

        const differenceMm = opening.xMm - reference.xMm;
        const offsetPx = differenceMm * APPROX_PIXELS_PER_MM;

        label.style.left = `${anchorScreenPoint.x + offsetPx}px`;
        label.style.top = `${anchorScreenPoint.y}px`;

        if (opening.id === referenceOpeningId) {
            label.classList.add("reference-opening");
        }

        layer.appendChild(label);
    }
}
