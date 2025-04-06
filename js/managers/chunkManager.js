// js/managers/chunkManager.js
import * as THREE from 'three';
import * as UIManager from './uiManager.js'; // Stays in managers
import { createTerrainChunk } from '../rendering/terrainGenerator.js'; // Moved to rendering
import { generateObjectsForChunk, createObjectVisual, disposeObjectVisual } from '../generators/objectGenerator.js'; // Moved to generators
import { createLogger } from '../utils/logger.js'; // Import logger
import Tumbleweed from '../entities/gameObjects/Tumbleweed.js'; // Moved to entities/gameObjects
import { EnemyManager } from './enemyManager.js'; // Stays in managers
import * as AudioManager from './audioManager.js'; // Stays in managers
import * as AssetManager from './assetManager.js'; // Stays in managers
import eventBus from '../core/eventBus.js'; // Moved to core

const logger = createLogger('ChunkManager'); // Instantiate logger
import {
    CHUNK_SIZE,
    RENDER_DISTANCE_CHUNKS,
    RENDERING, // Keep for potential future use, though MAX_OBJECTS_PER_CHUNK is removed
    performanceManager,
    PLAYER_TORSO_WIDTH
} from '../config/config.js'; // Moved to config
import objectPoolManager from './objectPoolManager.js'; // Stays in managers

// Collision constants
const playerCollisionRadius = PLAYER_TORSO_WIDTH;

export class ChunkManager {
    constructor(scene, enemyManager, spatialGrid, initialLevelConfig = null) {
        if (!scene || !enemyManager || !spatialGrid) {
            throw new Error("ChunkManager requires scene, EnemyManager, and SpatialGrid instances!");
        }
        this.levelConfig = initialLevelConfig;
        this.scene = scene;
        this.enemyManager = enemyManager;
        this.spatialGrid = spatialGrid;
        this.chunkSize = CHUNK_SIZE;
        this.renderDistance = RENDER_DISTANCE_CHUNKS;
        this.loadedChunks = new Map();
        this.lastCameraChunkX = null;
        this.lastCameraChunkZ = null;

        // Object Pooling is now handled by ObjectPoolManager
        this.objectPoolManager = objectPoolManager;

        // Async Loading Queues
        this.chunksToLoadQueue = new Set();
        this.chunksToUnloadQueue = new Set();
        this.processingQueues = false;
    }

    /**
     * Sets the level configuration to be used for generating new chunks.
     * @param {object} config - The level configuration object.
     */
    setLevelConfig(config) {
        logger.info("Setting level config.");
        this.levelConfig = config;
    }

    // Calculates the chunk coordinates a position (camera or player) is currently in
    // Calculates the chunk coordinates a position (e.g., player) is currently in
    getPositionChunkCoords(position) {
        // Add safety check for invalid input position
        if (!position || isNaN(position.x) || isNaN(position.z)) {
            logger.warn(`[ChunkManager] Invalid position provided to getPositionChunkCoords:`, position);
            // Return null or the last known valid coords? Returning null might be safer.
            return { chunkX: null, chunkZ: null };
        }
        const chunkX = Math.floor(position.x / this.chunkSize);
        const chunkZ = Math.floor(position.z / this.chunkSize);
        return { chunkX, chunkZ };
    }

