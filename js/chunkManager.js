// js/chunkManager.js
import * as THREE from 'three'; // Keep existing import
import * as UIManager from './uiManager.js'; // Import UI Manager for error display
// Removed duplicate import of THREE
import { createTerrainChunk } from './terrainGenerator.js';
import { generateObjectsForChunk, createObjectVisual, disposeObjectVisual } from './objectGenerator.js'; // Import visual creator and disposer
import Tumbleweed from './gameObjects/Tumbleweed.js'; // Import Tumbleweed GameObject
import { EnemyManager } from './enemyManager.js'; // Import EnemyManager
import * as AudioManager from './audioManager.js';
import * as AssetManager from './assetManager.js'; // Import AssetManager
import {
    CHUNK_SIZE,
    RENDER_DISTANCE_CHUNKS,
    RENDERING,
    performanceManager,
    PLAYER_TORSO_WIDTH
    // Global config constants
} from './config.js'; // Renamed to GlobalConfig implicitly by usage below

// Collision constants
const playerCollisionRadius = PLAYER_TORSO_WIDTH; // Same as in collisionManager.js

// --- Shared Object Resources moved to assetManager.js ---

export class ChunkManager {
    constructor(scene, enemyManager, spatialGrid, initialLevelConfig = null) { // Added initialLevelConfig
        if (!scene || !enemyManager || !spatialGrid) {
            throw new Error("ChunkManager requires scene, EnemyManager, and SpatialGrid instances!");
        }
        this.levelConfig = initialLevelConfig; // Store level config
        this.scene = scene;
        this.enemyManager = enemyManager; // Store enemyManager
        this.spatialGrid = spatialGrid; // Store spatialGrid
        this.chunkSize = CHUNK_SIZE; // Use imported constant
        this.renderDistance = RENDER_DISTANCE_CHUNKS; // Use imported constant
        // Stores loaded chunks, key: "x,z", value: {
        //   terrainMesh: Mesh,
        //   objects: Array<ObjectData>, // Raw data from generator
        //   collectibles: Array<Mesh>, // Active coin meshes
        //   collidables: Array<Mesh>,  // Active obstacle meshes (non-enemy)
        //   enemies: Array<Enemy>      // Active enemy instances
        // }
        this.loadedChunks = new Map();
        this.lastCameraChunkX = null;
        this.lastCameraChunkZ = null;

        // --- Object Pooling ---
        this.objectPools = {
            collectibles: [],  // Pool of inactive collectible meshes
            obstacles: [],    // Pool of inactive obstacle meshes
            tumbleweeds: []   // Pool of inactive tumbleweed instances
        };

        // --- Async Loading Queues ---
        this.chunksToLoadQueue = new Set(); // Set of chunk keys "x,z" to load
        this.chunksToUnloadQueue = new Set(); // Set of chunk keys "x,z" to unload
        this.processingQueues = false; // Flag to prevent concurrent processing runs
    }

    /**
     * Sets the level configuration to be used for generating new chunks.
     * @param {object} config - The level configuration object.
     */
    setLevelConfig(config) {
        console.log("[ChunkManager] Setting level config.");
        this.levelConfig = config;
    }

    // Calculates the chunk coordinates a position (camera or player) is currently in
    getCameraChunkCoords(cameraPosition) {
        const chunkX = Math.floor(cameraPosition.x / this.chunkSize);
        const chunkZ = Math.floor(cameraPosition.z / this.chunkSize);
        return { chunkX, chunkZ };
    }

    // Main update function, called every frame
    update(cameraPosition) {
        const { chunkX: currentChunkX, chunkZ: currentChunkZ } = this.getCameraChunkCoords(cameraPosition);

        // Only update chunks if the target position has moved to a new chunk OR it's the first update
        if (currentChunkX !== this.lastCameraChunkX || currentChunkZ !== this.lastCameraChunkZ || this.lastCameraChunkX === null) {
            this.lastCameraChunkX = currentChunkX;
            this.lastCameraChunkZ = currentChunkZ;

            const chunksToLoad = new Set();
            const currentlyLoadedKeys = new Set(this.loadedChunks.keys());

            // Determine which chunks should be visible
            for (let x = currentChunkX - this.renderDistance; x <= currentChunkX + this.renderDistance; x++) {
                for (let z = currentChunkZ - this.renderDistance; z <= currentChunkZ + this.renderDistance; z++) {
                    const key = `${x},${z}`;
                    chunksToLoad.add(key);

                    // If chunk is not already loaded AND not already queued for loading, queue it
                    if (!this.loadedChunks.has(key) && !this.chunksToLoadQueue.has(key)) {
                        // // console.log(`[DEBUG] Queuing chunk ${key} for loading.`); // Optional log
                        this.chunksToLoadQueue.add(key);
                        // If it was previously queued for unload, remove it from that queue
                        this.chunksToUnloadQueue.delete(key);
                    }
                }
            }

            // Determine which chunks to unload
            for (const loadedKey of currentlyLoadedKeys) {
                // If a loaded chunk is no longer needed AND not already queued for unload, queue it
                if (!chunksToLoad.has(loadedKey) && !this.chunksToUnloadQueue.has(loadedKey)) {
                    // // console.log(`[DEBUG] Queuing chunk ${loadedKey} for unloading.`); // Optional log
                    this.chunksToUnloadQueue.add(loadedKey);
                    // If it was previously queued for load, remove it from that queue
                    this.chunksToLoadQueue.delete(loadedKey);
                }
            }

            // Start processing the queues if not already doing so
            this.scheduleQueueProcessing();
        }
    }

