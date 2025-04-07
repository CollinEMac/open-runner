// js/config/tumbleweed.js

// Tumbleweed configuration
export const tumbleweedConfig = {
    // Behavior
    ROLL_SPEED_MIN: 4.0,
    ROLL_SPEED_MAX: 9.0,
    ROTATION_SPEED_MIN: -2.0, // Halved from original calculation (-0.5 * 4.0)
    ROTATION_SPEED_MAX: 2.0,  // Halved from original calculation (0.5 * 4.0)
    ACTIVATION_DISTANCE: 100,
    DEACTIVATION_DISTANCE: 150,
    TARGET_AHEAD_MIN: 50, // For activation target point
    TARGET_AHEAD_MAX: 80, // For activation target point
    TARGET_RANDOMNESS: 0.3, // For activation direction
    INITIAL_SPEED_FACTOR_MIN: 1.0, // For activation speed
    INITIAL_SPEED_FACTOR_MAX: 1.6, // For activation speed
    UPDATE_TARGET_AHEAD_MIN: 40, // For movement update target point
    UPDATE_TARGET_AHEAD_MAX: 60, // For movement update target point
    UPDATE_DIRECTION_RANDOMNESS: 0.2, // For movement update direction
    STEERING_LERP_FACTOR: 0.08,
    STEERING_FORCE_FACTOR: 0.5,
    MAX_SPEED_FACTOR: 1.0, // Multiplier for rollSpeed to get max speed limit
    WOBBLE_FACTOR: 0.1,
    MIN_VELOCITY_SQ_THRESHOLD: 0.1, // Min velocity squared to apply steering/rotation
    TERRAIN_ADJUST_THRESHOLD: 1.0, // How far above terrain to float - increased to prevent sinking
    GROUND_BOUNCE_FACTOR: 0.7, // Increased to make tumbleweeds bounce more when they hit the ground

    // Physics - adjusted to prevent sinking
    MASS: 0.3, // Reduced mass to make it less likely to sink
    FRICTION: 0.2,
    RESTITUTION: 0.5, // Increased to make it bounce more
    USE_GRAVITY: true,
    GRAVITY_FORCE: 5.0, // Reduced gravity to make it less likely to sink

    // Visuals
    SCALE_MIN: 0.8, // Example: Add min/max scale if needed later
    SCALE_MAX: 1.2, // Example: Add min/max scale if needed later
    MAIN_GEOMETRY_RADIUS: 1.0,
    MAIN_GEOMETRY_DETAIL: 1,
    MAIN_MATERIAL_COLOR: 0xAD8B60,
    MAIN_MATERIAL_ROUGHNESS: 0.9,
    MAIN_MATERIAL_METALNESS: 0.1,
    MAIN_MATERIAL_WIREFRAME: true,
    INNER_GEOMETRY_RADIUS: 0.8,
    INNER_GEOMETRY_DETAIL: 1,
    INNER_MATERIAL_COLOR: 0x8B6B40,
    INNER_MATERIAL_ROUGHNESS: 0.7,
    INNER_MATERIAL_METALNESS: 0.1,

    // Identification
    OBJECT_TYPE_NAME: 'tumbleweed'
};