    // Main update function, called every frame - now uses playerPosition
    update(playerPosition) {
        // Use the renamed helper function
        const { chunkX: currentChunkX, chunkZ: currentChunkZ } = this.getPositionChunkCoords(playerPosition);

        // If position was invalid, skip update
        if (currentChunkX === null || currentChunkZ === null) {
            logger.warn("[ChunkManager] Skipping update due to invalid player position.");
            return;
        }

        if (currentChunkX !== this.lastCameraChunkX || currentChunkZ !== this.lastCameraChunkZ || this.lastCameraChunkX === null) {
            this.lastCameraChunkX = currentChunkX;
            this.lastCameraChunkZ = currentChunkZ;

            const chunksToLoad = new Set();
            const currentlyLoadedKeys = new Set(this.loadedChunks.keys());

            for (let x = currentChunkX - this.renderDistance; x <= currentChunkX + this.renderDistance; x++) {
                for (let z = currentChunkZ - this.renderDistance; z <= currentChunkZ + this.renderDistance; z++) {
                    const key = `${x},${z}`;
                    chunksToLoad.add(key);

                    if (!this.loadedChunks.has(key) && !this.chunksToLoadQueue.has(key)) {
                        this.chunksToLoadQueue.add(key);
                        this.chunksToUnloadQueue.delete(key);
                    }
                }
            }

            for (const loadedKey of currentlyLoadedKeys) {
                if (!chunksToLoad.has(loadedKey) && !this.chunksToUnloadQueue.has(loadedKey)) {
                    this.chunksToUnloadQueue.add(loadedKey);
                    this.chunksToLoadQueue.delete(loadedKey);
                }
            }

            this.scheduleQueueProcessing();
        }
    }

    // --- Async Queue Processing ---

    scheduleQueueProcessing() {
        if (this.processingQueues || (this.chunksToLoadQueue.size === 0 && this.chunksToUnloadQueue.size === 0)) {
            return;
        }
        this.processingQueues = true;
        setTimeout(() => this.processNextChunkInQueue(), 0);
    }

    processNextChunkInQueue() {
        if (this.chunksToUnloadQueue.size > 0) {
            const keyToUnload = this.chunksToUnloadQueue.values().next().value;
            this.chunksToUnloadQueue.delete(keyToUnload);
            this.unloadChunk(keyToUnload);
        }
        else if (this.chunksToLoadQueue.size > 0) {
            const keyToLoad = this.chunksToLoadQueue.values().next().value;
            this.chunksToLoadQueue.delete(keyToLoad);
            const [chunkX, chunkZ] = keyToLoad.split(',').map(Number);
            this.loadChunk(chunkX, chunkZ);
        }

        if (this.chunksToLoadQueue.size > 0 || this.chunksToUnloadQueue.size > 0) {
             setTimeout(() => this.processNextChunkInQueue(), 0);
        } else {
            this.processingQueues = false;
        }
    }

    // --- Original Synchronous Load/Unload Methods ---

