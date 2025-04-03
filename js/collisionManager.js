// js/collisionManager.js
import * as Config from './config.js';
import { GameStates, getCurrentState } from './gameStateManager.js'; // Need state info
import eventBus from './eventBus.js'; // Import the event bus

// --- Collision Constants ---
// Moved from main.js
const playerCollisionRadius = Config.PLAYER_TORSO_WIDTH; // Use a slightly larger radius for safety

// Placeholder radii for obstacles
const obstacleRadii = {
    rock_small: 1.0,
    rock_large: 2.5,
    tree_pine: 1.5, // Trunk radius
    log_fallen: 1.0, // Radius of the log cylinder
    cabin_simple: 5.0, // Approximate radius covering the cabin
    // Desert obstacles
    cactus_saguaro: 0.8, // Approx radius
    cactus_barrel: 1.2, // Approx radius
    saloon: 6.0, // Approx radius
    railroad_sign: 0.3, // Small radius
    dried_bush: 1.0,
    wagon_wheel: 1.0,
    mine_entrance: 2.5, // Approx radius of frame
    water_tower: 2.5, // Approx radius of base/legs
    tumbleweed: 1.0, // Approx radius
};

// Placeholder radii/sizes for enemies
const enemyCollisionSizes = {
    bear: { width: 1.8, depth: 3.0 },
    squirrel: { width: 0.8, depth: 1.5 },
    deer: { width: 1.2, depth: 2.8 },
    // Desert enemies (using simple radius for now)
    coyote: { radius: 0.8 },
    rattlesnake: { radius: 0.4 },
    scorpion: { radius: 0.4 }
};

// --- Module State ---
let _spatialGrid = null;
let _chunkManager = null;
// let _scoreUpdater = null; // No longer needed, use eventBus
// let _gameOverHandler = null; // No longer needed, use eventBus

/**
 * Initializes the Collision Manager with necessary dependencies.
 * @param {SpatialGrid} spatialGridInstance
 * @param {ChunkManager} chunkManagerInstance
 * Removed scoreUpdateCallback and gameOverCallback, using eventBus instead.
 */
export function initCollisionManager(spatialGridInstance, chunkManagerInstance) {
    _spatialGrid = spatialGridInstance;
    _chunkManager = chunkManagerInstance;
    // _scoreUpdater = scoreUpdateCallback; // Removed
    // _gameOverHandler = gameOverCallback; // Removed
}

/**
 * Checks for collisions between the player and nearby objects.
 * @param {THREE.Vector3} playerPosition - The player's current position.
 */
export function checkCollisions(playerPosition) {
    // Removed checks for callbacks, only check for core dependencies and game state
    if (getCurrentState() !== GameStates.PLAYING || !_spatialGrid || !_chunkManager) {
        // Only check collisions during 'playing' state and if initialized
        return;
    }

    // --- Query Spatial Grid for Nearby Objects ---
    const nearbyObjects = _spatialGrid.queryNearby(playerPosition);

    // --- Process Nearby Objects ---
    const nearbyArray = Array.from(nearbyObjects);

    // Check Collectibles first (iterating backwards for safe removal)
    for (let i = nearbyArray.length - 1; i >= 0; i--) {
        const mesh = nearbyArray[i];
        if (!mesh || !mesh.userData) continue;

        if (mesh.userData.objectType === 'coin' && !mesh.userData.collidable) {
            const dx = playerPosition.x - mesh.position.x;
            const dz = playerPosition.z - mesh.position.z;
            const distanceSq = dx * dx + dz * dz;
            const coinCollisionRadius = mesh.geometry.parameters.radiusBottom;
            const collisionThresholdSq = (playerCollisionRadius + coinCollisionRadius) ** 2;

            if (distanceSq < collisionThresholdSq) {
                const { chunkKey, objectIndex, scoreValue } = mesh.userData;
                const collected = _chunkManager.collectObject(chunkKey, objectIndex);

                if (collected) {
                    // Emit score change event instead of calling callback
                    eventBus.emit('scoreChanged', scoreValue || 0);
                    // console.log(`Collectible collected!`);
                    nearbyArray.splice(i, 1); // Remove from local array for this check
                }
            }
        }
    }

    // Now check remaining nearby objects for obstacles and enemies
    for (const mesh of nearbyArray) {
        if (!mesh || !mesh.userData) continue;

        const dx = playerPosition.x - mesh.position.x;
        const dz = playerPosition.z - mesh.position.z;
        const distanceSq = dx * dx + dz * dz;

        // Check if it's an Obstacle
        // Check if it's a standard Obstacle OR a Tumbleweed
        if (mesh.userData.collidable && !mesh.userData.enemyInstance) {
            const objectType = mesh.userData.objectType;

            // Special check for Tumbleweed hazard
            if (objectType === 'tumbleweed') {
                 const tumbleweedRadius = (obstacleRadii[objectType] || 1.0) * mesh.scale.x;
                 const collisionThresholdSqTumbleweed = (playerCollisionRadius + tumbleweedRadius) ** 2;
                 if (distanceSq < collisionThresholdSqTumbleweed) {
                     console.log(`Collision detected with hazard: ${objectType}`);
                     eventBus.emit('playerDied'); // Emit player death event
                     return; // Stop checking
                 }
            }
            // Check for other static obstacles
            else {
                const obstacleRadius = (obstacleRadii[objectType] || 1.0) * mesh.scale.x;
                const collisionThresholdSqObstacle = (playerCollisionRadius + obstacleRadius) ** 2;

                if (distanceSq < collisionThresholdSqObstacle) {
                    // console.log(`Collision detected with obstacle: ${objectType}`);
                    eventBus.emit('playerDied'); // Emit player death event
                    return; // Stop checking
                }
            }
        }
        // Check if it's an Enemy
        else if (mesh.userData.enemyInstance) {
            const enemyType = mesh.userData.enemyInstance.type;
            let enemyRadius = 0.5;
            if (enemyCollisionSizes[enemyType]) {
                // Use radius if defined, otherwise estimate from width/depth
                if (enemyCollisionSizes[enemyType]?.radius) {
                    enemyRadius = enemyCollisionSizes[enemyType].radius;
                } else if (enemyCollisionSizes[enemyType]?.width && enemyCollisionSizes[enemyType]?.depth) {
                    enemyRadius = (enemyCollisionSizes[enemyType].width + enemyCollisionSizes[enemyType].depth) / 4; // Average estimate
                } else {
                     console.warn(`Missing collision size for enemy type: ${enemyType}`);
                     enemyRadius = 0.5; // Fallback small radius
                }
            }
            const collisionThresholdSqEnemy = (playerCollisionRadius + enemyRadius) ** 2;

            if (distanceSq < collisionThresholdSqEnemy) {
                // console.log(`Collision detected with enemy: ${enemyType}`);
                 eventBus.emit('playerDied'); // Emit player death event
                return; // Stop checking
            }
        }
    }
}
