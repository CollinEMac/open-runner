// js/managers/collisionManager.js
import * as THREE from 'three';
import { createLogger } from '../utils/logger.js'; // Import logger
// Import specific config objects
import { playerConfig } from '../config/player.js';
import { modelsConfig } from '../config/models.js';
import { gameplayConfig } from '../config/gameplay.js';
import { tumbleweedConfig } from '../config/tumbleweed.js';



import gameStateManager, { GameStates } from '../core/gameStateManager.js'; // Import default instance and GameStates enum
import eventBus from '../core/eventBus.js'; // Moved to core

const logger = createLogger('CollisionManager'); // Instantiate logger

// --- Collision Constants ---
const playerCollisionRadius = playerConfig.TORSO_WIDTH; // Use imported constant

// Collision sizes/radii are accessed via the imported modelsConfig object,
// e.g., modelsConfig.ROCK_DESERT.COLLISION_RADIUS, modelsConfig.BEAR.COLLISION_WIDTH_FACTOR etc.

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
 * @param {Object} player - The player object containing position data.
 */
export function checkCollisions(player) {
    if (!player || !player.model) {
        return;
    }
    const playerPosition = player.model.position;
    // Removed checks for callbacks, only check for core dependencies and game state
    if (gameStateManager.getCurrentState() !== GameStates.PLAYING || !_spatialGrid || !_chunkManager) {
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
        // Log details of every nearby object being checked
        if (!mesh.position) continue;

        // handle coins
        if (mesh.userData.objectType === 'coin' && !mesh.userData.collidable) {

            // Verify this is actually a coin by checking its geometry
            if (!mesh.geometry || !mesh.geometry.parameters || !mesh.geometry.parameters.radiusBottom) {
                // Fix the object type if it's not actually a coin
                if (mesh.geometry && mesh.geometry.type !== 'CylinderGeometry') {
                    // Try to determine the correct type based on the mesh
                    if (mesh.name && mesh.name.includes('magnet')) {
                        mesh.userData.objectType = 'magnet';
                        continue; // Skip to next iteration so it's processed as a magnet
                    }
                }
            }

            const dx = playerPosition.x - mesh.position.x;
            const dy = playerPosition.y - mesh.position.y; // Keep dy for potential future 3D checks
            const dz = playerPosition.z - mesh.position.z;
            const distanceSq = dx * dx + dz * dz; // Use 2D distance for gameplay logic consistency
            const coinCollisionRadius = mesh.geometry?.parameters?.radiusBottom || 0.5; // Smaller default, consistent with magnet logic

            // When magnet is active, we need to ensure coins are collected properly
            // and don't get stuck inside the player model
            let collisionThresholdSq;
            const minSafeDistanceSq = (playerCollisionRadius * gameplayConfig.PLAYER_SAFE_DISTANCE_FACTOR) ** 2; // Use constant

            if (player.powerup === 'magnet') {
                // Use a much larger collection radius when magnet is active
                // This ensures coins don't get stuck inside the player model
                // This must be larger than the minSafeDistanceSq
                collisionThresholdSq = (playerCollisionRadius + coinCollisionRadius * gameplayConfig.COIN_COLLECTION_RADIUS_FACTOR) ** 2; // Use constant factor



                // Force collect any coins that somehow got too close to the player
                // This is a safety measure to prevent coins from getting stuck
                if (distanceSq < minSafeDistanceSq) {
                    const { chunkKey, objectIndex, scoreValue } = mesh.userData;
                    const collected = _chunkManager.collectObject(chunkKey, objectIndex);

                    if (collected) {
                        eventBus.emit('scoreChanged', scoreValue || gameplayConfig.DEFAULT_COIN_SCORE); // Use constant default
                        nearbyArray.splice(i, 1);
                    }
                    continue; // Skip to next object
                }
            } else {
                // Normal collection radius when magnet is not active
                collisionThresholdSq = (playerCollisionRadius + coinCollisionRadius) ** 2;
            }

            if (distanceSq < collisionThresholdSq) {
                const { chunkKey, objectIndex, scoreValue } = mesh.userData;
                const collected = _chunkManager.collectObject(chunkKey, objectIndex);

                if (collected) {
                    // Emit score change event instead of calling callback
                    eventBus.emit('scoreChanged', scoreValue || gameplayConfig.DEFAULT_COIN_SCORE); // Use constant default
                    nearbyArray.splice(i, 1); // Remove from local array for this check
                }
            }
        }

        // handle powerups
        if (mesh.userData.objectType === 'magnet' && !mesh.userData.collidable) {

            // Verify this is actually a magnet by checking its structure
            // Magnets are typically groups with multiple child meshes
            if (!(mesh instanceof THREE.Group) && !mesh.name.includes('magnet')) {
                // If it's a cylinder, it's probably a coin with incorrect type
                if (mesh.geometry && mesh.geometry.type === 'CylinderGeometry') {
                    mesh.userData.objectType = 'coin';
                    continue; // Skip to next iteration so it's processed as a coin
                }
            }

            if (!mesh.position) {
                continue;
            }
            const dx = playerPosition.x - mesh.position.x;
            const dz = playerPosition.z - mesh.position.z;
            const distanceSq = dx * dx + dz * dz;
            // Use collision radius from config
            const magnetCollisionRadius = modelsConfig.MAGNET.COLLISION_RADIUS || 1.0; // Default if not in config
            const collisionThresholdSq = (playerCollisionRadius + magnetCollisionRadius) ** 2;

            if (distanceSq < collisionThresholdSq) {
                const { chunkKey, objectIndex, scoreValue } = mesh.userData;
                const collected = _chunkManager.collectObject(chunkKey, objectIndex);

                if (collected) {
                    eventBus.emit('powerupActivated', modelsConfig.MAGNET.POWERUP_TYPE || 'magnet'); // Use constant if defined
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
            if (objectType === tumbleweedConfig.OBJECT_TYPE_NAME) { // Use constant for tumbleweed type name
                 const tumbleweedRadius = (modelsConfig.TUMBLEWEED_MODEL.COLLISION_RADIUS || 1.0) * mesh.scale.x; // Use constant from config
                 const collisionThresholdSqTumbleweed = (playerCollisionRadius + tumbleweedRadius) ** 2;
                 if (distanceSq < collisionThresholdSqTumbleweed) {
                     eventBus.emit('playerDied'); // Emit player death event
                     return; // Stop checking
                 }
            }
            // Special check for trees to allow walking under foliage
            else if (objectType === modelsConfig.TREE_PINE.OBJECT_TYPE && modelsConfig.TREE_PINE.ALLOW_WALK_UNDER) { // Use constants
                // Use trunk radius from config
                const trunkRadius = modelsConfig.TREE_PINE.TRUNK_RADIUS * mesh.scale.x;
                const collisionThresholdSqTrunk = (playerCollisionRadius + trunkRadius) ** 2;

                // Only check for collision with the trunk if we're close enough horizontally
                if (distanceSq < collisionThresholdSqTrunk) {
                    // Get the height of the player relative to the tree base
                    const playerY = playerPosition.y;
                    const treeBaseY = mesh.position.y;

                    // Tree trunk height from config
                    const trunkHeight = modelsConfig.TREE_PINE.TRUNK_HEIGHT * mesh.scale.y;
                    const trunkTopY = treeBaseY + trunkHeight;

                    // Calculate player's feet position
                    const playerFeetY = playerY - playerConfig.HEIGHT_OFFSET; // Use imported constant


                    // Only trigger collision if player's feet are below the top of the trunk
                    // Add a small buffer using constant
                    if (playerFeetY < trunkTopY - gameplayConfig.TREE_COLLISION_BUFFER) {
                        eventBus.emit('playerDied'); // Emit player death event
                        return; // Stop checking
                    }
                    // Otherwise player is above trunk height and can walk under foliage
                }
            }
            // Check for other static obstacles
            else {
                // Get radius from MODELS config, fallback to 1.0
                const modelConfig = modelsConfig[objectType.toUpperCase()]; // Find config based on type name
                const obstacleRadius = (modelConfig?.COLLISION_RADIUS || 1.0) * mesh.scale.x;
                const collisionThresholdSqObstacle = (playerCollisionRadius + obstacleRadius) ** 2;

                if (distanceSq < collisionThresholdSqObstacle) {
                    eventBus.emit('playerDied'); // Emit player death event
                    return; // Stop checking
                }
            }
        }
        // Check if it's an Enemy
        else if (mesh.userData.enemyInstance) {
            const enemyType = mesh.userData.enemyInstance.type;
            let enemyRadius = 0.5; // Default fallback
            const enemyConfig = modelsConfig[enemyType.toUpperCase()]; // Find config based on type name

            if (enemyConfig) {
                // Use radius if defined in config
                if (enemyConfig.COLLISION_RADIUS) {
                    enemyRadius = enemyConfig.COLLISION_RADIUS;
                }
                // Otherwise, estimate from width/depth factors if available
                else if (enemyConfig.COLLISION_WIDTH_FACTOR && enemyConfig.COLLISION_DEPTH_FACTOR && enemyConfig.TORSO_WIDTH && enemyConfig.TORSO_DEPTH) {
                     const approxWidth = enemyConfig.TORSO_WIDTH * enemyConfig.COLLISION_WIDTH_FACTOR;
                     const approxDepth = enemyConfig.TORSO_DEPTH * enemyConfig.COLLISION_DEPTH_FACTOR;
                     enemyRadius = (approxWidth + approxDepth) / 4; // Average estimate
                }
            }
            const collisionThresholdSqEnemy = (playerCollisionRadius + enemyRadius) ** 2;

            if (distanceSq < collisionThresholdSqEnemy) {
                 eventBus.emit('playerDied'); // Emit player death event
                return; // Stop checking
            }
        }
    }
}