    // --- Async Queue Processing ---

    scheduleQueueProcessing() {
        // If already processing or both queues are empty, do nothing
        if (this.processingQueues || (this.chunksToLoadQueue.size === 0 && this.chunksToUnloadQueue.size === 0)) {
            return;
        }
        this.processingQueues = true;
        // Use setTimeout to run the processing slightly after the current frame/task
        // A delay of 0ms is often enough to yield the main thread
        setTimeout(() => this.processNextChunkInQueue(), 0);
    }

    processNextChunkInQueue() {
        // Prioritize unloading
        if (this.chunksToUnloadQueue.size > 0) {
            const keyToUnload = this.chunksToUnloadQueue.values().next().value; // Get first key
            this.chunksToUnloadQueue.delete(keyToUnload);
            // // console.log(`[DEBUG ASYNC] Processing UNLOAD for ${keyToUnload}`);
            this.unloadChunk(keyToUnload); // Call the original synchronous unload
        }
        // Then handle loading
        else if (this.chunksToLoadQueue.size > 0) {
            const keyToLoad = this.chunksToLoadQueue.values().next().value; // Get first key
            this.chunksToLoadQueue.delete(keyToLoad);
            // // console.log(`[DEBUG ASYNC] Processing LOAD for ${keyToLoad}`);
            const [chunkX, chunkZ] = keyToLoad.split(',').map(Number);
            this.loadChunk(chunkX, chunkZ); // Call the original synchronous load
        }

        // If there are more chunks in either queue, schedule the next processing step
        if (this.chunksToLoadQueue.size > 0 || this.chunksToUnloadQueue.size > 0) {
            // Schedule the next run immediately after this one completes
             setTimeout(() => this.processNextChunkInQueue(), 0);
        } else {
            // No more chunks to process, reset the flag
            // // console.log("[DEBUG ASYNC] Chunk queues empty. Stopping processing.");
            this.processingQueues = false;
        }
    }

    // --- Original Synchronous Load/Unload Methods ---
    // (These are now called by processNextChunkInQueue)

