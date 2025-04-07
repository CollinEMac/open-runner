// js/config/enemyDefaults.js

// Default Enemy configuration (used if level config doesn't provide)
export const enemyDefaultsConfig = {
    SPEED: 5.0,
    AGGRO_RADIUS: 30.0,
    DEAGGRO_RADIUS: 40.0, // Slightly larger than aggro
    ROAMING_RADIUS: 15.0,
    ROAMING_SPEED_FACTOR: 0.5,
    ROAMING_MIN_WAIT_TIME: 2.0,
    ROAMING_MAX_WAIT_TIME: 5.0,
    POSITION_SMOOTHING_FACTOR: 0.3, // Lower = smoother
    ROTATION_SLERP_FACTOR: 0.1, // Higher = faster turning
    GROUND_CHECK_OFFSET: 2.0, // Raycast start height offset
    GROUND_SMOOTHING_FACTOR: 0.2, // Blend factor for new ground height (1.0 - this = old height factor)
    RETURN_DISTANCE_THRESHOLD: 1.0, // How close to origin to switch from RETURNING
    MOVE_THRESHOLD: 0.1, // Min distance to target to initiate move
    LOOK_THRESHOLD_SQ: 0.0001, // Min move direction squared length to update look rotation
    ANIMATION_SPEED_FACTOR: 0.8, // Multiplier for currentSpeed -> animationSpeed
    LEG_SWING_AMPLITUDE: Math.PI / 6,
    STOPPED_ANIMATION_SMOOTHING: 0.1, // Smoothing for leg rotation returning to 0
    // Specific overrides for grounding non-legged enemies
    GROUNDING_OFFSET_SNAKE: 0.5,
    GROUNDING_HEIGHT_SNAKE: 0.3,
    GROUNDING_OFFSET_SCORPION: 0.5,
    GROUNDING_HEIGHT_SCORPION: 0.3
};