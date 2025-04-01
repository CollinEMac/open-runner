// js/objectGenerator.js
import * as THREE from 'three';
import { prng_alea } from 'seedrandom';
import { noise2D } from './terrainGenerator.js';
import * as Config from './config.js'; // Import entire config module

    // Note: We still need THREE and prng_alea
    // import * as THREE from 'three'; // Remove duplicate import
    // import { prng_alea } from 'seedrandom'; // Remove duplicate import

    console.log('objectGenerator.js loading');

/**
 * Generates data for all placeable objects (coins, obstacles) for a specific chunk.
 * @param {number} chunkX - The X coordinate of the chunk.
 * @param {number} chunkZ - The Z coordinate of the chunk.
 * @returns {Array<Object>} An array of object data objects.
 * Each object contains: { position, type, scale, rotationY, collected, collidable, scoreValue, mesh }
 */
export function generateObjectsForChunk(chunkX, chunkZ) {
    console.log(`Generating objects for chunk [${chunkX}, ${chunkZ}]...`);

    const chunkSeed = `${Config.WORLD_SEED}_objects_chunk_${chunkX}_${chunkZ}`; // Use Config prefix
    const rng = prng_alea(chunkSeed);
    const chunkObjectsData = [];
    const chunkOffsetX = chunkX * Config.CHUNK_SIZE; // Use Config prefix
    const chunkOffsetZ = chunkZ * Config.CHUNK_SIZE; // Use Config prefix
    const chunkArea = Config.CHUNK_SIZE * Config.CHUNK_SIZE; // Use Config prefix

    // --- Generate Non-Enemy Objects ---
    console.log(`Generating non-enemy objects for chunk [${chunkX}, ${chunkZ}]...`);
    // Iterate through each defined NON-ENEMY object type
    for (const objectType of Config.OBJECT_TYPES) { // Use Config prefix
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

        // console.log(`[DEBUG] Chunk [${chunkX}, ${chunkZ}] - Target ${type}: ${numObjects} (Avg: ${averageObjects.toFixed(2)})`);

        // Generate positions for this object type
        for (let i = 0; i < numObjects; i++) {
            let placed = false;
            for (let attempt = 0; attempt < maxPlacementAttempts; attempt++) {
                // Generate random relative X/Z within the chunk boundaries
                const relativeX = (rng() - 0.5) * Config.CHUNK_SIZE; // Use Config prefix
                const relativeZ = (rng() - 0.5) * Config.CHUNK_SIZE; // Use Config prefix

                // Calculate world coordinates
                const worldX = relativeX + chunkOffsetX;
                const worldZ = relativeZ + chunkOffsetZ;

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
                    // console.log(`[DEBUG] ${type} placement attempt ${attempt + 1} too close at [${worldX.toFixed(1)}, ${worldZ.toFixed(1)}]. Retrying...`);
                    continue; // Try a new random position
                }

                // If placement is valid, calculate height, scale, rotation and add
                const terrainY = noise2D(worldX * Config.NOISE_FREQUENCY, worldZ * Config.NOISE_FREQUENCY) * Config.NOISE_AMPLITUDE; // Use Config prefix
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

                chunkObjectsData.push({
                    position: objectPos,
                    type: type,
                    scale: objectScale,
                    rotationY: objectRotationY,
                    collected: false, // Only relevant for coins, default false
                    collidable: collidable,
                    scoreValue: scoreValue,
                    minDistance: minDistance, // Store minDistance for later checks
                    mesh: null // Mesh will be created by chunkManager
                });
                // console.log(`[DEBUG] Placed ${type} ${placedCount + 1}/${numObjects} at [${objectPos.x.toFixed(1)}, ${objectPos.y.toFixed(1)}, ${objectPos.z.toFixed(1)}]`);
                placed = true;
                placedCount++;
                break; // Exit attempt loop, move to next object of this type
            }
            if (!placed) {
                 console.warn(`[WARN] Could not place ${type} ${i + 1}/${numObjects} in chunk [${chunkX}, ${chunkZ}] after ${maxPlacementAttempts} attempts.`);
            }
        }
        // console.log(`[DEBUG] Placed ${placedCount} ${type} objects in chunk [${chunkX}, ${chunkZ}].`);
    }
    console.log(`Generated ${chunkObjectsData.length} non-enemy objects.`);

    // --- Generate Enemies ---
    console.log(`Generating enemies for chunk [${chunkX}, ${chunkZ}]...`);
    const enemyTypes = ['bear', 'squirrel', 'deer'];
    const enemyProperties = { // Store minDistance and verticalOffset (use Config prefix)
        'bear': { minDistance: Config.ENEMY_BEAR_MIN_DISTANCE, verticalOffset: 0.1, maxPlacementAttempts: 15 },
        'squirrel': { minDistance: Config.ENEMY_SQUIRREL_MIN_DISTANCE, verticalOffset: 0.1, maxPlacementAttempts: 10 },
        'deer': { minDistance: Config.ENEMY_DEER_MIN_DISTANCE, verticalOffset: 0.1, maxPlacementAttempts: 12 }
    };
    // Use the largest enemy min distance for initial broad checks (use Config prefix)
    const maxEnemyMinDistance = Math.max(Config.ENEMY_BEAR_MIN_DISTANCE, Config.ENEMY_SQUIRREL_MIN_DISTANCE, Config.ENEMY_DEER_MIN_DISTANCE);
    const maxEnemyMinDistanceSq = maxEnemyMinDistance * maxEnemyMinDistance;

    const averageEnemies = chunkArea * Config.ENEMY_SPAWN_DENSITY; // Use Config prefix
    const numEnemiesToAttempt = Math.floor(averageEnemies * (0.8 + rng() * 0.4));
    let enemiesPlaced = 0;

    console.log(`Attempting to place ${numEnemiesToAttempt} enemies (Avg: ${averageEnemies.toFixed(2)})...`);

    for (let i = 0; i < numEnemiesToAttempt; i++) {
        let placed = false;
        // Use a higher attempt count for finding *any* enemy spot
        const maxTotalAttempts = 20;
        for (let attempt = 0; attempt < maxTotalAttempts; attempt++) {
            // Generate random relative X/Z within the chunk boundaries
            const relativeX = (rng() - 0.5) * Config.CHUNK_SIZE; // Use Config prefix
            const relativeZ = (rng() - 0.5) * Config.CHUNK_SIZE; // Use Config prefix
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
                // console.log(`[DEBUG] Enemy placement attempt ${attempt + 1} too close at [${worldX.toFixed(1)}, ${worldZ.toFixed(1)}]. Retrying...`);
                continue; // Try a new random position
            }

            // --- Position is valid for *an* enemy ---
            // Randomly select enemy type
            const chosenTypeIndex = Math.floor(rng() * enemyTypes.length);
            const chosenType = enemyTypes[chosenTypeIndex];
            const properties = enemyProperties[chosenType];

            // Calculate final position and data
            const terrainY = noise2D(worldX * Config.NOISE_FREQUENCY, worldZ * Config.NOISE_FREQUENCY) * Config.NOISE_AMPLITUDE; // Use Config prefix
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
            // console.log(`[DEBUG] Placed enemy ${enemiesPlaced + 1}/${numEnemiesToAttempt} (Type: ${chosenType}) at [${objectPos.x.toFixed(1)}, ${objectPos.y.toFixed(1)}, ${objectPos.z.toFixed(1)}]`);
            placed = true;
            enemiesPlaced++;
            break; // Exit attempt loop, move to next enemy slot
        }
         if (!placed) {
             // console.warn(`[WARN] Could not place enemy ${i + 1}/${numEnemiesToAttempt} in chunk [${chunkX}, ${chunkZ}] after ${maxTotalAttempts} attempts.`);
         }
    }
    console.log(`Placed ${enemiesPlaced} enemies.`);

    console.log(`Generated ${chunkObjectsData.length} total objects (including enemies) for chunk [${chunkX}, ${chunkZ}].`);
    return chunkObjectsData;
}

console.log('objectGenerator.js loaded');