    // Loads a specific chunk
    loadChunk(chunkX, chunkZ) {
        const key = `${chunkX},${chunkZ}`;
        if (this.loadedChunks.has(key)) {
            // console.warn(`Attempted to load chunk ${key} which is already loaded.`); // Keep warning
            return;
        }
        try {
            if (!this.levelConfig) {
                // Display error if levelConfig is missing during chunk load
                UIManager.displayError(new Error(`[ChunkManager] Cannot load chunk ${key}, levelConfig is not set!`));
                return;
            }
            const terrainMesh = createTerrainChunk(chunkX, chunkZ, this.levelConfig); // Pass levelConfig
            this.scene.add(terrainMesh);

            // Generate data for all objects in this chunk
            const objectDataArray = generateObjectsForChunk(chunkX, chunkZ, this.levelConfig); // Pass levelConfig
            const collectibleMeshes = [];
            const collidableMeshes = []; // Only non-enemy collidables
            const enemies = []; // Store enemy instances for this chunk
            const tumbleweeds = []; // Store tumbleweed instances

            // Create meshes/instances for all generated objects
            objectDataArray.forEach((objectData, index) => {
                // Check if the object type is defined as an enemy in the current level config
                const enemyTypesForLevel = this.levelConfig?.ENEMY_TYPES || [];
                if (enemyTypesForLevel.includes(objectData.type)) {
                    // Pass levelConfig to spawnEnemy
                    const enemyInstance = this.enemyManager.spawnEnemy(objectData.type, objectData, this, this.levelConfig);
                    if (enemyInstance) {
                        enemies.push(enemyInstance);
                        objectData.enemyInstance = enemyInstance; // Store instance ref in raw data
                    } else {
                         // Display error if enemy spawning fails
                         UIManager.displayError(new Error(`[ChunkManager] Failed to spawn enemy instance for type ${objectData.type} in chunk ${key}`));
                    }
                } else if (objectData.type === 'tumbleweed' && objectData.isDynamic) {
                    // Try to get a tumbleweed from the pool first
                    let tumbleweed = this._getFromPool('tumbleweeds');

                    if (!tumbleweed) {
                        // Create new tumbleweed if none in pool
                        tumbleweed = new Tumbleweed({
                            position: objectData.position || new THREE.Vector3(0, 0, 0),
                            scale: objectData.scale && objectData.scale.x ? objectData.scale.x : 1, // Use uniform scale with fallback
                            scene: this.scene,
                            levelConfig: this.levelConfig
                        });
                    } else {
                        // Reset pooled tumbleweed
                        if (tumbleweed.object3D) {
                            if (objectData.position) {
                                tumbleweed.object3D.position.copy(objectData.position);
                            }
                            tumbleweed.object3D.rotation.set(0, 0, 0);
                            const scale = objectData.scale && objectData.scale.x ? objectData.scale.x : 1;
                            tumbleweed.object3D.scale.set(scale, scale, scale);
                            this.scene.add(tumbleweed.object3D);
                        }
                        if (typeof tumbleweed.reset === 'function') {
                            tumbleweed.reset(); // Reset internal state if method exists
                        }
                    }

                    // Add to scene and store references
                    tumbleweed.object3D.userData.chunkKey = key;
                    tumbleweed.object3D.userData.objectIndex = index;
                    tumbleweed.object3D.userData.objectType = 'tumbleweed';
                    tumbleweed.object3D.userData.gameObject = tumbleweed;
                    tumbleweed.object3D.name = `tumbleweed_${key}_${index}`;

                    // Store in tumbleweeds array
                    tumbleweeds.push(tumbleweed);

                    // Add to spatial grid for collision detection
                    this.spatialGrid.add(tumbleweed.object3D);

                    // Store reference in object data
                    objectData.gameObject = tumbleweed;
                    objectData.mesh = tumbleweed.object3D; // For compatibility with existing code
                } else {
                    // For non-enemies and non-tumbleweeds, use object pooling if available
                    let mesh;

                    // Check if we can reuse an object from the pool
                    if (objectData.collidable) {
                        // Try to get an obstacle from the pool
                        mesh = this._getFromPool('obstacles', objectData.type);
                    } else {
                        // Try to get a collectible from the pool
                        mesh = this._getFromPool('collectibles', objectData.type);
                    }

                    // If no pooled object available, create a new one
                    if (!mesh) {
                        mesh = createObjectVisual(objectData, this.levelConfig);
                    } else {
                        // Reset/update the pooled object
                        if (objectData.position) mesh.position.copy(objectData.position);

                        // Handle rotation safely
                        const rotationY = objectData.rotation && objectData.rotation.y ? objectData.rotation.y : 0;
                        mesh.rotation.set(0, rotationY, 0);

                        // Handle scale safely
                        const scaleX = objectData.scale && objectData.scale.x ? objectData.scale.x : 1;
                        const scaleY = objectData.scale && objectData.scale.y ? objectData.scale.y : 1;
                        const scaleZ = objectData.scale && objectData.scale.z ? objectData.scale.z : 1;
                        mesh.scale.set(scaleX, scaleY, scaleZ);
                        mesh.visible = true;
                    }

                    if (mesh) {
                        // Add chunk-specific info to userData
                        mesh.userData.chunkKey = key;
                        mesh.userData.objectIndex = index;
                        mesh.userData.objectType = objectData.type; // Store type for pooling
                        mesh.name = `${objectData.type}_${key}_${index}`; // More specific name

                        this.scene.add(mesh);
                        objectData.mesh = mesh; // Store mesh reference back in the raw data

                        // Add mesh to appropriate list and spatial grid
                        if (objectData.collidable) {
                            collidableMeshes.push(mesh);
                            this.spatialGrid.add(mesh);
                        } else {
                            collectibleMeshes.push(mesh);
                            this.spatialGrid.add(mesh);
                        }
                    }
                }
            });

            // Store terrain mesh, object data, and categorized lists
            this.loadedChunks.set(key, {
                terrainMesh: terrainMesh,
                objects: objectDataArray, // Store raw data (includes enemy data with instance refs)
                collectibles: collectibleMeshes, // Store active collectible meshes
                collidables: collidableMeshes,   // Store active non-enemy collidable meshes
                enemies: enemies,                // Store active enemy instances
                tumbleweeds: tumbleweeds         // Store active tumbleweed instances
            });
            // console.log(`[DEBUG] Chunk ${key}: Added terrain, ${collectibleMeshes.length} collectibles, ${collidableMeshes.length} obstacles, ${enemies.length} enemies.`);

        } catch (error) {
            // Display error for general chunk creation failures
            UIManager.displayError(new Error(`Error creating chunk or objects for ${key}: ${error.message}`));
            console.error(`Error creating chunk or objects for ${key}:`, error); // Keep console log for details
        }
    }