    loadChunk(chunkX, chunkZ) {
        const key = `${chunkX},${chunkZ}`;
        if (this.loadedChunks.has(key)) {
            logger.warn(`Attempted to load chunk ${key} which is already loaded.`);
            return;
        }
        try {
            if (!this.levelConfig) {
                const errorMsg = `Cannot load chunk ${key}, levelConfig is not set!`;
                UIManager.displayError(new Error(`[ChunkManager] ${errorMsg}`));
                logger.error(errorMsg);
                return;
            }
            const terrainMesh = createTerrainChunk(chunkX, chunkZ, this.levelConfig);
            this.scene.add(terrainMesh);

            const objectDataArray = generateObjectsForChunk(chunkX, chunkZ, this.levelConfig);
            const collectibleMeshes = [];
            const collidableMeshes = [];
            const enemies = [];
            const tumbleweeds = [];

            objectDataArray.forEach((objectData, index) => {
                const enemyTypesForLevel = this.levelConfig?.ENEMY_TYPES || [];
                if (enemyTypesForLevel.includes(objectData.type)) {
                    const enemyInstance = this.enemyManager.spawnEnemy(objectData.type, objectData, this, this.levelConfig);
                    if (enemyInstance) {
                        enemies.push(enemyInstance);
                        objectData.enemyInstance = enemyInstance;
                    } else {
                         const errorMsg = `Failed to spawn enemy instance for type ${objectData.type} in chunk ${key}`;
                         UIManager.displayError(new Error(`[ChunkManager] ${errorMsg}`));
                         logger.error(errorMsg);
                    }
                } else if (objectData.type === 'tumbleweed' && objectData.isDynamic) {
                    let tumbleweed = this.objectPoolManager.getFromPool('tumbleweeds'); // Use pool manager

                    if (!tumbleweed) {
                        tumbleweed = new Tumbleweed({
                            position: objectData.position || new THREE.Vector3(0, 0, 0),
                            scale: objectData.scale && objectData.scale.x ? objectData.scale.x : 1,
                            scene: this.scene,
                            levelConfig: this.levelConfig
                        });
                    } else {
                        // Reset pooled tumbleweed
                        if (tumbleweed.object3D) {
                            if (objectData.position) tumbleweed.object3D.position.copy(objectData.position);
                            tumbleweed.object3D.rotation.set(0, 0, 0);
                            const scale = objectData.scale && objectData.scale.x ? objectData.scale.x : 1;
                            tumbleweed.object3D.scale.set(scale, scale, scale);
                            this.scene.add(tumbleweed.object3D); // Add back to scene
                            tumbleweed.object3D.visible = true; // Make visible
                        }
                        if (typeof tumbleweed.reset === 'function') tumbleweed.reset();
                    }

                    tumbleweed.object3D.userData.chunkKey = key;
                    tumbleweed.object3D.userData.objectIndex = index;
                    tumbleweed.object3D.userData.objectType = 'tumbleweed';
                    tumbleweed.object3D.userData.gameObject = tumbleweed;
                    tumbleweed.object3D.name = `tumbleweed_${key}_${index}`;
                    tumbleweeds.push(tumbleweed);
                    this.spatialGrid.add(tumbleweed.object3D);
                    objectData.gameObject = tumbleweed;
                    objectData.mesh = tumbleweed.object3D;
                } else {
                    let mesh;
                    const poolName = objectData.collidable ? 'obstacles' : 'collectibles';
                    mesh = this.objectPoolManager.getFromPool(poolName, objectData.type); // Use pool manager

                    // Special handling for tree_pine objects
                    if (objectData.type === 'tree_pine' && mesh) {
                        let hasTrunk = false;
                        let hasFoliage = false;
                        mesh.traverse((child) => {
                            if (child.name === 'treeTrunk') hasTrunk = true;
                            if (child.name === 'treeFoliage') hasFoliage = true;
                        });
                        if (!hasTrunk || !hasFoliage) {
                            logger.warn(`Pooled tree missing parts (trunk: ${hasTrunk}, foliage: ${hasFoliage}). Creating new tree.`);
                            this.objectPoolManager.addToPool('obstacles', mesh); // Put incomplete back
                            mesh = null; // Force creation
                        }
                    }

                    if (!mesh) {
                        mesh = createObjectVisual(objectData, this.levelConfig);
                    } else {
                        // Reset pooled object
                        if (objectData.position) mesh.position.copy(objectData.position);
                        const rotationY = objectData.rotationY !== undefined ? objectData.rotationY : 0;
                        mesh.rotation.set(0, rotationY, 0);
                        const scaleX = objectData.scale?.x ?? 1;
                        const scaleY = objectData.scale?.y ?? 1;
                        const scaleZ = objectData.scale?.z ?? 1;
                        mesh.scale.set(scaleX, scaleY, scaleZ);
                        mesh.visible = true; // Make visible
                    }

                    if (mesh) {
                        mesh.userData.chunkKey = key;
                        mesh.userData.objectIndex = index;
                        mesh.userData.objectType = objectData.type;
                        mesh.name = `${objectData.type}_${key}_${index}`;
                        this.scene.add(mesh);
                        objectData.mesh = mesh;

                        if (objectData.collidable) {
                            collidableMeshes.push(mesh);
                        } else {
                            collectibleMeshes.push(mesh);
                        }
                        this.spatialGrid.add(mesh);
                    }
                }
            });

            this.loadedChunks.set(key, {
                terrainMesh: terrainMesh,
                objects: objectDataArray,
                collectibles: collectibleMeshes,
                collidables: collidableMeshes,
                enemies: enemies,
                tumbleweeds: tumbleweeds
            });

        } catch (error) {
            const errorMsg = `Error creating chunk or objects for ${key}: ${error.message}`;
            UIManager.displayError(new Error(`[ChunkManager] ${errorMsg}`));
            logger.error(errorMsg, error); // Log full error
        }
    }

