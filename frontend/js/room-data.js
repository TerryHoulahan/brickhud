export const BED_1 = {
    id: "bed-1",
    name: "BED 1",

    walls: {
        windowWall: {
            id: "window-wall",
            name: "WINDOW WALL",
            lengthMm: 4340,

            /*
             * Prototype geometry from the hand-measured BED 1 sketch.
             *
             * Positions are deliberately approximate.
             * W1 is our camera reference opening.
             */
            openings: [
                {
                    id: "W1",
                    type: "window",
                    xMm: 700,
                    widthMm: 600,
                },
                {
                    id: "W2",
                    type: "window",
                    xMm: 1800,
                    widthMm: 600,
                },
                {
                    id: "W3",
                    type: "window",
                    xMm: 2900,
                    widthMm: 600,
                },
            ],
        },
    },
};

export function getOpening(room, openingId) {
    for (const wall of Object.values(room.walls)) {
        const opening = wall.openings.find(
            (candidate) => candidate.id === openingId,
        );

        if (opening) {
            return {
                room,
                wall,
                opening,
            };
        }
    }

    return null;
}