    // Unloads a specific chunk
    unloadChunk(key) {
        const chunkData = this.loadedChunks.get(key);
        if (chunkData) {

            // Unload Terrain Mesh
            if (chunkData.terrainMesh) {
                this.scene.remove(chunkData.terrainMesh);
                if (chunkData.terrainMesh.geometry) {
                    chunkData.terrainMesh.geometry.dispose();
                }
                if (chunkData.terrainMesh.material) {
                     if (Array.isArray(chunkData.terrainMesh.material)) {
                        chunkData.terrainMesh.material.forEach(material => material.dispose());
                     } else {
                        chunkData.terrainMesh.material.dispose();
                     }
                }
                // console.log(`Disposed terrain resources for chunk ${key}`); // Removed duplicate log
            }

            // Unload All Non-Enemy Object Visuals using object pooling
            let disposedVisuals = 0;
            if (chunkData.objects) {
                chunkData.objects.forEach(objectData => {
                    // Handle pooling for non-enemy objects
                    if (!objectData.enemyInstance && objectData.mesh) {
                        // Remove from scene and spatial grid
                        this.scene.remove(objectData.mesh);
                        this.spatialGrid.remove(objectData.mesh);

                        // Add to appropriate pool instead of disposing
                        if (objectData.mesh.userData.objectType === 'coin') {
                            this._addToPool('collectibles', objectData.mesh);
                        } else if (objectData.collidable) {
                            this._addToPool('obstacles', objectData.mesh);
                        } else {
                            // For any other types, dispose normally
                            disposeObjectVisual(objectData, this.scene, this.spatialGrid, this.levelConfig);
                        }

                        // Clear reference in object data
                        objectData.mesh = null;
                        disposedVisuals++;
                    }
                });
                // console.log(`[DEBUG] Processed ${disposedVisuals} non-enemy objects in chunk ${key}.`);
            }

            // Unload Enemies using EnemyManager
            let unloadedEnemies = 0;
            if (chunkData.enemies) {
                chunkData.enemies.forEach(enemyInstance => {
                    this.enemyManager.removeEnemy(enemyInstance); // Manager handles scene removal
                    unloadedEnemies++;
                });
                // console.log(`[DEBUG] Removed ${unloadedEnemies} enemies for chunk ${key}`);
            }

            // Unload Tumbleweeds with pooling
            let unloadedTumbleweeds = 0;
            if (chunkData.tumbleweeds) {
                chunkData.tumbleweeds.forEach(tumbleweed => {
                    // Remove from scene and spatial grid
                    this.scene.remove(tumbleweed.object3D);
                    this.spatialGrid.remove(tumbleweed.object3D);

                    // Add to pool instead of disposing
                    this._addToPool('tumbleweeds', tumbleweed);

                    unloadedTumbleweeds++;
                });
                // console.log(`[DEBUG] Unloaded ${unloadedTumbleweeds} tumbleweeds from chunk ${key}.`);
            }

            // Clear local references (collectibles/collidables/enemies arrays are part of chunkData)
            this.loadedChunks.delete(key);
            // console.log(`[DEBUG] Chunk ${key} unloaded and data removed.`);
        } else {
             console.warn(`Attempted to unload chunk ${key} which was not found in loaded chunks.`); // Keep warning
        }
    }

