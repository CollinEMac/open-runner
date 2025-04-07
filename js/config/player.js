// js/config/player.js

// Player configuration
export const playerConfig = {
    // Movement
    SPEED: 15.0, // Initial units per second
    SPEED_INCREASE_RATE: 0.25, // Units per second, per second
    HEIGHT_OFFSET: 3.5, // Approx distance from player origin to feet
    RAYCAST_ORIGIN_OFFSET: 5, // How far above player to start ground raycast
    RAYCAST_STRIDE_OFFSET: 1.0, // How far forward/back to cast ground rays

    // Model dimensions
    HEAD_SIZE: 1.5,
    TORSO_HEIGHT: 3,
    TORSO_WIDTH: 2,
    TORSO_DEPTH: 1,
    LIMB_WIDTH: 0.75,
    ARM_LENGTH: 2.5,
    LEG_LENGTH: 3,

    // Animation
    ANIMATION_BASE_SPEED: 3.0,
    MAX_ANIMATION_SPEED_FACTOR: 2.0,
    ARM_SWING_AMPLITUDE: Math.PI / 3,
    LEG_SWING_AMPLITUDE: Math.PI / 4,
    ELBOW_BEND_AMPLITUDE: Math.PI / 2.5,
    KNEE_BEND_AMPLITUDE: Math.PI / 2,

    // Visuals / Model Construction
    DEFAULT_COLOR: 0x808080,
    DEFAULT_ROUGHNESS: 0.7,
    DEFAULT_METALNESS: 0.1,
    JOINT_SEGMENTS_W: 8,
    JOINT_SEGMENTS_H: 6,
    LIMB_OFFSET_FACTOR: 0.5, // Multiplier for jointRadius offset

    // Initial Position
    INITIAL_POS_X: 0,
    INITIAL_POS_Y: 10,
    INITIAL_POS_Z: 5,
};

// Derived player values
playerConfig.UPPER_ARM_LENGTH = playerConfig.ARM_LENGTH * 0.5;
playerConfig.FOREARM_LENGTH = playerConfig.ARM_LENGTH * 0.5;
playerConfig.THIGH_LENGTH = playerConfig.LEG_LENGTH * 0.5;
playerConfig.CALF_LENGTH = playerConfig.LEG_LENGTH * 0.5;
playerConfig.JOINT_RADIUS = playerConfig.LIMB_WIDTH / 1.5;