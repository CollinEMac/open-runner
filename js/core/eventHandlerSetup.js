// js/core/eventHandlerSetup.js
import * as THREE from 'three';
import eventBus from './eventBus.js';
import gameStateManager, { GameStates } from './gameStateManager.js'; // Import default instance
import { createLogger } from '../utils/logger.js';
import { getConfig } from '../config/config.js';
import { gameplayConfig } from '../config/gameplay.js';
import { grayMaterial } from '../entities/playerCharacter.js';
// Import necessary managers/modules that will handle the logic
import * as ScoreManager from '../managers/scoreManager.js';
import * as LevelManager from '../managers/levelManager.js';
// import * as UIManager from '../managers/uiManager.js'; // Removed unused import

const logger = createLogger('EventHandlerSetup');

// Timer reference for powerup timeout
let powerupTimeout = null;

/**
 * Sets up subscriptions to global events via the event bus.
 * Delegates actions to appropriate managers or emits further events.
 * @param {object} dependencies - Object containing necessary dependencies.
 * @param {object} dependencies.player - The player state object.
 * @param {object} dependencies.levelManager - LevelManager instance/module.
 * @param {object} dependencies.scoreManager - ScoreManager instance/module.
 * @param {object} dependencies.cameraManager - CameraManager instance.
 * @param {object} dependencies.sceneTransitionManager - SceneTransitionManager instance.
 * @param {object} dependencies.atmosphericManager - AtmosphericManager instance.
 * @param {function} dependencies.startGameCallback - Function to start a specific level (bound to Game instance).
 * @param {function} dependencies.loadLevelCallback - Function to load a specific level (bound to Game instance).
 * @param {function} dependencies.resetInputStates - Function to reset input states.
 * @param {function} dependencies.updateMobileControlsVisibility - Function to update mobile controls.
 */