    unloadChunk(key) {
        const chunkData = this.loadedChunks.get(key);
        if (chunkData) {
            // Unload Terrain Mesh
            if (chunkData.terrainMesh) {
                this.scene.remove(chunkData.terrainMesh);
                chunkData.terrainMesh.geometry?.dispose();
                // Add check to ensure material exists before checking if it's an array
                if (chunkData.terrainMesh.material) {
                    if (Array.isArray(chunkData.terrainMesh.material)) {
                        chunkData.terrainMesh.material.forEach(material => material?.dispose());
                    } else {
                        chunkData.terrainMesh.material.dispose();
                    }
                }
            }

            // Unload Non-Enemy/Non-Tumbleweed Object Visuals using object pooling
            if (chunkData.objects) {
                chunkData.objects.forEach(objectData => {
                    if (!objectData.enemyInstance && objectData.mesh && objectData.type !== 'tumbleweed') {
                        this.scene.remove(objectData.mesh);
                        this.spatialGrid.remove(objectData.mesh);
                        const poolName = objectData.collidable ? 'obstacles' : 'collectibles';
                        this.objectPoolManager.addToPool(poolName, objectData.mesh); // Use pool manager
                        objectData.mesh = null;
                    }
                });
            }

            // Unload Enemies using EnemyManager
            if (chunkData.enemies) {
                chunkData.enemies.forEach(enemyInstance => {
                    this.enemyManager.removeEnemy(enemyInstance);
                });
            }

            // Unload Tumbleweeds using object pooling
            if (chunkData.tumbleweeds) {
                chunkData.tumbleweeds.forEach(tumbleweed => {
                    this.scene.remove(tumbleweed.object3D);
                    this.spatialGrid.remove(tumbleweed.object3D);
                    this.objectPoolManager.addToPool('tumbleweeds', tumbleweed); // Use pool manager
                });
            }

            this.loadedChunks.delete(key);
        } else {
             logger.warn(`Attempted to unload chunk ${key} which was not found in loaded chunks.`);
        }
    }

    getTerrainMeshesNear(position) {
        const { chunkX: centerChunkX, chunkZ: centerChunkZ } = this.getPositionChunkCoords(position);
        const nearbyMeshes = [];
        for (let x = centerChunkX - 1; x <= centerChunkX + 1; x++) {
            for (let z = centerChunkZ - 1; z <= centerChunkZ + 1; z++) {
                const key = `${x},${z}`;
                const chunkData = this.loadedChunks.get(key);
                if (chunkData && chunkData.terrainMesh) {
                    nearbyMeshes.push(chunkData.terrainMesh);
                }
            }
        }
        return nearbyMeshes;
    }

    collectObject(chunkKey, objectIndex) {
        const chunkData = this.loadedChunks.get(chunkKey);
        if (chunkData && chunkData.objects && objectIndex >= 0 && objectIndex < chunkData.objects.length) {
            const object = chunkData.objects[objectIndex];
            if (object && !object.collidable && object.mesh && !object.collected) {
                this.spatialGrid.remove(object.mesh);
                this.scene.remove(object.mesh);
                this.objectPoolManager.addToPool('collectibles', object.mesh); // Use pool manager

                const collectibleIndex = chunkData.collectibles.indexOf(object.mesh);
                if (collectibleIndex > -1) {
                    chunkData.collectibles.splice(collectibleIndex, 1);
                } else {
                    // This warning might indicate a state inconsistency (Bug #3)
                    logger.warn(`Collected object mesh not found in collectibles list for chunk ${chunkKey}, index ${objectIndex}`);
                }

                object.mesh = null;
                object.collected = true;
                AudioManager.playCoinSound();
                return true;
            } else {
                 logger.warn(`Attempted to collect invalid, collidable, or already collected object: chunk ${chunkKey}, index ${objectIndex}`);
            }
        } else {
            logger.warn(`Attempted to collect coin with invalid chunkKey or objectIndex: chunk ${chunkKey}, index ${objectIndex}`);
        }
        return false;
    }

