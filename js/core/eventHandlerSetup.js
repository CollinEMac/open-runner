// js/core/eventHandlerSetup.js
import * as THREE from 'three';
import eventBus from './eventBus.js';
import { GameStates } from './gameStateManager.js';
import { createLogger } from '../utils/logger.js';
import {
    LEVEL1_TRANSITION_SCORE,
    POWERUP_TYPE_MAGNET, POWERUP_DURATION,
    MAGNET_EFFECT_COLOR, MAGNET_EFFECT_EMISSIVE, MAGNET_EFFECT_METALNESS, MAGNET_EFFECT_ROUGHNESS
} from '../config/config.js';
import { grayMaterial } from '../entities/playerCharacter.js'; // Needed for powerup end

const logger = createLogger('EventHandlerSetup');

/**
 * Sets up subscriptions to global events via the event bus for the game instance.
 * Handles score changes, power-ups, player death, state changes, etc.
 * @param {Game} game - The main game instance.
 */
export function setupEventHandlers(game) {
    if (!game || !game.eventBus) {
        logger.error("Cannot setup event handlers: Invalid game instance or eventBus provided.");
        return;
    }

    game.eventBus.subscribe('scoreChanged', (scoreIncrement) => {
        if (game.score + scoreIncrement < 0) {
            game.score = 0;
        } else {
            game.score += scoreIncrement;
        }
        logger.debug(`Score updated to: ${game.score}`);

        const currentLevelId = game.levelManager.getCurrentLevelId();

        game.eventBus.emit('currentScoreUpdated', {
            score: game.score,
            levelId: currentLevelId
        });

        if (currentLevelId === 'level1' && game.score >= LEVEL1_TRANSITION_SCORE && game.gameStateManager.getCurrentState() === GameStates.PLAYING) {
             game.eventBus.emit('requestLevelTransition', 'level2');
             logger.info("Requesting level transition to level2");
        }
    });

    game.eventBus.subscribe('powerupActivated', (powerupType) => {
        if (powerupType !== POWERUP_TYPE_MAGNET) {
            logger.warn(`Received invalid powerup type: ${powerupType}, ignoring`);
            return;
        }

        if (game.player.powerup === powerupType) {
            logger.info(`${powerupType} powerup already active, extending duration`);
            if (game.powerupTimer) {
                clearTimeout(game.powerupTimer);
            }
        } else {
            game.player.powerup = powerupType;
            logger.info(`${powerupType} powerup started!`);
        }

        const magnetMaterial = new THREE.MeshStandardMaterial({
            color: MAGNET_EFFECT_COLOR,
            emissive: MAGNET_EFFECT_EMISSIVE,
            metalness: MAGNET_EFFECT_METALNESS,
            roughness: MAGNET_EFFECT_ROUGHNESS
        });

        if (game.player.modelParts && game.player.modelParts.characterGroup) {
            game.player.modelParts.characterGroup.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = magnetMaterial;
                }
            });
        } else {
             logger.warn("Cannot apply powerup material: player model parts not found.");
        }


        if (game.powerupTimer) {
            clearTimeout(game.powerupTimer);
        }

        game.powerupTimer = setTimeout(() => {
            game.player.powerup = '';
            logger.info(`${powerupType} powerup expired!`);

            if (game.player.modelParts && game.player.modelParts.characterGroup) {
                game.player.modelParts.characterGroup.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        child.material = grayMaterial;
                    }
                });
            } else {
                 logger.warn("Cannot revert powerup material: player model parts not found.");
            }

        }, POWERUP_DURATION * 1000);
    });

    game.eventBus.subscribe('playerDied', () => game.handleGameOver());

    game.eventBus.subscribe('gameStateChanged', ({ newState, oldState }) => { // Destructure payload
        logger.info(`Observed state changed to: ${newState} from ${oldState}`);
        if (newState === GameStates.PLAYING) {
             game.playerAnimationTime = 0;
        }
        if (newState === GameStates.TITLE) {
            if (game.player.model && game.player.model.parent) {
                game.player.model.parent.remove(game.player.model);
            }

            if (oldState !== GameStates.LEVEL_SELECT) {
                logger.debug("Camera drift will be re-initialized by CameraManager.");
            } else {
                logger.debug("Preserving camera drift from level select.");
            }

            const availableLevels = game.levelManager.getAvailableLevels();
            // Ensure startGame is bound correctly if it uses 'this' internally
            game.uiManager.populateLevelSelect(availableLevels, game.startGame.bind(game));
        }
    });

    game.eventBus.subscribe('requestLevelTransition', (levelId) => {
        logger.info(`Received requestLevelTransition event for: ${levelId}`);
        game._loadLevel(levelId); // Assumes _loadLevel remains a private method on Game
    });

    game.eventBus.subscribe('requestPause', () => {
        logger.info("Received requestPause event from mobile controls");
        game.pauseGame();
    });

    game.eventBus.subscribe('requestResume', () => {
        logger.info("Received requestResume event from mobile controls");
        game.resumeGame();
    });

    game.eventBus.subscribe('cameraTransitionComplete', (transitionType) => {
        if (transitionType === 'toTitle') {
            logger.info("Camera transition to title complete, setting state to TITLE.");
            game.gameStateManager.setGameState(GameStates.TITLE);
        }
        // Handle 'toGameplay' if needed in the future
    });

    logger.info("Event subscriptions set up.");
}