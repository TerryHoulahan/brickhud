let activeStream = null;

export async function startCamera(video) {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported by this browser.");
    }

    activeStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            facingMode: { ideal: "environment" }
        }
    });

    video.srcObject = activeStream;
    await video.play();
}

export function stopCamera(video) {
    if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
        activeStream = null;
    }

    video.srcObject = null;
}
