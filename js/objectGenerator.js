// js/objectGenerator.js
import * as THREE from 'three';
import { prng_alea } from 'seedrandom';
import { noise2D } from './terrainGenerator.js';
import * as GlobalConfig from './config.js'; // Renamed import to avoid confusion
import * as AssetManager from './assetManager.js'; // Import AssetManager

/**
 * Generates data for all placeable objects (coins, obstacles) for a specific chunk.
 * Objects will not be placed too close to the player's spawn point (0, 10, 5).
 * @param {number} chunkX - The X coordinate of the chunk.
 * @param {number} chunkZ - The Z coordinate of the chunk.
 * @param {Object} levelConfig - The level configuration containing object types and properties.
 * @returns {Array<Object>} An array of object data objects.
 * Each object contains: { position, type, scale, rotationY, collected, collidable, scoreValue, mesh }
 */
export function generateObjectsForChunk(chunkX, chunkZ, levelConfig) { // Added levelConfig

    const chunkSeed = `${GlobalConfig.WORLD_SEED}_objects_chunk_${chunkX}_${chunkZ}`; // Use GlobalConfig
    const rng = prng_alea(chunkSeed);
    const chunkObjectsData = [];
    const chunkOffsetX = chunkX * GlobalConfig.CHUNK_SIZE; // Use GlobalConfig
    const chunkOffsetZ = chunkZ * GlobalConfig.CHUNK_SIZE; // Use GlobalConfig
    const chunkArea = GlobalConfig.CHUNK_SIZE * GlobalConfig.CHUNK_SIZE; // Use GlobalConfig

    // Define player spawn point (hardcoded based on game.js)
    const playerSpawnPoint = new THREE.Vector3(0, 10, 5);
    const playerSpawnSafeRadiusSq = GlobalConfig.PLAYER_SPAWN_SAFE_RADIUS * GlobalConfig.PLAYER_SPAWN_SAFE_RADIUS;

    // --- Generate Non-Enemy Objects ---
    // Iterate through each defined NON-ENEMY object type
    // Iterate through object types defined in the level configuration
    for (const objectType of levelConfig.OBJECT_TYPES) { // Use levelConfig
        const type = objectType.type;
        const density = objectType.density; // Density specific to this non-enemy type
        const minDistance = objectType.minDistance;
        const minDistanceSq = minDistance * minDistance;
        const verticalOffset = objectType.verticalOffset;
        const scaleRange = objectType.scaleRange;
        const randomRotationY = objectType.randomRotationY;
        const collidable = objectType.collidable;
        const scoreValue = objectType.scoreValue || 0; // Default score to 0 if not specified
        const maxPlacementAttempts = objectType.maxPlacementAttempts;

        // Determine the number of objects of this type for this chunk
        const averageObjects = chunkArea * density;
        // Add some random variation based on the seed (+/- 20% of average, for example)
        const numObjects = Math.floor(averageObjects * (0.8 + rng() * 0.4));
        let placedCount = 0;

        // Generate positions for this object type
        for (let i = 0; i < numObjects; i++) {
            let placed = false;
            for (let attempt = 0; attempt < maxPlacementAttempts; attempt++) {
                // Special handling for tumbleweeds to spawn off to the sides of player path
                let relativeX, relativeZ, worldX, worldZ;

                if (type === 'tumbleweed' && objectType.spawnOffPath) {
                    // For tumbleweeds, we want to spawn them off to the sides of the player's path
                    // The player generally moves along the Z axis in the negative direction

                    // Determine which side of the path to spawn on (left or right)
                    const side = rng() > 0.5 ? 1 : -1;

                    // Get the offset range from the object type - increased for better visibility
                    const offsetRange = objectType.spawnOffsetRange || [40, 80];

                    // Calculate a random offset from the path
                    const offsetDistance = offsetRange[0] + rng() * (offsetRange[1] - offsetRange[0]);

                    // Calculate position relative to chunk
                    // X is perpendicular to path (left/right) - spawn further to the sides
                    // Z is along the path (forward/backward) - spawn more ahead of player
                    relativeX = (rng() - 0.5) * GlobalConfig.CHUNK_SIZE * 0.3 + (side * offsetDistance);
                    relativeZ = (rng() - 0.5) * GlobalConfig.CHUNK_SIZE * 1.5; // Spread more along Z axis

                    // Calculate world coordinates
                    worldX = relativeX + chunkOffsetX;
                    worldZ = relativeZ + chunkOffsetZ;
                } else {
                    // Standard object placement for non-tumbleweeds
                    // Generate random relative X/Z within the chunk boundaries
                    relativeX = (rng() - 0.5) * GlobalConfig.CHUNK_SIZE; // Use GlobalConfig
                    relativeZ = (rng() - 0.5) * GlobalConfig.CHUNK_SIZE; // Use GlobalConfig

                    // Calculate world coordinates
                    worldX = relativeX + chunkOffsetX;
                    worldZ = relativeZ + chunkOffsetZ;
                }

                // Check for overlap with *all* already placed objects in this chunk
                let tooClose = false;
                for (const existingObject of chunkObjectsData) {
                    const dx = worldX - existingObject.position.x;
                    const dz = worldZ - existingObject.position.z;
                    // Use the larger minimum distance of the two objects being compared
                    const requiredDistSq = Math.max(minDistanceSq, existingObject.minDistance * existingObject.minDistance);
                    if (dx * dx + dz * dz < requiredDistSq) {
                        tooClose = true;
                        break;
                    }
                }

                if (tooClose) {
                    // // console.log(`[DEBUG] ${type} placement attempt ${attempt + 1} too close at [${worldX.toFixed(1)}, ${worldZ.toFixed(1)}]. Retrying...`);
                    continue; // Try a new random position
                }

                // Check if too close to player spawn point
                const dx = worldX - playerSpawnPoint.x;
                const dz = worldZ - playerSpawnPoint.z;
                const distanceToSpawnSq = dx * dx + dz * dz;

                if (distanceToSpawnSq < playerSpawnSafeRadiusSq) {
                    // Too close to player spawn point, try another position
                    continue;
                }

                // If placement is valid, calculate height, scale, rotation and add
                // Use noise parameters from levelConfig
                const terrainY = noise2D(worldX * levelConfig.NOISE_FREQUENCY, worldZ * levelConfig.NOISE_FREQUENCY) * levelConfig.NOISE_AMPLITUDE;
                const objectPos = new THREE.Vector3(
                    worldX,
                    terrainY + verticalOffset,
                    worldZ
                );

                // Calculate random scale
                const scaleFactor = scaleRange[0] + rng() * (scaleRange[1] - scaleRange[0]);
                const objectScale = new THREE.Vector3(scaleFactor, scaleFactor, scaleFactor); // Uniform scaling for now

                // Calculate random rotation
                const objectRotationY = randomRotationY ? rng() * Math.PI * 2 : 0;

                // Create the object data with common properties
                const objectData = {
                    position: objectPos,
                    type: type,
                    scale: objectScale,
                    rotationY: objectRotationY,
                    collected: false, // Only relevant for coins, default false
                    collidable: collidable,
                    scoreValue: scoreValue,
                    minDistance: minDistance, // Store minDistance for later checks
                    mesh: null // Mesh will be created by chunkManager
                };

                // Add special properties for tumbleweeds
                if (type === 'tumbleweed') {
                    objectData.isHazard = objectType.isHazard || false;
                    objectData.isDynamic = true; // Flag for dynamic behavior

                    // If it was spawned off path, add a property to indicate which side
                    if (objectType.spawnOffPath) {
                        // Determine which side of the path it's on (positive X is right, negative X is left)
                        objectData.spawnSide = objectPos.x > chunkOffsetX ? 'right' : 'left';
                    }
                }

                chunkObjectsData.push(objectData);
                // // console.log(`[DEBUG] Placed ${type} ${placedCount + 1}/${numObjects} at [${objectPos.x.toFixed(1)}, ${objectPos.y.toFixed(1)}, ${objectPos.z.toFixed(1)}]`);
                placed = true;
                placedCount++;
                break; // Exit attempt loop, move to next object of this type
            }
            if (!placed) {
                 console.warn(`[WARN] Could not place ${type} ${i + 1}/${numObjects} in chunk [${chunkX}, ${chunkZ}] after ${maxPlacementAttempts} attempts.`);
            }
        }
        // // console.log(`[DEBUG] Placed ${placedCount} ${type} objects in chunk [${chunkX}, ${chunkZ}].`);
    }

    // --- Generate Enemies ---
    // Get enemy types and properties from levelConfig
    const enemyTypes = levelConfig.ENEMY_TYPES || [];
    const enemyProperties = levelConfig.ENEMY_PROPERTIES || {};

    // Calculate max enemy min distance for broad checks, handle case with no enemies
    let maxEnemyMinDistance = 0;
    if (enemyTypes.length > 0) {
        maxEnemyMinDistance = Math.max(...enemyTypes.map(type => enemyProperties[type]?.minDistance || 0));
    }
    const maxEnemyMinDistanceSq = maxEnemyMinDistance * maxEnemyMinDistance;

    // Use enemy spawn density from levelConfig
    const averageEnemies = chunkArea * (levelConfig.ENEMY_SPAWN_DENSITY || 0);
    const numEnemiesToAttempt = Math.floor(averageEnemies * (0.8 + rng() * 0.4));
    let enemiesPlaced = 0;

    for (let i = 0; i < numEnemiesToAttempt; i++) {
        let placed = false;
        // Use a higher attempt count for finding *any* enemy spot
        const maxTotalAttempts = 20;
        for (let attempt = 0; attempt < maxTotalAttempts; attempt++) {
            // Generate random relative X/Z within the chunk boundaries
            const relativeX = (rng() - 0.5) * GlobalConfig.CHUNK_SIZE; // Use GlobalConfig
            const relativeZ = (rng() - 0.5) * GlobalConfig.CHUNK_SIZE; // Use GlobalConfig
            const worldX = relativeX + chunkOffsetX;
            const worldZ = relativeZ + chunkOffsetZ;

            // Check for overlap with *all* already placed objects (non-enemies and enemies)
            let tooClose = false;
            for (const existingObject of chunkObjectsData) {
                const dx = worldX - existingObject.position.x;
                const dz = worldZ - existingObject.position.z;
                // Use the larger minimum distance: existing object vs. MAX potential enemy distance
                const requiredDistSq = Math.max(
                    existingObject.minDistance * existingObject.minDistance,
                    maxEnemyMinDistanceSq // Use conservative max distance for this check
                );
                if (dx * dx + dz * dz < requiredDistSq) {
                    tooClose = true;
                    break;
                }
            }

            if (tooClose) {
                // // console.log(`[DEBUG] Enemy placement attempt ${attempt + 1} too close at [${worldX.toFixed(1)}, ${worldZ.toFixed(1)}]. Retrying...`);
                continue; // Try a new random position
            }

            // Check if too close to player spawn point
            const dx = worldX - playerSpawnPoint.x;
            const dz = worldZ - playerSpawnPoint.z;
            const distanceToSpawnSq = dx * dx + dz * dz;

            if (distanceToSpawnSq < playerSpawnSafeRadiusSq) {
                // Too close to player spawn point, try another position
                continue;
            }

            // --- Position is valid for *an* enemy ---
            // Randomly select enemy type
            // Randomly select enemy type if any exist for this level
            if (enemyTypes.length === 0) continue; // Skip if no enemy types defined
            const chosenTypeIndex = Math.floor(rng() * enemyTypes.length);
            const chosenType = enemyTypes[chosenTypeIndex];
            const properties = enemyProperties[chosenType];
            if (!properties) {
                 console.warn(`[ObjectGenerator] Missing properties for enemy type: ${chosenType}`);
                 continue; // Skip if properties are missing
            }

            // Calculate final position and data
            // Use noise parameters from levelConfig
            const terrainY = noise2D(worldX * levelConfig.NOISE_FREQUENCY, worldZ * levelConfig.NOISE_FREQUENCY) * levelConfig.NOISE_AMPLITUDE;
            const objectPos = new THREE.Vector3(
                worldX,
                terrainY + properties.verticalOffset, // Use the specific type's offset (though grounding handles final Y)
                worldZ
            );
            const objectScale = new THREE.Vector3(1, 1, 1); // No scaling for enemies for now
            const objectRotationY = rng() * Math.PI * 2;

            chunkObjectsData.push({
                position: objectPos,
                type: chosenType,
                scale: objectScale,
                rotationY: objectRotationY,
                collected: false, // Not applicable
                collidable: true, // Enemies are collidable
                scoreValue: 0,    // No score for enemies
                minDistance: properties.minDistance, // Store the ACTUAL minDistance for this specific enemy type
                mesh: null, // Mesh/Instance created by chunkManager/enemyManager
                enemyInstance: null // Will be populated by chunkManager
            });
            // // console.log(`[DEBUG] Placed enemy ${enemiesPlaced + 1}/${numEnemiesToAttempt} (Type: ${chosenType}) at [${objectPos.x.toFixed(1)}, ${objectPos.y.toFixed(1)}, ${objectPos.z.toFixed(1)}]`);
            placed = true;
            enemiesPlaced++;
            break; // Exit attempt loop, move to next enemy slot
        }
         if (!placed) {
             // console.warn(`[WARN] Could not place enemy ${i + 1}/${numEnemiesToAttempt} in chunk [${chunkX}, ${chunkZ}] after ${maxTotalAttempts} attempts.`);
         }
    }

    return chunkObjectsData;
}


