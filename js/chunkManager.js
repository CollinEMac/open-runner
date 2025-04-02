// js/chunkManager.js
import * as THREE from 'three';
import { createTerrainChunk } from './terrainGenerator.js';
import { generateObjectsForChunk, createObjectVisual, disposeObjectVisual } from './objectGenerator.js'; // Import visual creator and disposer
import { EnemyManager } from './enemyManager.js'; // Import EnemyManager
import * as AudioManager from './audioManager.js';
import * as AssetManager from './assetManager.js'; // Import AssetManager
import {
    CHUNK_SIZE,
    RENDER_DISTANCE_CHUNKS
    // Global config constants
} from './config.js'; // Renamed to GlobalConfig implicitly by usage below

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
                console.error(`[ChunkManager] Cannot load chunk ${key}, levelConfig is not set!`);
                return;
            }
            const terrainMesh = createTerrainChunk(chunkX, chunkZ, this.levelConfig); // Pass levelConfig
            this.scene.add(terrainMesh);

            // Generate data for all objects in this chunk
            const objectDataArray = generateObjectsForChunk(chunkX, chunkZ, this.levelConfig); // Pass levelConfig
            const collectibleMeshes = [];
            const collidableMeshes = []; // Only non-enemy collidables
            const enemies = []; // Store enemy instances for this chunk

            // Create meshes/instances for all generated objects
            objectDataArray.forEach((objectData, index) => {
                // Handle enemy spawning first
                if (objectData.type === 'bear' || objectData.type === 'squirrel' || objectData.type === 'deer') {
                    // Pass levelConfig to spawnEnemy
                    const enemyInstance = this.enemyManager.spawnEnemy(objectData.type, objectData, this, this.levelConfig);
                    if (enemyInstance) {
                        enemies.push(enemyInstance);
                        objectData.enemyInstance = enemyInstance; // Store instance ref in raw data
                    } else {
                         console.error(`[ChunkManager] Failed to spawn enemy instance for type ${objectData.type}`);
                    }
                } else {
                    // For non-enemies, delegate visual creation to objectGenerator
                    // Pass levelConfig to createObjectVisual
                    const mesh = createObjectVisual(objectData, this.levelConfig);

                    if (mesh) {
                         // Add chunk-specific info to userData
                         mesh.userData.chunkKey = key;
                         mesh.userData.objectIndex = index;
                         mesh.name = `${objectData.type}_${key}_${index}`; // More specific name

                         this.scene.add(mesh);
                         objectData.mesh = mesh; // Store mesh reference back in the raw data

                         // Add mesh to appropriate list and spatial grid
                         if (objectData.collidable) {
                             collidableMeshes.push(mesh);
                             this.spatialGrid.add(mesh);
                         } else if (objectData.type === 'coin') {
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
                enemies: enemies                 // Store active enemy instances
            });
            // console.log(`[DEBUG] Chunk ${key}: Added terrain, ${collectibleMeshes.length} collectibles, ${collidableMeshes.length} obstacles, ${enemies.length} enemies.`);

        } catch (error) {
            console.error(`Error creating chunk or objects for ${key}:`, error); // Keep error log
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

            // Unload All Non-Enemy Object Visuals using objectGenerator
            let disposedVisuals = 0;
            if (chunkData.objects) {
                chunkData.objects.forEach(objectData => {
                    // disposeObjectVisual handles checks for enemyInstance and null mesh
                    // Pass levelConfig to disposeObjectVisual
                    disposeObjectVisual(objectData, this.scene, this.spatialGrid, this.levelConfig);
                    // We only count if a mesh *was* present before disposal attempt
                    if (!objectData.enemyInstance && objectData.mesh === null) { // Check if mesh is now null
                       // This check might be slightly inaccurate if mesh was already null,
                       // but good enough for a debug count. A better way would be for
                       // disposeObjectVisual to return true/false if it did something.
                       disposedVisuals++;
                    }
                });
                 // console.log(`[DEBUG] Disposed visuals for ${disposedVisuals} non-enemy objects in chunk ${key}.`);
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
     * Gets all currently active (visible) collectible meshes (e.g., coins) across loaded chunks.
     * @returns {THREE.Mesh[]} An array of active collectible meshes.
     */
    getActiveCollectibleMeshes() {
        const activeMeshes = [];
        for (const chunkData of this.loadedChunks.values()) {
            // Use the pre-filtered list of collectible meshes for efficiency
            if (chunkData.collectibles) {
                activeMeshes.push(...chunkData.collectibles);
            }
        }
        // // console.log(`[DEBUG] Found ${activeMeshes.length} active collectible meshes.`);
        return activeMeshes;
    }

     /**
     * Gets all currently active (visible) collidable meshes (e.g., obstacles) across loaded chunks.
     * @returns {THREE.Mesh[]} An array of active collidable meshes.
     */
    getActiveCollidableMeshes() {
        const activeMeshes = [];
        for (const chunkData of this.loadedChunks.values()) {
            // Use the pre-filtered list of collidable meshes for efficiency
            if (chunkData.collidables) {
                activeMeshes.push(...chunkData.collidables);
            }
        }
        // // console.log(`[DEBUG] Found ${activeMeshes.length} active collidable meshes.`);
        return activeMeshes;
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
                    console.error(`[ChunkManager] Error during initial load of chunk ${key}:`, error);
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
}

