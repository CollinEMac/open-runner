// js/controlsSetup.js
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Removed OrbitControls
import { GameStates, getCurrentState, setGameState } from './gameStateManager.js';
import * as UIManager from './uiManager.js';
import eventBus from './eventBus.js';

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
    console.log("[Controls] Resetting all input states");
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
        console.error("[Controls] Error cleaning up mobile controls:", error);
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
            console.log("[Controls] Setting up mobile touch controls");

            // Left button touch events
            mobileLeftTouchStartListener = (event) => {
                event.preventDefault(); // Prevent default touch behavior
                touchLeftPressed = true;
                console.log("[Controls] Mobile left button pressed");
            };

            mobileLeftTouchEndListener = (event) => {
                event.preventDefault();
                touchLeftPressed = false;
                console.log("[Controls] Mobile left button released");
            };

            // Right button touch events
            mobileRightTouchStartListener = (event) => {
                event.preventDefault();
                touchRightPressed = true;
                console.log("[Controls] Mobile right button pressed");
            };

            mobileRightTouchEndListener = (event) => {
                event.preventDefault();
                touchRightPressed = false;
                console.log("[Controls] Mobile right button released");
            };

            // Pause button touch event
            mobilePauseTouchListener = (event) => {
                event.preventDefault();
                console.log("[Controls] Mobile pause button pressed");
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
            console.warn("[Controls] Mobile control buttons not found in the DOM");
        }
    } catch (error) {
        console.error("[Controls] Error setting up mobile controls:", error);
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
            console.log(`[Controls] Reset input states during transition from ${previousState} to ${newState}`);
        }
    });

    console.log("[Controls] Input state manager initialized");
}