    /**
     * Gets the terrain chunk meshes near a given world position.
     * Typically includes the chunk the position is in and its 8 neighbors.
     * @param {THREE.Vector3} position - The world position to check around.
     * @returns {THREE.Mesh[]} An array of terrain meshes near the position.
     */
    getTerrainMeshesNear(position) {
        const { chunkX: centerChunkX, chunkZ: centerChunkZ } = this.getCameraChunkCoords(position); // Use same logic to find center chunk
        const nearbyMeshes = [];

        // Check the 3x3 grid of chunks around the center chunk
        for (let x = centerChunkX - 1; x <= centerChunkX + 1; x++) {
            for (let z = centerChunkZ - 1; z <= centerChunkZ + 1; z++) {
                const key = `${x},${z}`;
                const chunkData = this.loadedChunks.get(key); // Get the chunk data object
                // Ensure chunkData exists and has a terrainMesh before pushing
                if (chunkData && chunkData.terrainMesh) {
                    nearbyMeshes.push(chunkData.terrainMesh); // Push only the mesh
                }
            }
        }
        // // console.log(`Found ${nearbyMeshes.length} nearby meshes for position ${position.x.toFixed(1)}, ${position.z.toFixed(1)}`);
        return nearbyMeshes;
    }



    /**
     * Handles the collection of a collectible object (currently only coins).
     * Removes the mesh from the scene and the chunk's collectibles list, marks it as collected in the raw data.
     * @param {string} chunkKey - The key ("x,z") of the chunk containing the object.
     * @param {number} objectIndex - The index of the object within the chunk's raw `objects` array.
     * @returns {boolean} True if the object was successfully collected, false otherwise.
     */
    collectObject(chunkKey, objectIndex) {
        const chunkData = this.loadedChunks.get(chunkKey);
        // Check if chunk and object index are valid
        if (chunkData && chunkData.objects && objectIndex >= 0 && objectIndex < chunkData.objects.length) {
            const object = chunkData.objects[objectIndex];

            // Check if it's a collectible (not collidable), has a mesh, and isn't already collected
            if (object && !object.collidable && object.mesh && !object.collected) {
                // console.log(`Collecting ${object.type} ${objectIndex} in chunk ${chunkKey}`);

                // Remove from spatial grid
                this.spatialGrid.remove(object.mesh);

                // Remove from scene
                this.scene.remove(object.mesh);

                // Add to object pool instead of disposing
                this._addToPool('collectibles', object.mesh);

                // Remove from the chunk's active collectibles list
                const collectibleIndex = chunkData.collectibles.indexOf(object.mesh);
                if (collectibleIndex > -1) {
                    chunkData.collectibles.splice(collectibleIndex, 1);
                } else {
                    console.warn(`[WARN] Collected object mesh not found in collectibles list for chunk ${chunkKey}, index ${objectIndex}`);
                }

                // Mark as collected in raw data and remove mesh reference
                object.mesh = null;
                object.collected = true;

                // Play sound
                AudioManager.playCoinSound();

                return true;
            } else {
                 console.warn(`[WARN] Attempted to collect invalid, collidable, or already collected object: chunk ${chunkKey}, index ${objectIndex}`);
            }
        } else {
            console.warn(`[WARN] Attempted to collect coin with invalid chunkKey or coinIndex: chunk ${chunkKey}, index ${coinIndex}`);
        }
        return false;
    }

    /**
     * Asynchronously loads the initial set of chunks required before the game starts.
     * Reports progress via a callback function.
     * @param {function(number, number): void} progressCallback - Function called with (loadedCount, totalCount).
     * @returns {Promise<void>} A promise that resolves when initial loading is complete.
     */
    async loadInitialChunks(progressCallback) {
        const startChunkX = 0; // Assuming player starts near 0,0
        const startChunkZ = 0;
        // Use the configured render distance for the initial load radius
        const initialLoadRadius = RENDER_DISTANCE_CHUNKS;
        // console.log(`[ChunkManager] Initial load radius set to: ${initialLoadRadius} (from config)`);

        const chunksToLoadInitially = [];
        for (let x = startChunkX - initialLoadRadius; x <= startChunkX + initialLoadRadius; x++) {
            for (let z = startChunkZ - initialLoadRadius; z <= startChunkZ + initialLoadRadius; z++) {
                chunksToLoadInitially.push({ x, z });
            }
        }

        const totalChunks = chunksToLoadInitially.length;
        let loadedCount = 0;

        // Report initial progress (0%)
        if (progressCallback) {
            progressCallback(loadedCount, totalChunks);
        }

        // Load chunks one by one (can be parallelized later if needed)
        for (const chunkCoords of chunksToLoadInitially) {
            const key = `${chunkCoords.x},${chunkCoords.z}`;
            if (!this.loadedChunks.has(key)) {
                try {
                    // Use the existing synchronous loadChunk method within this async flow
                    this.loadChunk(chunkCoords.x, chunkCoords.z);
                    // console.log(`[ChunkManager] Initial load successful for chunk ${key}`);
                } catch (error) {
                    // Display error for initial chunk load failures
                    UIManager.displayError(new Error(`[ChunkManager] Error during initial load of chunk ${key}: ${error.message}`));
                    console.error(`[ChunkManager] Error during initial load of chunk ${key}:`, error); // Keep console log for details
                    // Decide how to handle errors - continue loading others?
                }
            } else {
                // console.log(`[ChunkManager] Chunk ${key} was already loaded (unexpected during initial load).`);
            }

            loadedCount++;
            // Report progress after each chunk attempt
            if (progressCallback) {
                progressCallback(loadedCount, totalChunks);
            }

            // Optional: Add a small delay to allow the main thread to update the UI
            // await new Promise(resolve => setTimeout(resolve, 10)); // e.g., 10ms delay
        }
// Set the last camera chunk coords based on the initial load center
        // to prevent immediate unloading/reloading in the first update frame.
        this.lastCameraChunkX = startChunkX;
        this.lastCameraChunkZ = startChunkZ;
    }

