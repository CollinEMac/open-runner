// js/input/controlsSetup.js
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Removed OrbitControls
import { GameStates, getCurrentState, setGameState } from '../core/gameStateManager.js'; // Updated path
import * as UIManager from '../managers/uiManager.js'; // Updated path
import eventBus from '../core/eventBus.js'; // Updated path
import { createLogger } from '../utils/logger.js'; // Import logger

const logger = createLogger('ControlsSetup'); // Instantiate logger

// --- State Variables ---
// Variables to track keyboard steering keys
export let keyLeftPressed = false;
export let keyRightPressed = false;

// Variables to track mouse steering buttons
export let mouseLeftPressed = false;
export let mouseRightPressed = false;

// Variables to track touch steering buttons
export let touchLeftPressed = false;
export let touchRightPressed = false;

// --- Reset Functions ---
/**
 * Resets all input state variables to their default (unpressed) state.
 * This is important when transitioning between game states to prevent
 * inputs from persisting across state changes (e.g., when pausing/resuming).
 */
export function resetInputStates() {
    keyLeftPressed = false;
    keyRightPressed = false;
    mouseLeftPressed = false;
    mouseRightPressed = false;
    touchLeftPressed = false;
    touchRightPressed = false;
}

// Store event listener references
let keydownListener = null;
let keyupListener = null;
let mousedownListener = null;
let mouseupListener = null;
let contextmenuListener = null;

// Mobile touch event listeners
let mobileLeftTouchStartListener = null;
let mobileLeftTouchEndListener = null;
let mobileRightTouchStartListener = null;
let mobileRightTouchEndListener = null;
let mobilePauseTouchListener = null;

