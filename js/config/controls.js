// js/config/controls.js

// Controls configuration
export const controlsConfig = {
    MOUSE_SENSITIVITY: 0.002,
    PLAYER_TILT_FACTOR: 0.25,
    PLAYER_TILT_SMOOTHING: 0.1,
    KEY_TURN_SPEED: Math.PI / 1.5,
    // Key bindings (lowercase for easier comparison)
    KEY_TOGGLE_FPS: 'f',
    KEY_PAUSE_RESUME_BACK: 'escape',
    KEY_RESTART_GAME_OVER: 'r',
    KEY_LEVEL_SELECT_TITLE: 'l',
    TURN_SOUND_THRESHOLD: 0.001 // Minimum rotation delta to trigger turn sound
};