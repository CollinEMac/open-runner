// js/main.js
import { Game } from './game.js';
import * as UIManager from './uiManager.js'; // Keep for potential initial error display
import { isMobileDevice } from './utils/deviceUtils.js';

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed");

    // Directly hide mobile controls on desktop
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls && !isMobileDevice()) {
        mobileControls.style.display = 'none';
        mobileControls.style.opacity = '0';
        console.log("Mobile controls forcibly hidden on desktop");
    }

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        // Use UIManager to display error if possible, otherwise console
        const errorMsg = "FATAL: Canvas element #gameCanvas not found!";
        console.error(errorMsg);
        // Attempt to display error in the UI if UIManager is minimally functional
        try {
            // Attempt to initialize minimal UI parts needed for error display
            // This assumes displayError doesn't depend on full UIManager init
            UIManager.displayError(new Error(errorMsg));
        } catch (uiError) {
            console.error("Could not display error via UIManager:", uiError);
            // Fallback: alert or append to body
            alert(errorMsg);
        }
        return; // Stop execution
    }

    console.log("Canvas element found. Initializing Game...");
    const game = new Game(canvas);

    try {
        const initialized = await game.init();
        if (initialized) {
            console.log("Game initialized successfully. Starting game...");
            game.start(); // Start the game loop
        } else {
            console.error("Game initialization failed. See previous errors.");
            // Error should have been displayed by Game.init() or UIManager/LevelManager
        }
    } catch (error) {
        console.error("Error during game initialization or start:", error);
        // Attempt to display error in the UI
         try {
            // UIManager might not be fully initialized if error happened early in game.init
            UIManager.displayError(error);
         } catch (uiError) {
             console.error("Could not display error via UIManager:", uiError);
             alert(`An error occurred: ${error.message}`);
         }
    }
});
