/*
 * BrickHUD datum camera registration.
 *
 * Prototype camera-pose solver.
 *
 * Known BED 1 XYZ points are projected into the 640x480 webcam image.
 * We optimise a six-parameter camera pose:
 *
 *   camera position: x, y, z
 *   camera rotation: rx, ry, rz
 *
 * Camera intrinsics are approximated from a 70 degree horizontal FOV.
 * Later this can be replaced by proper camera calibration.
 */

const DEG = Math.PI / 180;

function rotateX(p, a) {
    const c = Math.cos(a);
    const s = Math.sin(a);

    return {
        x: p.x,
        y: c * p.y - s * p.z,
        z: s * p.y + c * p.z,
    };
}

function rotateY(p, a) {
    const c = Math.cos(a);
    const s = Math.sin(a);

    return {
        x: c * p.x + s * p.z,
        y: p.y,
        z: -s * p.x + c * p.z,
    };
}

function rotateZ(p, a) {
    const c = Math.cos(a);
    const s = Math.sin(a);

    return {
        x: c * p.x - s * p.y,
        y: s * p.x + c * p.y,
        z: p.z,
    };
}

function worldToCamera(world, pose) {
    let p = {
        x: world.x - pose.x,
        y: world.y - pose.y,
        z: world.z - pose.z,
    };

    /*
     * Inverse camera rotation.
     */
    p = rotateZ(p, -pose.rz);
    p = rotateX(p, -pose.rx);
    p = rotateY(p, -pose.ry);

    /*
     * BrickHUD world:
     * X = right
     * Y = into plan
     * Z = up
     *
     * Camera:
     * X = right
     * Y = down
     * Z = forward
     */
    return {
        x: p.x,
        y: -p.z,
        z: p.y,
    };
}

function intrinsics(width, height) {
    const horizontalFov = 70 * DEG;

    const fx =
        width /
        (2 * Math.tan(horizontalFov / 2));

    return {
        fx,
        fy: fx,
        cx: width / 2,
        cy: height / 2,
    };
}

function project(world, pose, camera) {
    const p = worldToCamera(world, pose);

    if (p.z <= 50) {
        return null;
    }

    return {
        x: camera.fx * p.x / p.z + camera.cx,
        y: camera.fy * p.y / p.z + camera.cy,
    };
}

function errorForPose(observations, pose, camera) {
    let error = 0;

    for (const observation of observations) {
        const projected = project(
            observation.planAnchor.position,
            pose,
            camera,
        );

        if (!projected) {
            return 1e15;
        }

        const dx =
            projected.x - observation.videoPoint.x;

        const dy =
            projected.y - observation.videoPoint.y;

        error += dx * dx + dy * dy;
    }

    return error / observations.length;
}

function optimise(
    observations,
    initial,
    camera,
) {
    const pose = { ...initial };

    let best =
        errorForPose(observations, pose, camera);

    let steps = [
        1000,
        1000,
        500,
        12 * DEG,
        12 * DEG,
        12 * DEG,
    ];

    const names = [
        "x",
        "y",
        "z",
        "rx",
        "ry",
        "rz",
    ];

    for (let pass = 0; pass < 80; pass += 1) {
        let improved = false;

        for (let i = 0; i < names.length; i += 1) {
            const name = names[i];
            const original = pose[name];

            for (const direction of [-1, 1]) {
                pose[name] =
                    original + direction * steps[i];

                const candidate =
                    errorForPose(
                        observations,
                        pose,
                        camera,
                    );

                if (candidate < best) {
                    best = candidate;
                    improved = true;
                    break;
                }

                pose[name] = original;
            }
        }

        if (!improved) {
            steps = steps.map(
                (step) => step * 0.65,
            );
        }

        if (
            Math.max(
                steps[0],
                steps[1],
                steps[2],
            ) < 0.5 &&
            Math.max(
                steps[3],
                steps[4],
                steps[5],
            ) < 0.0001
        ) {
            break;
        }
    }

    return {
        pose,
        rmsPixels: Math.sqrt(best),
    };
}

export function solveDatumPose(
    observations,
    videoWidth,
    videoHeight,
) {
    if (observations.length < 4) {
        throw new Error(
            "At least four datum observations are required.",
        );
    }

    const camera =
        intrinsics(videoWidth, videoHeight);

    /*
     * Multiple starting positions help avoid a bad local minimum.
     *
     * Camera starts outside/in front of the room and approximately
     * chest/head height.
     */
    const starts = [
        {
            x: 2170,
            y: -5000,
            z: 1500,
            rx: 0,
            ry: 0,
            rz: 0,
        },
        {
            x: 2170,
            y: -8000,
            z: 1500,
            rx: 0,
            ry: 0,
            rz: 0,
        },
        {
            x: -3000,
            y: -5000,
            z: 1500,
            rx: 0,
            ry: 0,
            rz: -25 * DEG,
        },
        {
            x: 6000,
            y: -5000,
            z: 1500,
            rx: 0,
            ry: 0,
            rz: 25 * DEG,
        },
    ];

    let result = null;

    for (const start of starts) {
        const candidate =
            optimise(
                observations,
                start,
                camera,
            );

        if (
            !result ||
            candidate.rmsPixels <
                result.rmsPixels
        ) {
            result = candidate;
        }
    }

    return {
        ...result,
        camera,
    };
}