/**
 * Creates the visual representation (THREE.Mesh or THREE.Group) for a given object data.
 * Uses the AssetManager to retrieve shared resources or create complex objects.
 * @param {object} objectData - The data object generated by generateObjectsForChunk.
 * @returns {THREE.Mesh | THREE.Group | null} The created visual object, or null if no mesh is needed (e.g., enemy, collected coin).
 */
export function createObjectVisual(objectData, levelConfig) { // Added levelConfig (consistency)
    let mesh = null;
    let geometry = null;
    let material = null;

    // Don't create visuals for enemies (handled by EnemyManager) or collected items
    // Don't create visuals for enemies (handled by EnemyManager) or collected items
    // Check against the enemy types defined in the current level config
    const enemyTypesForLevel = levelConfig?.ENEMY_TYPES || [];
    if (enemyTypesForLevel.includes(objectData.type) || objectData.collected) {
        return null;
    }

    switch (objectData.type) {
        case 'coin':
            geometry = AssetManager.getAsset('coinGeometry');
            material = AssetManager.getAsset('coinMaterial');
            break;
        case 'magnet':
            // Use the magnet model group instead of a simple geometry
            // Clone the entire model with its materials intact
            mesh = AssetManager.getAsset('magnetGroup').clone();
            // No need to override materials as they're already set in createMagnetModel
            geometry = null;
            material = null;
            break;
        case 'rock_small':
            geometry = AssetManager.getAsset('rockSmallGeo');
            material = AssetManager.getAsset('rockMaterial');
            break;
        case 'rock_large':
            geometry = AssetManager.getAsset('rockLargeGeo');
            material = AssetManager.getAsset('rockMaterial');
            break;
        case 'tree_pine':
            // Use the factory function from AssetManager
            // Pass levelConfig for consistency, though not strictly needed if materials preloaded
            mesh = AssetManager.createTreeMesh(levelConfig);
            geometry = null;
            material = null;
            break;
        case 'log_fallen':
            geometry = AssetManager.getAsset('logFallenGeo');
            material = AssetManager.getAsset('logMaterial');
            break;
        case 'cabin_simple':
            geometry = AssetManager.getAsset('cabinGeo');
            material = AssetManager.getAsset('cabinMaterial');
            break;
        // Add case for the placeholder desert rock (and future desert objects)
        case 'rock_desert':
             geometry = AssetManager.getAsset('rockDesertGeo'); // Assumes this will be added to AssetManager
             material = AssetManager.getAsset('rockMaterial'); // Reuse rock material for now
             break;
        // --- Add Desert Object Cases ---
        case 'cactus_saguaro':
            mesh = AssetManager.createCactusSaguaroModel(objectData); // Pass objectData if needed by factory
            geometry = null; material = null;
            break;
        case 'cactus_barrel':
            geometry = AssetManager.getAsset('cactusBarrelGeo');
            material = AssetManager.getAsset('cactusMaterial');
            break;
        case 'saloon':
            mesh = AssetManager.createSaloonModel(objectData);
            geometry = null; material = null;
            break;
        case 'railroad_sign':
            mesh = AssetManager.createRailroadSignModel(objectData);
            geometry = null; material = null;
            break;
        case 'skull':
            geometry = AssetManager.getAsset('skullGeo');
            // Create material instance or get shared one if defined
            material = new THREE.MeshStandardMaterial({ color: 0xFFFACD, roughness: 0.6 });
            break;
        case 'dried_bush':
            geometry = AssetManager.getAsset('driedBushGeo');
            material = new THREE.MeshStandardMaterial({ color: 0xBC8F8F, roughness: 0.9 });
            break;
        case 'wagon_wheel':
            geometry = AssetManager.getAsset('wagonWheelGeo');
            material = AssetManager.getAsset('logMaterial'); // Reuse wood
            break;
        case 'mine_entrance':
            mesh = AssetManager.createMineEntranceModel(objectData);
            geometry = null; material = null;
            break;
        case 'water_tower':
            mesh = AssetManager.createWaterTowerModel(objectData);
            geometry = null; material = null;
            break;
        case 'tumbleweed':
            geometry = AssetManager.getAsset('tumbleweedGeo');
            material = new THREE.MeshStandardMaterial({ color: 0xAD8B60, roughness: 0.8 });
            break;
        // --- End Desert Object Cases ---
        default:
            console.warn(`[createObjectVisual] Unknown or unhandled object type for visual creation: ${objectData.type}`);
            return null;
    }

    // If mesh wasn't created directly (like the tree), create it now
    if (mesh === null && geometry && material) {
        mesh = new THREE.Mesh(geometry, material);
    }

    // Apply transformations and set user data if a mesh was created
    if (mesh) {
        mesh.position.copy(objectData.position);
        mesh.scale.copy(objectData.scale);
        mesh.rotation.y = objectData.rotationY; // Apply random Y rotation

        // Apply specific initial rotations
        if (objectData.type === 'log_fallen') {
            mesh.rotation.x = Math.PI / 2; // Lay log flat
        } else if (objectData.type === 'wagon_wheel') {
             // Wagon wheel geometry is created flat, but we might want it upright
             // objectGenerator places based on terrain, so maybe rotate here or in factory
             // mesh.rotation.z = Math.PI / 2; // Example: Stand it upright
        }

        // Assign name and userData (simplified here, chunkManager might add chunkKey/index later if needed)
        mesh.name = `${objectData.type}_visual`; // Generic name
        mesh.userData = {
            objectType: objectData.type,
            collidable: objectData.collidable,
            scoreValue: objectData.scoreValue
            // Note: chunkKey and objectIndex are not known here, ChunkManager adds them
        };

        // Enable shadows (optional, could be configured elsewhere)
        mesh.castShadow = true;
        mesh.receiveShadow = true;

    } else if (!objectData.collected) {
         console.warn(`[createObjectVisual] Failed to create mesh for type: ${objectData.type}`);
    }


    return mesh;
}



