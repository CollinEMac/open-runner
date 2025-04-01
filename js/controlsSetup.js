// js/controlsSetup.js
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Removed OrbitControls

console.log('controlsSetup.js loading');

// --- State Variables ---
// Variables to track keyboard steering keys
export let keyLeftPressed = false;
export let keyRightPressed = false;

// --- Reset Functions ---
// Note: Key states are reset by keyup events, no explicit reset function needed here

export function setupPlayerControls(canvasElement) {
    console.log('Setting up Player Controls (Keyboard Only)...');

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

    console.log('Player Controls setup complete.');
}

// Removed setupOrbitControls function

console.log('controlsSetup.js loaded');