    async loadInitialChunks(progressCallback) {
        const startChunkX = 0;
        const startChunkZ = 0;
        const initialLoadRadius = RENDER_DISTANCE_CHUNKS;
        logger.info(`Initial load radius set to: ${initialLoadRadius} (from config)`);

        const chunksToLoadInitially = [];
        for (let x = startChunkX - initialLoadRadius; x <= startChunkX + initialLoadRadius; x++) {
            for (let z = startChunkZ - initialLoadRadius; z <= startChunkZ + initialLoadRadius; z++) {
                chunksToLoadInitially.push({ x, z });
            }
        }

        const totalChunks = chunksToLoadInitially.length;
        let loadedCount = 0;

        if (progressCallback) progressCallback(loadedCount, totalChunks);

        for (const chunkCoords of chunksToLoadInitially) {
            const key = `${chunkCoords.x},${chunkCoords.z}`;
            if (!this.loadedChunks.has(key)) {
                try {
                    this.loadChunk(chunkCoords.x, chunkCoords.z);
                } catch (error) {
                    const errorMsg = `Error during initial load of chunk ${key}: ${error.message}`;
                    UIManager.displayError(new Error(`[ChunkManager] ${errorMsg}`));
                    logger.error(errorMsg, error);
                }
            } else {
                logger.warn(`Chunk ${key} was already loaded (unexpected during initial load).`);
            }
            loadedCount++;
            if (progressCallback) progressCallback(loadedCount, totalChunks);
        }
        this.lastCameraChunkX = startChunkX;
        this.lastCameraChunkZ = startChunkZ;
    }

    clearAllChunks() {
        logger.info(`Clearing all ${this.loadedChunks.size} loaded chunks...`);
        this.chunksToLoadQueue.clear();
        this.chunksToUnloadQueue.clear();
        this.processingQueues = false;

        const keysToUnload = [...this.loadedChunks.keys()];
        keysToUnload.forEach(key => {
            this.unloadChunk(key);
        });

        this.lastCameraChunkX = null;
        this.lastCameraChunkZ = null;

        if (this.loadedChunks.size > 0) {
            // This warning might indicate a state inconsistency (Bug #3)
            logger.warn(`loadedChunks map not empty after clearAllChunks. Size: ${this.loadedChunks.size}`);
            this.loadedChunks.clear();
        }
        // Clear pools when clearing all chunks
        this.objectPoolManager.clearPools();
        logger.info("All chunks and pools cleared.");
    }

