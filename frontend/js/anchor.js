export function placeAnchor(stage, marker, label, clientX, clientY) {
    const bounds = stage.getBoundingClientRect();

    const x = clientX - bounds.left;
    const y = clientY - bounds.top;

    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
    marker.querySelector("[data-anchor-label]").textContent = label;
    marker.hidden = false;

    return {
        x: x / bounds.width,
        y: y / bounds.height,
    };
}

export function clearAnchor(marker) {
    marker.hidden = true;
}
