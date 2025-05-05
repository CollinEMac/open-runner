import { Game } from './game.js';
import * as UIManager from '../managers/uiManager.js';
import { isMobileDevice, updateMobileControlsVisibility } from '../utils/deviceUtils.js';
import { createLogger } from '../utils/logger.js';
import { setupTreeValidator } from '../utils/treeValidator.js';

const logger = createLogger('Main');

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    logger.info("DOM fully loaded and parsed");

    try {
        const mobileControls = document.getElementById('mobileControls');
        if (mobileControls) {
            updateMobileControlsVisibility();
            logger.debug('Mobile controls visibility initialized');
        } else {
            logger.warn('Mobile controls element not found in the DOM');
        }
    } catch (error) {
        logger.error('Error setting up mobile controls:', error);
    }

    try {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            const errorMsg = "FATAL: Canvas element #gameCanvas not found!";
            logger.error(errorMsg);
            try {
                UIManager.displayError(new Error(errorMsg));
            } catch (uiError) {
                logger.error("Could not display error via UIManager:", uiError);
                alert(errorMsg);
            }
            return;
        }

        logger.info("Creating game instance");
        const game = new Game(canvas);
        
        // Expose game instance globally for debugging
        window.game = game;
        
        // Setup tree validator for debugging
        try {
            setupTreeValidator();
            logger.info("Tree validator set up, validateTrees() available in console");
        } catch (error) {
            logger.error("Error setting up tree validator:", error);
        }

        logger.info("Initializing game...");
        const initialized = await game.init();

        if (initialized) {
            logger.info("Game initialized successfully, starting game loop");
            game.start();
        } else {
            logger.error("Game initialization failed. See previous errors.");
            try {
                UIManager.displayError(new Error("Game initialization failed. Please check console for details."));
            } catch (uiError) {
                logger.error("Could not display error via UIManager:", uiError);
                alert("Game initialization failed. Please check console for details.");
            }
        }
    } catch (error) {
        logger.error("Error during game initialization or start:", error);
        try {
            UIManager.displayError(error);
        } catch (uiError) {
            logger.error("Could not display error via UIManager:", uiError);
            alert(`An error occurred: ${error.message}`);
        }
    }
});