    updateCollectibles(deltaTime, elapsedTime, playerPosition, playerPowerup) {
        if (!this.levelConfig || !this.levelConfig.COIN_VISUALS) return;
        const spinSpeed = this.levelConfig.COIN_VISUALS.spinSpeed || 1.0;
        const magnetActive = playerPowerup === 'magnet';
        const magnetRadius = 80;
        const magnetForce = 150;

        // Debug logging reduced frequency
        // if (Math.floor(elapsedTime) % 5 === 0 && Math.floor(elapsedTime * 10) % 10 === 0) {

        for (const [key, chunkData] of this.loadedChunks.entries()) {
            if (chunkData.collectibles && chunkData.collectibles.length > 0) {
                for (let i = chunkData.collectibles.length - 1; i >= 0; i--) {
                    const collectibleMesh = chunkData.collectibles[i];
                    if (!collectibleMesh) continue;

                    // Ensure objectType exists and fix if necessary (Bug #4 related)
                    if (!collectibleMesh.userData.objectType) {
                         if (collectibleMesh.geometry?.type === 'CylinderGeometry') {
                             collectibleMesh.userData.objectType = 'coin';
                             logger.warn('[ChunkManager] Fixed missing objectType for coin');
                         } else {
                             logger.warn('[ChunkManager] Collectible missing objectType:', collectibleMesh);
                             collectibleMesh.userData.objectType = 'unknown_collectible';
                         }
                     }

                    // Rotate coins and magnets
                    if (collectibleMesh.userData.objectType === 'coin' || collectibleMesh.userData.objectType === 'magnet') {
                        collectibleMesh.rotation.y += spinSpeed * deltaTime;
                    }

                    // Apply magnet effect ONLY to coins
                    if (magnetActive && playerPosition && collectibleMesh.userData.objectType === 'coin') {
                        const dx = playerPosition.x - collectibleMesh.position.x;
                        const dy = playerPosition.y - collectibleMesh.position.y;
                        const dz = playerPosition.z - collectibleMesh.position.z;
                        const distanceSq = dx * dx + dy * dy + dz * dz;

                        if (distanceSq < magnetRadius * magnetRadius) {
                            const distance = Math.sqrt(distanceSq);
                            const dirX = dx / distance;
                            const dirY = dy / distance;
                            const dirZ = dz / distance;

                            const normalizedDist = distance / magnetRadius;
                            const acceleration = Math.pow(1 - normalizedDist, 4.0);
                            const moveSpeed = magnetForce * acceleration * deltaTime;

                            const newX = collectibleMesh.position.x + dirX * moveSpeed;
                            const newY = collectibleMesh.position.y + dirY * moveSpeed;
                            const newZ = collectibleMesh.position.z + dirZ * moveSpeed;

                            const newDx = playerPosition.x - newX;
                            const newDy = playerPosition.y - newY;
                            const newDz = playerPosition.z - newZ;
                            const newDistanceSq = newDx * newDx + newDy * newDy + newDz * newDz;

                            const coinCollisionRadius = collectibleMesh.geometry?.parameters?.radiusBottom ?? 0.5;
                            const collectionThresholdSq = (playerCollisionRadius + coinCollisionRadius * 1.5) ** 2;
                            const minSafeDistanceSq = (playerCollisionRadius * 0.1) ** 2;

                            const wouldPassThreshold =
                                (distanceSq > collectionThresholdSq && newDistanceSq < collectionThresholdSq) ||
                                (newDistanceSq < minSafeDistanceSq);

                            if (wouldPassThreshold) {
                                const { chunkKey, objectIndex, scoreValue } = collectibleMesh.userData;
                                if (chunkKey !== undefined && objectIndex !== undefined) {
                                    const collected = this.collectObject(chunkKey, objectIndex);
                                    if (collected) {
                                        eventBus.emit('scoreChanged', scoreValue || 10);
                                        // Since we modified the array while iterating, break/continue might be safer
                                        // However, iterating backwards handles splice correctly.
                                    }
                                }
                            } else if (newDistanceSq > minSafeDistanceSq) {
                                collectibleMesh.position.set(newX, newY, newZ);
                            } else {
                                // Move to safe distance boundary
                                const safeDistance = Math.sqrt(minSafeDistanceSq);
                                const safeFactor = safeDistance / Math.sqrt(newDistanceSq);
                                collectibleMesh.position.x = playerPosition.x - newDx * safeFactor;
                                collectibleMesh.position.y = playerPosition.y - newDy * safeFactor;
                                collectibleMesh.position.z = playerPosition.z - newDz * safeFactor;
                            }
                        }
                    }
                }
            }
        }
    }


    updateTumbleweeds(deltaTime, elapsedTime, playerPosition) {
        for (const [key, chunkData] of this.loadedChunks.entries()) {
            if (chunkData.tumbleweeds && chunkData.tumbleweeds.length > 0) {
                chunkData.tumbleweeds.forEach(tumbleweed => {
                    if (tumbleweed) {
                        tumbleweed.update(deltaTime, elapsedTime, playerPosition);
                        this.spatialGrid.update(tumbleweed.object3D);
                    }
                });
            }
        }
    }

    // --- Object Pooling Methods Removed ---
}