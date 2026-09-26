import * as THREE from "../vendor/three.module.js";

let loadPromise = null;

export function loadARjs() {
    if (window.THREEx) {
        return Promise.resolve({
            THREE,
            THREEx: window.THREEx,
        });
    }

    if (loadPromise) {
        return loadPromise;
    }

    // AR.js 3.4.8 is a UMD build and expects THREE globally.
    window.THREE = THREE;

    loadPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src = "/static/vendor/arjs/ar-threex.js";
        script.async = true;

        script.onload = () => {
            if (!window.THREEx) {
                reject(
                    new Error(
                        "AR.js loaded but window.THREEx was not created.",
                    ),
                );
                return;
            }

            resolve({
                THREE,
                THREEx: window.THREEx,
            });
        };

        script.onerror = () => {
            reject(
                new Error(
                    "Failed to load AR.js 3.4.8.",
                ),
            );
        };

        document.head.appendChild(script);
    });

    return loadPromise;
}