    /**
     * Clears all currently loaded chunks from the scene and internal state.
     * Used during level transitions.
     */
    clearAllChunks() {
        console.log(`[ChunkManager] Clearing all ${this.loadedChunks.size} loaded chunks...`);
        // Cancel any pending load/unload operations
        this.chunksToLoadQueue.clear();
        this.chunksToUnloadQueue.clear();
        this.processingQueues = false; // Stop queue processing

        // Unload all currently loaded chunks
        const keysToUnload = [...this.loadedChunks.keys()];
        keysToUnload.forEach(key => {
            this.unloadChunk(key); // Use existing synchronous unload logic
        });

        // Reset state
        this.lastCameraChunkX = null;
        this.lastCameraChunkZ = null;

        if (this.loadedChunks.size > 0) {
            console.warn(`[ChunkManager] loadedChunks map not empty after clearAllChunks. Size: ${this.loadedChunks.size}`);
            this.loadedChunks.clear(); // Force clear if needed
        }
        console.log("[ChunkManager] All chunks cleared.");
    }

    /**
     * Updates all collectibles in loaded chunks to make them spin and move toward player if magnet powerup is active.
     * @param {number} deltaTime - Time since last update in seconds.
     * @param {number} elapsedTime - Total elapsed time in seconds.
     * @param {THREE.Vector3} playerPosition - Current player position.
     * @param {string} playerPowerup - Current player powerup.
     */
    updateCollectibles(deltaTime, elapsedTime, playerPosition, playerPowerup) {
        if (!this.levelConfig || !this.levelConfig.COIN_VISUALS) return;

        // Get the spin speed from level config
        const spinSpeed = this.levelConfig.COIN_VISUALS.spinSpeed || 1.0;

        // Check if magnet powerup is active
        const magnetActive = playerPowerup === 'magnet';

        // Debug magnet status once per second
        if (Math.floor(elapsedTime) % 5 === 0 && Math.floor(elapsedTime * 10) % 10 === 0) {
            console.log(`[ChunkManager] Magnet active: ${magnetActive}, Powerup: ${playerPowerup}`);
        }

        // Magnet effect parameters
        const magnetRadius = 60; // Radius within which coins are attracted (increased further)
        const magnetForce = 80; // Force of attraction (significantly increased for faster movement)

        // Debug coin count and collectible types every 5 seconds
        if (Math.floor(elapsedTime) % 5 === 0 && Math.floor(elapsedTime * 10) % 10 === 0) {
            let totalCoins = 0;
            let coinsWithType = 0;
            let otherCollectibles = {};

            for (const [key, chunkData] of this.loadedChunks.entries()) {
                if (chunkData.collectibles) {
                    totalCoins += chunkData.collectibles.length;
                    chunkData.collectibles.forEach(mesh => {
                        if (mesh?.userData?.objectType === 'coin') {
                            coinsWithType++;
                        } else if (mesh?.userData?.objectType) {
                            // Count other collectible types
                            const type = mesh.userData.objectType;
                            otherCollectibles[type] = (otherCollectibles[type] || 0) + 1;
                        }
                    });
                }
            }

            console.log(`[ChunkManager] Total collectibles: ${totalCoins}, Coins with correct type: ${coinsWithType}`);
            if (Object.keys(otherCollectibles).length > 0) {
                console.log(`[ChunkManager] Other collectible types:`, otherCollectibles);
            }
        }

        // Iterate through all loaded chunks
        for (const [key, chunkData] of this.loadedChunks.entries()) {
            // Update all collectible coins in this chunk
            if (chunkData.collectibles && chunkData.collectibles.length > 0) {
                chunkData.collectibles.forEach(collectibleMesh => {
                    // First, ensure all collectibles have the correct objectType
                    if (collectibleMesh?.userData?.collidable === false) {
                        // If objectType is missing but it's a coin (has cylinder geometry), set it
                        if (!collectibleMesh.userData.objectType) {
                            if (collectibleMesh.geometry?.type === 'CylinderGeometry') {
                                collectibleMesh.userData.objectType = 'coin';
                                console.log('[ChunkManager] Fixed missing objectType for coin');
                            } else {
                                // For any other collectible with missing type, log a warning
                                console.warn('[ChunkManager] Collectible missing objectType:', collectibleMesh);
                                // Set a default type to prevent future warnings
                                collectibleMesh.userData.objectType = 'unknown_collectible';
                            }
                        }

                        // Only rotate coins and magnets, not other objects that might be incorrectly marked as collectible
                        if (collectibleMesh.userData.objectType === 'coin' || collectibleMesh.userData.objectType === 'magnet') {
                            // Rotate collectibles around Y axis
                            collectibleMesh.rotation.y += spinSpeed * deltaTime;
                        } else {
                            // Log warning for non-coin/magnet objects in collectibles array
                            if (Math.random() < 0.001) { // Limit logging frequency
                                console.warn(`[ChunkManager] Non-collectible object in collectibles array: ${collectibleMesh.userData.objectType}`);
                            }
                        }

                        // Apply magnet effect if active - ONLY to coins, not other collectibles like magnets
                        if (magnetActive && playerPosition && collectibleMesh.userData.objectType === 'coin') {
                            // Calculate distance to player
                            const dx = playerPosition.x - collectibleMesh.position.x;
                            const dy = playerPosition.y - collectibleMesh.position.y;
                            const dz = playerPosition.z - collectibleMesh.position.z;
                            const distanceSq = dx * dx + dy * dy + dz * dz;

                            // If within magnet radius, move toward player
                            if (distanceSq < magnetRadius * magnetRadius) {
                                // Calculate direction to player
                                const distance = Math.sqrt(distanceSq);
                                const dirX = dx / distance;
                                const dirY = dy / distance;
                                const dirZ = dz / distance;

                                // Move coin toward player with exponential acceleration based on distance
                                // Coins closer to the player move MUCH faster (exponential curve)
                                const normalizedDist = distance / magnetRadius; // 0 to 1 value
                                // Use a power curve for stronger acceleration as coins get closer
                                // This creates an exponential increase in speed as coins approach the player
                                const acceleration = Math.pow(1 - normalizedDist, 2.5); // Exponential curve
                                const moveSpeed = magnetForce * acceleration * deltaTime;

                                // Debug coin movement occasionally
                                if (Math.random() < 0.001) {
                                    console.log(`[ChunkManager] Moving coin: distance=${distance.toFixed(2)}, speed=${moveSpeed.toFixed(2)}`);
                                }

                                // Calculate the new position
                                const newX = collectibleMesh.position.x + dirX * moveSpeed;
                                const newY = collectibleMesh.position.y + dirY * moveSpeed;
                                const newZ = collectibleMesh.position.z + dirZ * moveSpeed;

                                // Calculate the new distance to player after this movement
                                const newDx = playerPosition.x - newX;
                                const newDy = playerPosition.y - newY;
                                const newDz = playerPosition.z - newZ;
                                const newDistanceSq = newDx * newDx + newDy * newDy + newDz * newDz;

                                // Safety check: Don't move the coin if it would end up too close to the player
                                // This prevents coins from getting stuck inside the player model
                                // Use a smaller safe distance to ensure coins can be collected
                                // The value must be smaller than the collection threshold in collisionManager.js
                                const coinCollisionRadius = collectibleMesh.geometry.parameters.radiusBottom;
                                const minSafeDistanceSq = (playerCollisionRadius * 0.2) ** 2;

                                if (newDistanceSq > minSafeDistanceSq) {
                                    // Only update position if it won't get too close
                                    collectibleMesh.position.x = newX;
                                    collectibleMesh.position.y = newY;
                                    collectibleMesh.position.z = newZ;

                                    // Debug logging for coins that are very close but not at safe distance
                                    if (newDistanceSq < (playerCollisionRadius * 0.5) ** 2 && Math.random() < 0.05) {
                                        console.log(`[ChunkManager] Coin approaching player: distance=${Math.sqrt(newDistanceSq).toFixed(2)}, safeDistance=${Math.sqrt(minSafeDistanceSq).toFixed(2)}`);
                                    }
                                } else {
                                    // If it would get too close, move it to the safe distance boundary
                                    // This ensures coins don't get stuck inside the player
                                    const safeDistance = Math.sqrt(minSafeDistanceSq);
                                    const safeFactor = safeDistance / Math.sqrt(newDistanceSq);
                                    collectibleMesh.position.x = playerPosition.x - newDx * safeFactor;
                                    collectibleMesh.position.y = playerPosition.y - newDy * safeFactor;
                                    collectibleMesh.position.z = playerPosition.z - newDz * safeFactor;

                                    // Debug logging for coins at safe distance
                                    if (Math.random() < 0.05) {
                                        console.log(`[ChunkManager] Coin at safe distance: ${safeDistance.toFixed(2)}`);
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    /**
     * Updates all tumbleweeds in loaded chunks.
     * @param {number} deltaTime - Time since last update in seconds.
     * @param {number} elapsedTime - Total elapsed time in seconds.
     * @param {THREE.Vector3} playerPosition - Current player position.
     */
    updateTumbleweeds(deltaTime, elapsedTime, playerPosition) {
        // Iterate through all loaded chunks
        for (const [key, chunkData] of this.loadedChunks.entries()) {
            // Update all tumbleweeds in this chunk
            if (chunkData.tumbleweeds && chunkData.tumbleweeds.length > 0) {
                chunkData.tumbleweeds.forEach(tumbleweed => {
                    if (tumbleweed) {
                        // Update the tumbleweed GameObject
                        tumbleweed.update(deltaTime, elapsedTime, playerPosition);

                        // Update spatial grid position
                        this.spatialGrid.update(tumbleweed.object3D);
                    }
                });
            }
        }
    }

    /**
     * Gets an object from the specified pool.
     * @param {string} poolName - The name of the pool to get from.
     * @param {string} objectType - Optional object type to match.
     * @returns {Object|null} The object from the pool, or null if none available.
     * @private
     */
    _getFromPool(poolName, objectType = null) {
        if (!this.objectPools[poolName] || this.objectPools[poolName].length === 0) {
            return null;
        }

        // If object type specified, find matching object
        if (objectType) {
            const index = this.objectPools[poolName].findIndex(obj =>
                obj.userData && obj.userData.objectType === objectType);

            if (index !== -1) {
                return this.objectPools[poolName].splice(index, 1)[0];
            }
        }

        // Otherwise, just get the last object
        return this.objectPools[poolName].pop();
    }

    /**
     * Adds an object to the specified pool.
     * @param {string} poolName - The name of the pool to add to.
     * @param {Object} object - The object to add to the pool.
     * @private
     */
    _addToPool(poolName, object) {
        if (!this.objectPools[poolName]) {
            this.objectPools[poolName] = [];
        }

        // Limit pool size based on performance settings
        const maxPoolSize = RENDERING.MAX_OBJECTS_PER_CHUNK * 2;
        if (this.objectPools[poolName].length >= maxPoolSize) {
            // If pool is full, dispose the oldest object
            const oldestObject = this.objectPools[poolName].shift();

            // Dispose based on object type
            if (poolName === 'tumbleweeds' && oldestObject.dispose) {
                oldestObject.dispose();
            } else if (oldestObject.geometry) {
                oldestObject.geometry.dispose();
                if (oldestObject.material) {
                    if (Array.isArray(oldestObject.material)) {
                        oldestObject.material.forEach(mat => mat.dispose());
                    } else {
                        oldestObject.material.dispose();
                    }
                }
            }
        }

        // Hide the object but keep it in memory
        if (object.visible !== undefined) {
            object.visible = false;
        } else if (object.object3D && object.object3D.visible !== undefined) {
            object.object3D.visible = false;
        }

        // Add to pool
        this.objectPools[poolName].push(object);
    }

    /**
     * Gets the current pool sizes for debugging.
     * @returns {Object} Object with pool sizes.
     */
    getPoolSizes() {
        return {
            collectibles: this.objectPools.collectibles.length,
            obstacles: this.objectPools.obstacles.length,
            tumbleweeds: this.objectPools.tumbleweeds.length
        };
    }

    /**
     * Clears all object pools.
     */
    clearPools() {
        for (const poolName in this.objectPools) {
            while (this.objectPools[poolName].length > 0) {
                const object = this.objectPools[poolName].pop();

                // Dispose based on object type
                if (poolName === 'tumbleweeds' && object.dispose) {
                    object.dispose();
                } else if (object.geometry) {
                    object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(mat => mat.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                }
            }
        }
    }
}

