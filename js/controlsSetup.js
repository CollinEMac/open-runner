// js/controlsSetup.js
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Removed OrbitControls
import { GameStates, getCurrentState, setGameState } from './gameStateManager.js';
import * as UIManager from './uiManager.js';

// --- State Variables ---
// Variables to track keyboard steering keys
export let keyLeftPressed = false;
export let keyRightPressed = false;

// Variables to track mouse steering buttons
export let mouseLeftPressed = false;
export let mouseRightPressed = false;

// --- Reset Functions ---
// Note: Key states are reset by keyup events, no explicit reset function needed here

// Store event listener references
let keydownListener = null;
let keyupListener = null;
let mousedownListener = null;
let mouseupListener = null;
let contextmenuListener = null;

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

}

// Removed setupOrbitControls function