/**
 * Removes the visual representation of an object from the scene and spatial grid.
 * Handles basic disposal, but avoids disposing shared assets.
 * @param {object} objectData - The data object containing the mesh reference.
 * @param {THREE.Scene} scene - The main scene.
 * @param {SpatialGrid} spatialGrid - The spatial grid instance.
 */
export function disposeObjectVisual(objectData, scene, spatialGrid, levelConfig) { // Added levelConfig (consistency)
    if (!objectData || !objectData.mesh || objectData.enemyInstance) {
        // No mesh to dispose, or it's an enemy (handled by EnemyManager)
        return;
    }

    const mesh = objectData.mesh;

    // Remove from spatial grid
    if (spatialGrid) {
        spatialGrid.remove(mesh);
    }

    // Remove from scene
    if (scene) {
        scene.remove(mesh);
    }


    // --- Resource Disposal ---
    // Dispose geometry ONLY if it's not a shared asset.
    if (objectData.type === 'tree_pine' && mesh instanceof THREE.Group) {
        // Tree is a group with unique geometries for trunk/foliage
        mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                child.geometry.dispose();
                // console.log(`[disposeObjectVisual] Disposed geometry for tree part: ${child.name}`);
            }
        });
        // Materials are shared via AssetManager, so DO NOT dispose them here.
    }
    // For other types (coin, rock, log, cabin), geometry and material are shared
    // via AssetManager, so we DO NOT dispose them here.

    // --- Old commented-out generic disposal logic (kept for reference) ---
    // // Dispose geometry ONLY if it's not a shared asset (e.g., custom geometry)
    // // Currently, all geometries are shared via AssetManager, so we DON'T dispose them here.
    // // if (mesh.geometry && !isSharedGeometry(mesh.geometry)) {
    // //     mesh.geometry.dispose();
    // // }
    //
    // // Dispose material ONLY if it's not a shared asset.
    // // Currently, all materials are shared via AssetManager, so we DON'T dispose them here.
    // // if (mesh.material && !isSharedMaterial(mesh.material)) {
    // //     if (Array.isArray(mesh.material)) {
    // //         mesh.material.forEach(material => material.dispose());
    // //     } else {
    // //         mesh.material.dispose();
    // //     }
    // // }
    //
    // // If it's a Group (like the tree), recursively dispose children if needed?
    // // For now, assuming AssetManager handles disposal of complex objects if required.

    // --- Resource Disposal ---

    // Dispose geometry ONLY if it's not a shared asset (e.g., custom geometry)

    // Currently, all geometries are shared via AssetManager, so we DON'T dispose them here.

    // if (mesh.geometry && !isSharedGeometry(mesh.geometry)) {

    //     mesh.geometry.dispose();

    // }



    // Dispose material ONLY if it's not a shared asset.

    // Currently, all materials are shared via AssetManager, so we DON'T dispose them here.

    // if (mesh.material && !isSharedMaterial(mesh.material)) {

    //     if (Array.isArray(mesh.material)) {

    //         mesh.material.forEach(material => material.dispose());

    //     } else {

    //         mesh.material.dispose();

    //     }

    // }



    // If it's a Group (like the tree), recursively dispose children if needed?

    // For now, assuming AssetManager handles disposal of complex objects if required.


    // Clear the mesh reference in the original data
    objectData.mesh = null;
// // console.log(`[disposeObjectVisual] Disposed visual for ${objectData.type}`);
}
