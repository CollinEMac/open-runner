// js/config/renderingAdvanced.js

// Advanced Rendering / Shadow configuration
export const renderingAdvancedConfig = {
    SHADOW_MAP_SIZE_LOW: 512,
    SHADOW_MAP_SIZE_MEDIUM: 1024,
    SHADOW_MAP_SIZE_HIGH: 2048,
    SHADOW_CAMERA_NEAR: 0.5,
    SHADOW_CAMERA_FAR: 500,
    SHADOW_BIAS: -0.001,
    // Frustum size - needs tuning based on typical view distance and chunk size
    // Example: Cover roughly 3x3 chunks centered around origin initially
    SHADOW_FRUSTUM_SIZE: 150, // Half-width/height (e.g., CHUNK_SIZE * 1.5)
    INITIAL_CAMERA_POS_X: 0,
    INITIAL_CAMERA_POS_Y: 50,
    INITIAL_CAMERA_POS_Z: 100,
    FPS_COUNTER_PREFIX: 'FPS: ',
    FPS_COUNTER_SEPARATOR: ' | Quality: ',
    // FPS Counter styles could be added here, but might be better in CSS
    // Camera Transitions & Drift
    TRANSITION_DURATION_DEFAULT: 0.6,
    TRANSITION_DURATION_TITLE: 0.5,
    TRANSITION_DURATION_GAMEPLAY: 0.4,
    TITLE_LOOK_AT_X: 0, TITLE_LOOK_AT_Y: 0, TITLE_LOOK_AT_Z: 0,
    DRIFT_AMPLITUDE_X: 15, DRIFT_AMPLITUDE_Y: 7.5, DRIFT_AMPLITUDE_Z: 10,
    DRIFT_PERIOD_X: 45, DRIFT_PERIOD_Y: 30, DRIFT_PERIOD_Z: 60,
    DRIFT_LERP_FACTOR: 0.02
};