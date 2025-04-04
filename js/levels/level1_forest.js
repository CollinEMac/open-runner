// js/levels/level1_forest.js

export const level1Config = {
    // --- Terrain ---
    TERRAIN_COLOR: 0x55aa55, // Greenish color (from terrainGenerator.js)
    NOISE_FREQUENCY: 0.01, // How close together the hills are (lower = wider hills)
    NOISE_AMPLITUDE: 8,   // How high the hills are (larger = higher peaks/deeper valleys)

    // --- Scene ---
    SCENE_BACKGROUND_COLOR: 0x87CEEB,
    SCENE_FOG_COLOR: 0x87CEEB,
    SCENE_FOG_NEAR: 35,
    SCENE_FOG_FAR: 1000,

    // --- Lighting ---
    AMBIENT_LIGHT_COLOR: 0xffffff,
    AMBIENT_LIGHT_INTENSITY: 0.6,
    DIRECTIONAL_LIGHT_COLOR: 0xffffff,
    DIRECTIONAL_LIGHT_INTENSITY: 0.8,
    DIRECTIONAL_LIGHT_POS_X: 100,
    DIRECTIONAL_LIGHT_POS_Y: 100,
    DIRECTIONAL_LIGHT_POS_Z: 50,

    // --- Enemies ---
    ENEMY_DEFAULT_SPEED: 5.0,
    ENEMY_DEFAULT_AGGRO_RADIUS: 30.0,
    ENEMY_DEFAULT_DEAGGRO_RADIUS: 30.0,
    ENEMY_SPAWN_DENSITY: 0.0001875, // Overall density for any enemy type

    // --- Enemy Roaming ---
    ENEMY_ROAMING_RADIUS: 15.0,
    ENEMY_ROAMING_SPEED_FACTOR: 0.5,
    ENEMY_ROAMING_MIN_WAIT_TIME: 2.0,
    ENEMY_ROAMING_MAX_WAIT_TIME: 5.0,

    // --- Specific Enemy Properties ---
    ENEMY_TYPES: ['bear', 'squirrel', 'deer'], // List of enemy types for this level
    ENEMY_PROPERTIES: {
        'bear': {
            speed: 8.0,
            aggroRadius: 40.0,
            deaggroRadius: 40.0,
            color: 0x8B4513, // Brown
            minDistance: 25.0,
            verticalOffset: 0.1,
            maxPlacementAttempts: 15
        },
        'squirrel': {
            speed: 12.0,
            aggroRadius: 20.0,
            deaggroRadius: 25.0,
            color: 0xA0522D, // Sienna/Reddish-brown
            minDistance: 8.0,
            verticalOffset: 0.1,
            maxPlacementAttempts: 10
        },
        'deer': {
            speed: 10.0,
            aggroRadius: 36.0,
            deaggroRadius: 35.0,
            color: 0xD2B48C, // Tan
            minDistance: 15.0,
            verticalOffset: 0.1,
            maxPlacementAttempts: 12
        }
    },

    // --- Object Generation ---
    OBJECT_TYPES: [
        // --- Coins ---
        {
            type: 'coin',
            density: 0.000465,
            minDistance: 3.0,
            verticalOffset: 1.5,
            scaleRange: [1, 1],
            randomRotationY: true,
            collidable: false,
            scoreValue: 10,
            maxPlacementAttempts: 10,
        },
        // --- powerups ---
        {
            type: 'magnet',
            density: 0.0001,
            minDistance: 50.0,
            verticalOffset: 1.5,
            scaleRange: [1.2, 1.5],
            randomRotationY: true,
            collidable: false,
            scoreValue: 0,
            maxPlacementAttempts: 10,
        },
        // --- Obstacles ---
        {
            type: 'rock_small',
            density: 0.000285,
            minDistance: 2.0,
            verticalOffset: 0.5,
            scaleRange: [0.8, 2.4],
            randomRotationY: true,
            collidable: true,
            scoreValue: 0,
            maxPlacementAttempts: 8,
        },
        {
            type: 'rock_large',
            density: 0.0000945,
            minDistance: 5.0,
            verticalOffset: 1.0,
            scaleRange: [1.5, 4.5],
            randomRotationY: true,
            collidable: true,
            scoreValue: 0,
            maxPlacementAttempts: 10,
        },
        {
            type: 'tree_pine',
            density: 0.000375,
            minDistance: 4.0,
            verticalOffset: 0,
            scaleRange: [1.5, 3.0],
            randomRotationY: true,
            collidable: true,
            scoreValue: 0,
            maxPlacementAttempts: 10,
        },
        {
            type: 'log_fallen',
            density: 0.000189,
            minDistance: 5.0,
            verticalOffset: 0.2,
            scaleRange: [0.8, 3.5],
            randomRotationY: true,
            collidable: true,
            scoreValue: 0,
            maxPlacementAttempts: 12,
        },
        {
            type: 'cabin_simple',
            density: 0.00000945,
            minDistance: 15.0,
            verticalOffset: 0,
            scaleRange: [1, 1],
            randomRotationY: false,
            collidable: true,
            scoreValue: 0,
            maxPlacementAttempts: 15,
        },
    ],

    // --- Coins (Legacy Visuals - Keep if needed, but prefer data in OBJECT_TYPES) ---
    COIN_VISUALS: {
        radius: 0.75,
        height: 0.2,
        color: 0xFFFF00, // Yellow
        spinSpeed: 1.0, // Radians per second
    }
};
