// js/controlsSetup.js
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Removed OrbitControls

// --- State Variables ---
// Variables to track keyboard steering keys
export let keyLeftPressed = false;
export let keyRightPressed = false;

// Variables to track mouse steering buttons
export let mouseLeftPressed = false;
export let mouseRightPressed = false;

// --- Reset Functions ---
// Note: Key states are reset by keyup events, no explicit reset function needed here

export function setupPlayerControls(canvasElement) {

    // --- Keyboard Listeners for Steering ---
    document.addEventListener('keydown', (event) => {
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
    });

    document.addEventListener('keyup', (event) => {
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
    });

    // --- Mouse Listeners for Steering ---
    canvasElement.addEventListener('mousedown', (event) => {
        switch (event.button) {
            case 0: // Left Mouse Button
                mouseLeftPressed = true;
                break;
            case 2: // Right Mouse Button
                mouseRightPressed = true;
                event.preventDefault(); // Prevent context menu
                break;
        }
    });

    canvasElement.addEventListener('mouseup', (event) => {
        switch (event.button) {
            case 0: // Left Mouse Button
                mouseLeftPressed = false;
                break;
            case 2: // Right Mouse Button
                mouseRightPressed = false;
                break;
        }
    });

    // Prevent context menu on the canvas (important for RMB steering)
    canvasElement.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

}

// Removed setupOrbitControls function
