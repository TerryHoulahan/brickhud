/*
 * BED 1 prototype geometry.
 *
 * Coordinate system:
 *   X = right from top-left room corner
 *   Y = down the plan
 *   Z = height above slab
 *
 * Dimensions are millimetres.
 *
 * Overall dimensions are authoritative.
 * Individual hand-measured opening/set-out dimensions are approximate.
 */

const WALL_HEIGHT = 2450;
const WINDOW_SILL = 250;
const WINDOW_HEAD = 2200;
const DOOR_HEAD = 2040;

/*
 * Top wall:
 *
 * overall = 4340
 *
 * Rough measured chain from sketch:
 *   550 / W1 / 600 / W2 / 610 / W3 / remainder
 *
 * The window measurements below preserve the measured arrangement
 * while keeping the authoritative overall wall length at 4340.
 */
const TOP_WALL_LENGTH = 4340;

const W1_START = 550;
const W1_WIDTH = 690;

const W2_START = 1840;
const W2_WIDTH = 640;

const W3_START = 3090;
const W3_WIDTH = 640;

/*
 * Left wall overall = 5450.
 *
 * W4 position is currently based on the hand survey and can be
 * refined independently without changing the room coordinate system.
 */
const LEFT_WALL_LENGTH = 5450;
const W4_START = 2670;
const W4_WIDTH = 600;

/*
 * Lower-left run:
 *
 * 1600 solid + 1560 door + 540 solid = 3700
 */
const LOWER_LEFT_LENGTH = 3700;
const LARGE_DOOR_START = 1600;
const LARGE_DOOR_WIDTH = 1560;

/*
 * Internal vertical return measured from sketch.
 */
const INNER_RETURN = 650;

/*
 * Lower-right run:
 *
 * overall = 2610
 * 1450 solid + opening + 330 solid = 2610
 *
 * Therefore opening = 830.
 */
const LOWER_RIGHT_LENGTH = 2610;
const SMALL_DOOR_START = 1450;
const SMALL_DOOR_WIDTH =
    LOWER_RIGHT_LENGTH - 1450 - 330;

/*
 * The sketch establishes the stepped/L-shaped room.
 *
 * The remaining long return coordinates are derived from the known
 * orthogonal runs rather than independently hand-entered.
 *
 * This gives us one internally consistent prototype shell which can
 * later be replaced/refined by parsed plan geometry.
 */
const INNER_X = LOWER_LEFT_LENGTH;
const INNER_Y = LEFT_WALL_LENGTH - INNER_RETURN;

const RIGHT_X = INNER_X + LOWER_RIGHT_LENGTH;

