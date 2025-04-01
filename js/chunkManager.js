// js/chunkManager.js
import * as THREE from 'three';
import { createTerrainChunk } from './terrainGenerator.js';
import { generateObjectsForChunk } from './objectGenerator.js'; // Import unified object generator
import { EnemyManager } from './enemyManager.js'; // Import EnemyManager
import {
    CHUNK_SIZE,
    RENDER_DISTANCE_CHUNKS, // Already imported, but ensure it's here
    // Import constants needed for creating object meshes
    COIN_RADIUS,
    COIN_HEIGHT,
    COIN_COLOR,
    // OBJECT_TYPES // Might not be needed directly here if objectGenerator handles it all
} from './config.js';

console.log('chunkManager.js loading'); // Keep this log for now

// --- Shared Object Resources (Example for Coins) ---
// We'll create geometries/materials more dynamically later, but keep coin ones for now
const coinGeometry = new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, COIN_HEIGHT, 16);
const coinMaterial = new THREE.MeshStandardMaterial({ color: COIN_COLOR, metalness: 0.3, roughness: 0.4 });
coinGeometry.rotateX(Math.PI / 2); // Orient coin flat

// Placeholder geometries/materials for obstacles (replace with actual models later)
const rockSmallGeo = new THREE.SphereGeometry(1, 8, 6);
const rockLargeGeo = new THREE.SphereGeometry(2.5, 10, 8);
// Removed treePineGeo definition from here, will create dynamically
const logFallenGeo = new THREE.CylinderGeometry(0.5, 0.5, 5, 8); // Radius top/bottom, height, segments
const cabinGeo = new THREE.BoxGeometry(8, 6, 10); // Width, height, depth

const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
// Reusable materials for the new tree model
const treeFoliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.7 }); // Forest green
const treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }); // Saddle brown
const logMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }); // Saddle brown (same as trunk)
const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xDEB887, roughness: 0.8 }); // Burlywood