export function setupEventHandlers(dependencies) {
    const {
        player,
        levelManager,
        scoreManager,
        uiManager, // Re-added for score display updates
        cameraManager,
        sceneTransitionManager,
        atmosphericManager,
        startGameCallback,
        loadLevelCallback,
        resetInputStates,
        updateMobileControlsVisibility
    } = dependencies;

    // Simplified dependency check
    if (!player || !levelManager || !scoreManager || !cameraManager || !sceneTransitionManager || !atmosphericManager || !startGameCallback || !loadLevelCallback || !resetInputStates || !updateMobileControlsVisibility) {
        logger.error("Cannot setup event handlers: Missing one or more required dependencies.");
        return;
    }

    // uiManager is optional for score display updates
    if (!uiManager) {
        logger.warn("UIManager not provided to event handlers. Some UI updates may not work properly.");
    }

    // --- Event Subscriptions ---

    eventBus.subscribe('scoreChanged', (scoreIncrement) => {
        // Store the old score before updating
        const oldScore = ScoreManager.getCurrentScore();

        // Update the score
        ScoreManager.updateCurrentScore(scoreIncrement);

        // Get current values after update
        const currentLevelId = levelManager.getCurrentLevelId();
        const currentScore = ScoreManager.getCurrentScore();
        const transitionScore = getConfig('LEVEL1_TRANSITION_SCORE', 300);
        const currentState = gameStateManager.getCurrentState();

        // Only proceed with level transition logic if we're in level1 and in PLAYING state
        if (currentLevelId === 'level1' && currentState === GameStates.PLAYING) {
            // Check if we've just crossed the threshold or score is already above threshold
            if (currentScore >= transitionScore) {
                logger.info(`Score threshold reached (${currentScore}/${transitionScore}), transitioning to level2`);

                // Small delay to ensure all score updates are processed
                setTimeout(() => {
                    // Double-check we're still in PLAYING state
                    if (gameStateManager.getCurrentState() === GameStates.PLAYING) {
                        // Set game state to LEVEL_TRANSITION first
                        gameStateManager.setGameState(GameStates.LEVEL_TRANSITION);

                        // Ensure complete cleanup of level1 before starting level2
                        logger.info('Ensuring complete cleanup of level1 before transitioning to level2');
                        if (levelManager.getCurrentLevelId() === 'level1') {
                            levelManager.unloadCurrentLevel();
                        }

                        // Directly call startGameCallback for level2
                        startGameCallback('level2');
                    }
                }, 100); // Increased delay to ensure cleanup completes
            }
        }
    });

    eventBus.subscribe('powerupActivated', (powerupType) => {
        // TODO: Refactor powerup logic into a dedicated PlayerManager or component
        if (powerupType !== gameplayConfig.POWERUP_TYPE_MAGNET) {
            logger.warn(`Received invalid powerup type: ${powerupType}, ignoring`);
            return;
        }

        const wasActive = player.powerup === powerupType;
        player.powerup = powerupType; // Update player state directly (temporary)

        if (wasActive) {
            logger.info(`${powerupType} powerup already active, extending duration`);
            if (powerupTimeout) clearTimeout(powerupTimeout);
        } else {
            logger.info(`${powerupType} powerup started!`);
            // Emit event for visual effect instead of direct manipulation
            eventBus.emit('applyPowerupEffect', { type: powerupType, player });
            // Removed direct material manipulation here
        }

        if (powerupTimeout) clearTimeout(powerupTimeout);

        powerupTimeout = setTimeout(() => {
            if (player.powerup === powerupType) {
                player.powerup = '';
                logger.info(`${powerupType} powerup expired!`);
                // Emit event to remove visual effect
                eventBus.emit('removePowerupEffect', { type: powerupType, player });
                // Removed direct material manipulation here
            }
            powerupTimeout = null;
        }, gameplayConfig.POWERUP_DURATION * 1000);
    });

    eventBus.subscribe('resetPowerups', () => {
        // Reset powerup status
        if (player.powerup) {
            const currentPowerup = player.powerup;
            player.powerup = '';
            logger.debug(`Powerup ${currentPowerup} reset`);

            // Remove powerup visual effect
            eventBus.emit('removePowerupEffect', { type: currentPowerup, player });
        }

        // Clear any active powerup timeout
        if (powerupTimeout) {
            clearTimeout(powerupTimeout);
            powerupTimeout = null;
            logger.debug("Powerup timeout cleared");
        }

    })

    eventBus.subscribe('playerDied', () => {
        logger.info("Player Died event received.");
        const currentLevelId = levelManager.getCurrentLevelId();
        const currentScore = ScoreManager.getCurrentScore(); // Use imported module
        const isNewHighScore = scoreManager.updateHighScore(currentScore, currentLevelId);
        const highScore = scoreManager.getLevelHighScore(currentLevelId);

        gameStateManager.setGameState(GameStates.GAME_OVER);

        eventBus.emit('resetPowerups');

        eventBus.emit('gameOverInfo', {
            score: currentScore,
            highScore: highScore,
            levelId: currentLevelId,
            isNewHighScore: isNewHighScore
        });
    });

    eventBus.subscribe('gameStateChanged', ({ newState, oldState }) => {
        logger.info(`Observed state changed to: ${newState} from ${oldState}`);

        // Logic related to player model parenting/visibility should be handled
        // by SceneTransitionManager or the Game class reacting to the state change.
        if (newState === GameStates.TITLE) {
            // Player model removal is handled by requestReturnToTitle handler
            // Camera drift reset is handled by CameraManager
            // UI updates (like populating level select) should be handled by UIManager listening for this event

            // Double-check that score and powerup are reset when reaching TITLE state
            // This is a safety measure in case requestReturnToTitle wasn't the trigger
            ScoreManager.resetCurrentScore();

            // Also directly update the UI score display
            if (uiManager) {
                uiManager.updateScoreDisplay(0, false);
            }

            if (player.powerup) {
                const currentPowerup = player.powerup;
                player.powerup = '';
                logger.debug(`Powerup ${currentPowerup} reset on TITLE state change`);

                // Remove powerup visual effect
                eventBus.emit('removePowerupEffect', { type: currentPowerup, player });
            }

            // Clear any active powerup timeout
            if (powerupTimeout) {
                clearTimeout(powerupTimeout);
                powerupTimeout = null;
                logger.debug("Powerup timeout cleared on TITLE state change");
            }
        } else if (newState === GameStates.PLAYING) {
             // Player animation time reset should be handled by Game class or PlayerManager
        }
    });

    eventBus.subscribe('requestLevelTransition', (levelId) => {
        logger.info(`Received requestLevelTransition event for: ${levelId}`);
        try {
            // Set game state to LEVEL_TRANSITION
            gameStateManager.setGameState(GameStates.LEVEL_TRANSITION);

            // Ensure complete cleanup of current level before transitioning
            const currentLevelId = levelManager.getCurrentLevelId();
            if (currentLevelId && currentLevelId !== levelId) {
                logger.info(`Ensuring complete cleanup of level ${currentLevelId} before transitioning to ${levelId}`);
                levelManager.unloadCurrentLevel();
            }

            // Use startGameCallback to ensure proper level initialization
            startGameCallback(levelId);
        } catch (error) {
            logger.error(`Error during level transition to ${levelId}:`, error);
            // Try to recover by returning to title screen
            gameStateManager.setGameState(GameStates.TITLE);
        }
    });

    eventBus.subscribe('requestPause', () => {
        logger.info("Received requestPause event");
        resetInputStates();
        gameStateManager.setGameState(GameStates.PAUSED);
    });

    eventBus.subscribe('requestResume', () => {
        logger.info("Received requestResume event");
        resetInputStates();
        gameStateManager.setGameState(GameStates.PLAYING);
    });

     eventBus.subscribe('requestRestart', () => {
        logger.info("Received requestRestart event");
        const currentLevelId = levelManager.getCurrentLevelId();
        if (currentLevelId && !sceneTransitionManager.getIsTransitioning() && !cameraManager.getIsTransitioning()) {
            resetInputStates();
            updateMobileControlsVisibility();
            eventBus.emit('uiButtonClicked');
            startGameCallback(currentLevelId);
        } else if (sceneTransitionManager.getIsTransitioning() || cameraManager.getIsTransitioning()) {
            logger.warn("Cannot restart: Transition in progress.");
        } else {
            logger.error("Cannot restart: Current level ID not found.");
        }
    });

     eventBus.subscribe('requestReturnToTitle', () => {
        logger.info("Received requestReturnToTitle event");
        if (sceneTransitionManager.getIsTransitioning() || cameraManager.getIsTransitioning()) {
            logger.warn("Cannot return to title: Transition in progress.");
            return;
        }
        eventBus.emit('uiButtonClicked');
        updateMobileControlsVisibility(false, true); // Force hide
        atmosphericManager.clearElements();

        // Get the current state before changing it
        const currentState = gameStateManager.getCurrentState();

        // Reset score
        ScoreManager.resetCurrentScore();
        // Also directly update the UI score display to ensure it's reset
        if (dependencies.uiManager) {
            dependencies.uiManager.updateScoreDisplay(0, false);
        }
        logger.debug("Score reset when returning to title");

        // clear powerups
        eventBus.emit('resetPowerups');

        // Only start camera transition if NOT coming from LEVEL_SELECT
        if (currentState !== GameStates.LEVEL_SELECT) {
            cameraManager.startTransitionToTitle(cameraManager.getCamera().position, cameraManager.getCamera().quaternion);
        }

        // Player model removal should happen here or be triggered by the state change
        if (player.model && player.model.parent) {
            player.model.parent.remove(player.model);
        }

        // Set appropriate state
        if (currentState === GameStates.LEVEL_SELECT) {
            gameStateManager.setGameState(GameStates.TITLE);
        } else {
            gameStateManager.setGameState(GameStates.TRANSITIONING_TO_TITLE);
        }
    });

     eventBus.subscribe('requestShowLevelSelect', () => {
        logger.info("Received requestShowLevelSelect event");
         if (sceneTransitionManager.getIsTransitioning() || cameraManager.getIsTransitioning()) {
            logger.warn("Cannot show level select: Transition in progress.");
            return;
        }
        gameStateManager.setGameState(GameStates.LEVEL_SELECT);
    });


    eventBus.subscribe('cameraTransitionComplete', (transitionType) => {
        if (transitionType === 'toTitle') {
            logger.info("Camera transition to title complete, setting state to TITLE.");

            // The gameStateChanged event handler will handle additional cleanup
            // when the state changes to TITLE
            gameStateManager.setGameState(GameStates.TITLE);
        } else if (transitionType === 'toGameplay') {
             logger.info("Camera transition to gameplay complete, setting state to PLAYING.");
             gameStateManager.setGameState(GameStates.PLAYING);
             // The camera manager now handles the smooth transition internally
             // by storing the last position and using it in the first frame
             logger.debug("Camera transition to gameplay complete, state set to PLAYING.");
        }
    });

    logger.info("Event subscriptions set up.");
}
