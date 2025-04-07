// js/core/gameplayUpdater.js
import { createLogger } from '../utils/logger.js';
import cameraManager from '../managers/cameraManager.js';

const logger = createLogger('GameplayUpdater');

/**
 * Updates all game logic relevant to the PLAYING state.
 * Called by the main game loop when the game state is PLAYING.
 * @param {object} dependencies - Object containing necessary dependencies.
 * @param {object} dependencies.player - The player state object { model, modelParts, currentSpeed, powerup }.
 * @param {object} dependencies.playerController - The player controller module/object.
 * @param {object} dependencies.chunkManager - The ChunkManager instance.
 * @param {object} dependencies.enemyManager - The EnemyManager instance.
 * @param {object} dependencies.particleManager - The ParticleManager instance.
 * @param {function} dependencies.collisionChecker - The collision checking function.
 * @param {object} dependencies.atmosphericManager - The AtmosphericManager instance.
 * @param {number} dependencies.playerAnimationTime - Current animation time for the player.
 * @param {number} deltaTime - Time elapsed since the last frame.
 * @param {number} elapsedTime - Total time elapsed since the game started.
 */
export function updateGameplay(dependencies, deltaTime, elapsedTime) {
    const {
        player,
        playerController,
        chunkManager,
        enemyManager,
        particleManager,
        collisionChecker,
        atmosphericManager,
        playerAnimationTime
    } = dependencies;

    // Validate required dependencies
    if (!player || !playerController || !chunkManager || !enemyManager || !particleManager || !collisionChecker || !atmosphericManager) {
        logger.error("Missing one or more dependencies in updateGameplay. Aborting update.");
        return;
    }

    // Update player controller with camera follow function
    if (player.model) {
        logger.debug("Passing camera follow function to player controller");
        // Create a bound function reference to ensure proper 'this' context
        const boundCameraFollow = cameraManager.updateCameraFollow.bind(cameraManager);

        // Verify the bound function is valid
        if (typeof boundCameraFollow === 'function') {
            logger.debug("Camera follow function successfully bound");
        } else {
            logger.error("Failed to bind camera follow function");
        }

        // Pass the camera manager's updateCameraFollow method as the camera update function
        playerController.updatePlayer(player, deltaTime, playerAnimationTime, chunkManager, boundCameraFollow);
    } else {
        logger.warn("Cannot update player: player model is missing");
    }

    // Update managers that depend on player position
    if (chunkManager && player.model) {
        chunkManager.update(player.model.position);
        chunkManager.updateCollectibles(deltaTime, elapsedTime, player.model.position, player.powerup);
        chunkManager.updateTumbleweeds(deltaTime, elapsedTime, player.model.position);
    }
    if (enemyManager && player.model) {
        enemyManager.update(player.model.position, deltaTime, elapsedTime);
    }
    if (particleManager && player.model) {
        particleManager.update(deltaTime, player.model.position);
    }

    // Update atmospheric effects
    if (atmosphericManager) {
        atmosphericManager.update(deltaTime, elapsedTime);
    }

    // Check collisions
    if (collisionChecker && player?.model) {
        collisionChecker(player);
    }
}