export class ChunkManager {
    constructor(scene, enemyManager, spatialGrid) { // Accept enemyManager and spatialGrid
        if (!scene || !enemyManager || !spatialGrid) {
            throw new Error("ChunkManager requires scene, EnemyManager, and SpatialGrid instances!");
        }
        this.scene = scene;
        this.enemyManager = enemyManager; // Store enemyManager
        this.spatialGrid = spatialGrid; // Store spatialGrid
        this.chunkSize = CHUNK_SIZE;
        this.renderDistance = RENDER_DISTANCE_CHUNKS;
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
        // console.log(`[DEBUG] ChunkManager initialized. ChunkSize: ${this.chunkSize}, RenderDistance: ${this.renderDistance}`); // Removed log
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
            // console.log(`[DEBUG] Target moved to chunk [${currentChunkX}, ${currentChunkZ}] (or first update). Updating loaded chunks...`); // Removed log
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
                        // console.log(`[DEBUG] Queuing chunk ${key} for loading.`); // Optional log
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
                    // console.log(`[DEBUG] Queuing chunk ${loadedKey} for unloading.`); // Optional log
                    this.chunksToUnloadQueue.add(loadedKey);
                    // If it was previously queued for load, remove it from that queue
                    this.chunksToLoadQueue.delete(loadedKey);
                }
            }

            // Start processing the queues if not already doing so
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
            // console.log(`[DEBUG ASYNC] Processing UNLOAD for ${keyToUnload}`);
            this.unloadChunk(keyToUnload); // Call the original synchronous unload
        }
        // Then handle loading
        else if (this.chunksToLoadQueue.size > 0) {
            const keyToLoad = this.chunksToLoadQueue.values().next().value; // Get first key
            this.chunksToLoadQueue.delete(keyToLoad);
            // console.log(`[DEBUG ASYNC] Processing LOAD for ${keyToLoad}`);
            const [chunkX, chunkZ] = keyToLoad.split(',').map(Number);
            this.loadChunk(chunkX, chunkZ); // Call the original synchronous load
        }

        // If there are more chunks in either queue, schedule the next processing step
        if (this.chunksToLoadQueue.size > 0 || this.chunksToUnloadQueue.size > 0) {
            // Schedule the next run immediately after this one completes
             setTimeout(() => this.processNextChunkInQueue(), 0);
        } else {
            // No more chunks to process, reset the flag
            // console.log("[DEBUG ASYNC] Chunk queues empty. Stopping processing.");
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

        // console.log(`[DEBUG] Loading chunk ${key}...`); // Removed log
        try {
            const terrainMesh = createTerrainChunk(chunkX, chunkZ);
            this.scene.add(terrainMesh);

            // Generate data for all objects in this chunk
            const objectDataArray = generateObjectsForChunk(chunkX, chunkZ);
            const collectibleMeshes = [];
            const collidableMeshes = []; // Only non-enemy collidables
            const enemies = []; // Store enemy instances for this chunk

            // Create meshes/instances for all generated objects
            objectDataArray.forEach((objectData, index) => {
                let mesh = null; // Initialize mesh as null for each object
                let geometry = null; // Initialize geometry
                let material = null; // Initialize material
                let isEnemy = false; // Flag to check if it's an enemy

                // Select geometry/material or handle enemy spawning
                switch (objectData.type) {
                    // --- Enemies ---
                    case 'bear':
                    case 'squirrel':
                    case 'deer':
                        isEnemy = true;
                        // Pass `this` (the chunkManager instance) to spawnEnemy
                        const enemyInstance = this.enemyManager.spawnEnemy(objectData.type, objectData, this);
                        if (enemyInstance) {
                            enemies.push(enemyInstance);
                            objectData.enemyInstance = enemyInstance; // Store instance ref in raw data
                        } else {
                             console.error(`[ChunkManager] Failed to spawn enemy instance for type ${objectData.type}`);
                        }
                        break; // Skip mesh creation below for enemies

                    // --- Collectibles ---
                    case 'coin':
                        if (!objectData.collected) { // Only create mesh if not collected
                            geometry = coinGeometry;
                            material = coinMaterial;
                        }
                        break;
                    case 'rock_small':
                        geometry = rockSmallGeo;
                        material = rockMaterial;
                        break;
                    case 'rock_large':
                        geometry = rockLargeGeo;
                        material = rockMaterial;
                        break;
                    case 'tree_pine':
                        // Create a group for the tree parts
                        mesh = new THREE.Group(); // Assign group to mesh directly

                        // Define tree dimensions (can be adjusted)
                        const trunkHeight = 4; // Adjusted: Shorter trunk
                        const trunkRadius = 0.5;
                        const foliageHeight = 12; // Adjusted: Taller foliage to maintain overall height
                        const foliageRadius = 3.5; // Adjusted: Wider foliage

                        // Create trunk geometry and mesh
                        const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius, trunkHeight, 8);
                        const trunkMesh = new THREE.Mesh(trunkGeometry, treeTrunkMaterial);
                        trunkMesh.position.y = trunkHeight / 2; // Position trunk base at group origin
                        trunkMesh.castShadow = true; // Optional: enable shadows
                        trunkMesh.receiveShadow = true;
                        mesh.add(trunkMesh); // Add trunk to the group

                        // Create foliage geometry and mesh
                        const foliageGeometry = new THREE.ConeGeometry(foliageRadius, foliageHeight, 8);
                        const foliageMesh = new THREE.Mesh(foliageGeometry, treeFoliageMaterial);
                        foliageMesh.position.y = trunkHeight + foliageHeight / 2; // Position foliage on top of trunk
                        foliageMesh.castShadow = true;
                        foliageMesh.receiveShadow = true;
                        mesh.add(foliageMesh); // Add foliage to the group

                        // No need for geometry/material variables here as mesh is the group
                        geometry = null; // Explicitly nullify to avoid accidental use below
                        material = null;

                        // The group's origin is at the base of the trunk, so no manual y-adjustment needed
                        // objectData.position.y += objectData.scale.y * 4; // REMOVED

                        // The rest of the code will apply position, scale, rotation to the group (mesh)
                        break;
                    case 'log_fallen':
                        geometry = logFallenGeo;
                        material = logMaterial;
                        // Rotation applied to mesh instance below, not shared geometry
                        break;
                    case 'cabin_simple':
                        geometry = cabinGeo;
                        material = cabinMaterial;
                        // Adjust cabin position slightly so base is on ground
                        objectData.position.y += objectData.scale.y * 3; // Half of box height * scale
                        break;
                    default:
                        console.warn(`[WARN] Unknown object type "${objectData.type}" in chunk ${key}`);
                        console.warn(`[WARN] Unknown object type "${objectData.type}" in chunk ${key}`);
                        return; // Skip unknown types
                }

                // After the switch, create the mesh if needed (and not an enemy)
                if (!isEnemy) {
                    // If mesh is still null BUT we have geometry and material, it's a standard object (rock, coin, etc.)
                    if (mesh === null && geometry && material) {
                        mesh = new THREE.Mesh(geometry, material);
                    }
                    // Else if mesh is already assigned (it must be the tree Group), we don't need to do anything here.

                    // Now, if we have a valid mesh (either newly created standard mesh or the tree group)...
                    if (mesh) {
                        // Apply position, scale, rotation to the mesh/group
                        mesh.position.copy(objectData.position);
                        mesh.scale.copy(objectData.scale);

                        // Apply initial rotations BEFORE random Y rotation
                        if (objectData.type === 'log_fallen') {
                            mesh.rotation.x = Math.PI / 2; // Lay log flat
                            console.log(`[DEBUG] Applied X rotation (${mesh.rotation.x.toFixed(2)}) to log mesh: ${mesh.name}`);
                        }
                        // Apply random Y rotation (from generator)
                        mesh.rotation.y = objectData.rotationY;
                        // --- Missing closing brace was here ---

                        mesh.name = `${objectData.type}_${key}_${index}`; // Unique name

                        // Store reference for interaction lookup
                        mesh.userData = {
                        chunkKey: key,
                        objectIndex: index,
                        objectType: objectData.type,
                        collidable: objectData.collidable,
                            scoreValue: objectData.scoreValue
                        };

                        this.scene.add(mesh);
                        objectData.mesh = mesh; // Store mesh reference in data for obstacles/coins

                        // Add mesh to appropriate list for quick access (only non-enemies)
                        if (objectData.collidable) { // This will now only be non-enemy obstacles
                            collidableMeshes.push(mesh);
                            this.spatialGrid.add(mesh); // Add obstacle to spatial grid
                        } else if (objectData.type === 'coin') {
                            collectibleMeshes.push(mesh);
                            this.spatialGrid.add(mesh); // Add collectible to spatial grid
                        }
                    } // <-- Added missing closing brace for 'if (mesh)' here
                } else if (!isEnemy && (!geometry || !material)) {
                     // Log if a non-enemy object failed mesh creation (e.g., collected coin)
                     // console.log(`[DEBUG] No mesh created for non-enemy object type ${objectData.type} (likely collected coin)`);
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
            console.log(`[DEBUG] Chunk ${key}: Added terrain, ${collectibleMeshes.length} collectibles, ${collidableMeshes.length} obstacles, ${enemies.length} enemies.`);

        } catch (error) {
            console.error(`Error creating chunk or objects for ${key}:`, error); // Keep error log
        }
    }

    // Unloads a specific chunk
    unloadChunk(key) {
        const chunkData = this.loadedChunks.get(key);
        if (chunkData) {
            // console.log(`[DEBUG] Unloading chunk ${key}...`); // Removed log

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
                // console.log(`Disposed terrain resources for chunk ${key}`);
                // console.log(`Disposed terrain resources for chunk ${key}`);
            }

            // Unload All Object Meshes (Collectibles and non-enemy Collidables)
            let unloadedObjectMeshes = 0;
            if (chunkData.objects) {
                chunkData.objects.forEach(objectData => {
                    // Only remove meshes for non-enemy objects here
                    if (objectData.mesh && !objectData.enemyInstance) {
                        this.spatialGrid.remove(objectData.mesh); // Remove from spatial grid first
                        this.scene.remove(objectData.mesh);
                        objectData.mesh = null;
                        unloadedObjectMeshes++;
                    }
                });
                 console.log(`[DEBUG] Removed ${unloadedObjectMeshes} obstacle/collectible meshes for chunk ${key} (and from spatial grid).`);
            }

            // Unload Enemies using EnemyManager
            let unloadedEnemies = 0;
            if (chunkData.enemies) {
                chunkData.enemies.forEach(enemyInstance => {
                    this.enemyManager.removeEnemy(enemyInstance); // Manager handles scene removal
                    unloadedEnemies++;
                });
                console.log(`[DEBUG] Removed ${unloadedEnemies} enemies for chunk ${key}`);
            }

            // Clear local references (collectibles/collidables/enemies arrays are part of chunkData)
            this.loadedChunks.delete(key);
            console.log(`[DEBUG] Chunk ${key} unloaded and data removed.`);
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
        // console.log(`Found ${nearbyMeshes.length} nearby meshes for position ${position.x.toFixed(1)}, ${position.z.toFixed(1)}`);
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
        // console.log(`[DEBUG] Found ${activeMeshes.length} active collectible meshes.`);
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
        // console.log(`[DEBUG] Found ${activeMeshes.length} active collidable meshes.`);
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
                console.log(`Collecting ${object.type} ${objectIndex} in chunk ${chunkKey}`);

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
        console.log("[ChunkManager] Starting initial chunk load...");
        const startChunkX = 0; // Assuming player starts near 0,0
        const startChunkZ = 0;
        // Use the configured render distance for the initial load radius
        const initialLoadRadius = RENDER_DISTANCE_CHUNKS;
        console.log(`[ChunkManager] Initial load radius set to: ${initialLoadRadius} (from config)`);

        const chunksToLoadInitially = [];
        for (let x = startChunkX - initialLoadRadius; x <= startChunkX + initialLoadRadius; x++) {
            for (let z = startChunkZ - initialLoadRadius; z <= startChunkZ + initialLoadRadius; z++) {
                chunksToLoadInitially.push({ x, z });
            }
        }

        const totalChunks = chunksToLoadInitially.length;
        let loadedCount = 0;

        console.log(`[ChunkManager] Determined ${totalChunks} initial chunks to load.`);

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
                    console.log(`[ChunkManager] Initial load successful for chunk ${key}`);
                } catch (error) {
                    console.error(`[ChunkManager] Error during initial load of chunk ${key}:`, error);
                    // Decide how to handle errors - continue loading others?
                }
            } else {
                console.log(`[ChunkManager] Chunk ${key} was already loaded (unexpected during initial load).`);
            }

            loadedCount++;
            // Report progress after each chunk attempt
            if (progressCallback) {
                progressCallback(loadedCount, totalChunks);
            }

            // Optional: Add a small delay to allow the main thread to update the UI
            // await new Promise(resolve => setTimeout(resolve, 10)); // e.g., 10ms delay
        }

        console.log("[ChunkManager] Initial chunk loading complete.");
        // Set the last camera chunk coords based on the initial load center
        // to prevent immediate unloading/reloading in the first update frame.
        this.lastCameraChunkX = startChunkX;
        this.lastCameraChunkZ = startChunkZ;
    }
}

// console.log('chunkManager.js loaded'); // Removed log
