// js/core/gameplayUpdater.js
import { createLogger } from '../utils/logger.js'; // Import logger

const logger = createLogger('GameplayUpdater'); // Define logger instance
/**
 * Updates all game logic relevant to the PLAYING state.
 * Called by the main game loop when the game state is PLAYING.
 * @param {Game} game - The main game instance.
 * @param {number} deltaTime - Time elapsed since the last frame.
 * @param {number} elapsedTime - Total time elapsed since the game started.
 */
export function updateGameplay(game, deltaTime, elapsedTime) {
    // Removed the logger call causing the crash
    // Update player animation time (assuming it's still needed directly on game instance)
    game.playerAnimationTime += deltaTime;
    if (game.player.model) {
        // Update player controller - camera follow is handled by CameraManager
        // Access playerController via game instance
        game.playerController.updatePlayer(game.player, deltaTime, game.playerAnimationTime, game.chunkManager, null);
    }

    if (game.chunkManager && game.player.model) {
        game.chunkManager.update(game.player.model.position);
        // Update coins to make them spin and move toward player if magnet powerup is active
        game.chunkManager.updateCollectibles(deltaTime, elapsedTime, game.player.model.position, game.player.powerup);
        // Update tumbleweeds
        game.chunkManager.updateTumbleweeds(deltaTime, elapsedTime, game.player.model.position);
    }
    if (game.enemyManager && game.player.model) {
        game.enemyManager.update(game.player.model.position, deltaTime, elapsedTime);
    }
    if (game.particleManager && game.player.model) {
        game.particleManager.update(deltaTime, game.player.model.position);
    }
    // Removed the logger calls causing the crash
    if (game.collisionChecker && game.player?.model) { // Added optional chaining for safety
        game.collisionChecker(game.player); // collisionChecker is assigned directly to game instance
    }
    if (game.atmosphericManager) { // Check if atmosphericManager exists
        game.atmosphericManager.update(deltaTime, elapsedTime); // Update atmospheric elements
    }
}