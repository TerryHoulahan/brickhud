const windows = document.querySelectorAll("[data-window]");
const selectors = document.querySelectorAll("[data-select]");
const readout = document.getElementById("readout");

function selectWindow(number) {
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
}

windows.forEach((element) => {
    element.addEventListener("click", () => selectWindow(element.dataset.window));
});

selectors.forEach((element) => {
    element.addEventListener("click", () => selectWindow(element.dataset.select));
});
