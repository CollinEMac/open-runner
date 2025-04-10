// js/core/main.js
import { Game } from './game.js'; // Updated path
import * as UIManager from '../managers/uiManager.js'; // Updated path
import { isMobileDevice, updateMobileControlsVisibility } from '../utils/deviceUtils.js'; // Updated path
import { createLogger } from '../utils/logger.js'; // Import logger

const logger = createLogger('Main'); // Instantiate logger

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    logger.info("DOM fully loaded and parsed");

    try {
        // Set appropriate visibility for mobile controls based on device type
        const mobileControls = document.getElementById('mobileControls');
        if (mobileControls) {
            // Use the utility function for consistent mobile controls handling
            updateMobileControlsVisibility();
            logger.debug('Mobile controls visibility initialized');
        } else {
            logger.warn('Mobile controls element not found in the DOM');
        }
    } catch (error) {
        logger.error('Error setting up mobile controls:', error);
    }

    try {
        // Get the canvas element
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            // Use UIManager to display error if possible, otherwise console
            const errorMsg = "FATAL: Canvas element #gameCanvas not found!";
            logger.error(errorMsg);
            // Attempt to display error in the UI if UIManager is minimally functional
            try {
                // Attempt to initialize minimal UI parts needed for error display
                // This assumes displayError doesn't depend on full UIManager init
                UIManager.displayError(new Error(errorMsg));
            } catch (uiError) {
                logger.error("Could not display error via UIManager:", uiError);
                // Fallback: alert or append to body
                alert(errorMsg);
            }
            return; // Stop execution
        }

        // Create the game instance
        logger.info("Creating game instance");
        const game = new Game(canvas);

        // Initialize and start the game
        logger.info("Initializing game...");
        const initialized = await game.init();

        if (initialized) {
            logger.info("Game initialized successfully, starting game loop");
            game.start(); // Start the game loop
        } else {
            logger.error("Game initialization failed. See previous errors.");
            // Error should have been displayed by Game.init() or UIManager/LevelManager
            try {
                UIManager.displayError(new Error("Game initialization failed. Please check console for details."));
            } catch (uiError) {
                logger.error("Could not display error via UIManager:", uiError);
                alert("Game initialization failed. Please check console for details.");
            }
        }
    } catch (error) {
        logger.error("Error during game initialization or start:", error);
        // Attempt to display error in the UI
        try {
            // UIManager might not be fully initialized if error happened early in game.init
            UIManager.displayError(error);
        } catch (uiError) {
            logger.error("Could not display error via UIManager:", uiError);
            alert(`An error occurred: ${error.message}`);
        }
    }
});