export const BED_1_MODEL = {
    id: "bed-1",
    name: "BED 1",

    source: {
        type: "manual-survey",
        accuracy: "approximate",
        units: "mm",
    },

    levels: {
        slab: 0,
        wallTop: WALL_HEIGHT,
    },

    defaults: {
        windowSill: WINDOW_SILL,
        windowHead: WINDOW_HEAD,
        doorHead: DOOR_HEAD,
    },

    /*
     * Closed room perimeter.
     *
     * A  top/window wall
     * B  right side of upper room
     * C  inner horizontal return
     * D  right side of lower projection
     * E  lower-right wall + small door
     * F  650 return
     * G  lower-left wall + large door
     * H  left wall + W4
     */
    walls: [
        {
            id: "wall-a",
            name: "WINDOW WALL",
            start: { x: 0, y: 0, z: 0 },
            end: { x: TOP_WALL_LENGTH, y: 0, z: 0 },
            height: WALL_HEIGHT,

            openings: [
                {
                    id: "W1",
                    name: "WINDOW 1",
                    type: "window",
                    wallId: "wall-a",
                    startMm: W1_START,
                    widthMm: W1_WIDTH,
                    sillMm: WINDOW_SILL,
                    headMm: WINDOW_HEAD,
                },
                {
                    id: "W2",
                    name: "WINDOW 2",
                    type: "window",
                    wallId: "wall-a",
                    startMm: W2_START,
                    widthMm: W2_WIDTH,
                    sillMm: WINDOW_SILL,
                    headMm: WINDOW_HEAD,
                },
                {
                    id: "W3",
                    name: "WINDOW 3",
                    type: "window",
                    wallId: "wall-a",
                    startMm: W3_START,
                    widthMm: W3_WIDTH,
                    sillMm: WINDOW_SILL,
                    headMm: WINDOW_HEAD,
                },
            ],
        },

        {
            id: "wall-b",
            name: "UPPER RIGHT WALL",
            start: { x: TOP_WALL_LENGTH, y: 0, z: 0 },
            end: {
                x: TOP_WALL_LENGTH,
                y: INNER_Y,
                z: 0,
            },
            height: WALL_HEIGHT,
            openings: [],
        },

        {
            id: "wall-c",
            name: "INNER RETURN WALL",
            start: {
                x: TOP_WALL_LENGTH,
                y: INNER_Y,
                z: 0,
            },
            end: {
                x: RIGHT_X,
                y: INNER_Y,
                z: 0,
            },
            height: WALL_HEIGHT,
            openings: [],
        },

        {
            id: "wall-d",
            name: "LOWER RIGHT SIDE",
            start: {
                x: RIGHT_X,
                y: INNER_Y,
                z: 0,
            },
            end: {
                x: RIGHT_X,
                y: LEFT_WALL_LENGTH,
                z: 0,
            },
            height: WALL_HEIGHT,
            openings: [],
        },

        {
            id: "wall-e",
            name: "LOWER RIGHT DOOR WALL",
            start: {
                x: RIGHT_X,
                y: LEFT_WALL_LENGTH,
                z: 0,
            },
            end: {
                x: INNER_X,
                y: LEFT_WALL_LENGTH,
                z: 0,
            },
            height: WALL_HEIGHT,

            openings: [
                {
                    id: "D2",
                    name: "DOOR 2",
                    type: "door",
                    wallId: "wall-e",
                    startMm: 330,
                    widthMm: SMALL_DOOR_WIDTH,
                    sillMm: 0,
                    headMm: DOOR_HEAD,
                },
            ],
        },

        {
            id: "wall-f",
            name: "INNER 650 RETURN",
            start: {
                x: INNER_X,
                y: LEFT_WALL_LENGTH,
                z: 0,
            },
            end: {
                x: INNER_X,
                y: INNER_Y,
                z: 0,
            },
            height: WALL_HEIGHT,
            openings: [],
        },

        {
            id: "wall-g",
            name: "LOWER LEFT DOOR WALL",
            start: {
                x: INNER_X,
                y: LEFT_WALL_LENGTH,
                z: 0,
            },
            end: {
                x: 0,
                y: LEFT_WALL_LENGTH,
                z: 0,
            },
            height: WALL_HEIGHT,

            openings: [
                {
                    id: "D1",
                    name: "DOOR 1",
                    type: "door",
                    wallId: "wall-g",

                    /*
                     * wall-g runs right -> left.
                     * 540 mm solid occurs first from the inner return,
                     * then the 1560 opening, leaving 1600 to the
                     * left-hand corner.
                     */
                    startMm: 540,
                    widthMm: LARGE_DOOR_WIDTH,
                    sillMm: 0,
                    headMm: DOOR_HEAD,
                },
            ],
        },

        {
            id: "wall-h",
            name: "LEFT WALL",
            start: {
                x: 0,
                y: LEFT_WALL_LENGTH,
                z: 0,
            },
            end: { x: 0, y: 0, z: 0 },
            height: WALL_HEIGHT,

            openings: [
                {
                    id: "W4",
                    name: "WINDOW 4",
                    type: "window",
                    wallId: "wall-h",

                    /*
                     * wall-h runs bottom -> top, so convert the
                     * top-origin hand measurement to wall direction.
                     */
                    startMm:
                        LEFT_WALL_LENGTH -
                        W4_START -
                        W4_WIDTH,
                    widthMm: W4_WIDTH,
                    sillMm: WINDOW_SILL,
                    headMm: WINDOW_HEAD,
                },
            ],
        },
    ],
};

function pointAlongWall(
    wall,
    distanceMm,
    heightMm,
) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const length = Math.hypot(dx, dy);

    if (!length) {
        throw new Error(
            `Wall ${wall.id} has zero length.`,
        );
    }

    return {
        x: wall.start.x + (dx / length) * distanceMm,
        y: wall.start.y + (dy / length) * distanceMm,
        z: heightMm,
    };
}

export function getOpeningAnchorPoints(model) {
    const anchors = [];

    for (const wall of model.walls) {
        for (const opening of wall.openings ?? []) {
            const left = opening.startMm;
            const right =
                opening.startMm + opening.widthMm;

            const bottom =
                opening.type === "door"
                    ? 0
                    : opening.sillMm;

            const top = opening.headMm;

            const points = [
                ["bottom-left", left, bottom],
                ["bottom-right", right, bottom],
                ["top-left", left, top],
                ["top-right", right, top],
            ];

            for (const [corner, distance, height] of points) {
                anchors.push({
                    id: `${opening.id}-${corner}`,
                    openingId: opening.id,
                    wallId: wall.id,
                    corner,
                    label:
                        `${opening.id} · ${corner}`,
                    position: pointAlongWall(
                        wall,
                        distance,
                        height,
                    ),
                });
            }
        }
    }

    return anchors;
}
