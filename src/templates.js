/**
 * Default Templates
 */

export default [
    {
        "category": "Room", "tid": "Room", "tname": "房间",
        "showLabel": true, "color": "#DCE4F1", "size": [4, 4, 3],
        "isTemplate": true, "position": [0, 0, 0]
    },
    {
        "category": "Path", "tid": "Path", "tname": "过道",
        "showLabel": true, "color": "#f0f0f0", "size": [2, 2, 1],
        "isTemplate": true, "position": [0, 0, 0]
    },
    {
        "category": "Seat",
        "tid": "Seat",
        "tname": "工位",
        "showLabel": false,
        "model2d": "",
        "rotate2d": [
            0,
            0,
            0
        ],
        "model3d": "model/Desk.glb",
        "rotate3d": [
            90,
            180,
            0
        ],
        "color": "#fafafa",
        "size": [
            1.4,
            1,
            1.5
        ], "position": [0, 0, 0.65],
        "isTemplate": true
    }
]