export function setupPlayerControls(canvasElement) {
    // Clean up any existing event listeners to prevent duplicates
    if (keydownListener) {
        document.removeEventListener('keydown', keydownListener);
    }
    if (keyupListener) {
        document.removeEventListener('keyup', keyupListener);
    }
    if (mousedownListener && canvasElement) {
        canvasElement.removeEventListener('mousedown', mousedownListener);
    }
    if (mouseupListener && canvasElement) {
        canvasElement.removeEventListener('mouseup', mouseupListener);
    }
    if (contextmenuListener && canvasElement) {
        canvasElement.removeEventListener('contextmenu', contextmenuListener);
    }

    // Clean up mobile touch event listeners
    try {
        const mobileLeftBtn = document.getElementById('mobileLeftBtn');
        const mobileRightBtn = document.getElementById('mobileRightBtn');
        const mobilePauseBtn = document.getElementById('mobilePauseBtn');

        if (mobileLeftTouchStartListener && mobileLeftBtn) {
            mobileLeftBtn.removeEventListener('touchstart', mobileLeftTouchStartListener);
            mobileLeftBtn.removeEventListener('touchend', mobileLeftTouchEndListener);
        }
        if (mobileRightTouchStartListener && mobileRightBtn) {
            mobileRightBtn.removeEventListener('touchstart', mobileRightTouchStartListener);
            mobileRightBtn.removeEventListener('touchend', mobileRightTouchEndListener);
        }
        if (mobilePauseTouchListener && mobilePauseBtn) {
            mobilePauseBtn.removeEventListener('touchstart', mobilePauseTouchListener);
        }
    } catch (error) {
        logger.error("[Controls] Error cleaning up mobile controls:", error);
        // Continue with the game even if mobile controls cleanup fails
    }

    // --- Keyboard Listeners for Steering ---
    keydownListener = (event) => {
        switch (event.key.toLowerCase()) {
            case 'a':
            case 'arrowleft':
                keyLeftPressed = true;
                break;
            case 'd':
            case 'arrowright':
                keyRightPressed = true;
                break;
        }
    };

    document.addEventListener('keydown', keydownListener);

    keyupListener = (event) => {
        switch (event.key.toLowerCase()) {
            case 'a':
            case 'arrowleft':
                keyLeftPressed = false;
                break;
            case 'd':
            case 'arrowright':
                keyRightPressed = false;
                break;
        }
    };

    document.addEventListener('keyup', keyupListener);

    // --- Mouse Listeners for Steering ---
    mousedownListener = (event) => {
        switch (event.button) {
            case 0: // Left Mouse Button
                mouseLeftPressed = true;
                break;
            case 2: // Right Mouse Button
                mouseRightPressed = true;
                event.preventDefault(); // Prevent context menu
                break;
        }
    };

    canvasElement.addEventListener('mousedown', mousedownListener);

    mouseupListener = (event) => {
        switch (event.button) {
            case 0: // Left Mouse Button
                mouseLeftPressed = false;
                break;
            case 2: // Right Mouse Button
                mouseRightPressed = false;
                break;
        }
    };

    canvasElement.addEventListener('mouseup', mouseupListener);

    // Prevent context menu on the canvas (important for RMB steering)
    contextmenuListener = (event) => {
        event.preventDefault();
    };

    canvasElement.addEventListener('contextmenu', contextmenuListener);

    // --- Mobile Touch Controls ---
    try {
        const mobileLeftBtn = document.getElementById('mobileLeftBtn');
        const mobileRightBtn = document.getElementById('mobileRightBtn');
        const mobilePauseBtn = document.getElementById('mobilePauseBtn');

        if (mobileLeftBtn && mobileRightBtn && mobilePauseBtn) {

            // Left button touch events
            mobileLeftTouchStartListener = (event) => {
                event.preventDefault(); // Prevent default touch behavior
                touchLeftPressed = true;
            };

            mobileLeftTouchEndListener = (event) => {
                event.preventDefault();
                touchLeftPressed = false;
            };

            // Right button touch events
            mobileRightTouchStartListener = (event) => {
                event.preventDefault();
                touchRightPressed = true;
            };

            mobileRightTouchEndListener = (event) => {
                event.preventDefault();
                touchRightPressed = false;
            };

            // Pause button touch event
            mobilePauseTouchListener = (event) => {
                event.preventDefault();
                const currentState = getCurrentState();

                if (currentState === GameStates.PLAYING) {
                    eventBus.emit('requestPause');
                } else if (currentState === GameStates.PAUSED) {
                    eventBus.emit('requestResume');
                }
            };

            // Add touch event listeners
            mobileLeftBtn.addEventListener('touchstart', mobileLeftTouchStartListener, { passive: false });
            mobileLeftBtn.addEventListener('touchend', mobileLeftTouchEndListener, { passive: false });
            mobileRightBtn.addEventListener('touchstart', mobileRightTouchStartListener, { passive: false });
            mobileRightBtn.addEventListener('touchend', mobileRightTouchEndListener, { passive: false });
            mobilePauseBtn.addEventListener('touchstart', mobilePauseTouchListener, { passive: false });
        } else {
            logger.warn("[Controls] Mobile control buttons not found in the DOM");
        }
    } catch (error) {
        logger.error("[Controls] Error setting up mobile controls:", error);
        // Continue with the game even if mobile controls fail to set up
    }

}

// Removed setupOrbitControls function

/**
 * Initialize event listeners for game state changes to handle input resets.
 * This should be called once during game initialization.
 */
export function initInputStateManager() {
    // Subscribe to game state changes to reset inputs when pausing/resuming or restarting from game over
    eventBus.subscribe('gameStateChanged', (newState, previousState) => {
        // Reset input states when:
        // 1. Entering or exiting the PAUSED state
        // 2. Transitioning from GAME_OVER to PLAYING (restart)
        // 3. Starting a new game (any state to PLAYING)
        if (newState === GameStates.PAUSED ||
            (previousState === GameStates.PAUSED && newState === GameStates.PLAYING) ||
            (previousState === GameStates.GAME_OVER && newState === GameStates.PLAYING) ||
            (newState === GameStates.PLAYING)) {
            resetInputStates();
        }
    });

}