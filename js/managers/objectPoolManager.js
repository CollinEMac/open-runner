// js/managers/objectPoolManager.js
import * as THREE from 'three'; // Re-enabled THREE import as it's used for Object3D checks
// import { renderingConfig } from '../config/rendering.js'; // Example if needed later
import { createLogger } from '../utils/logger.js'; // Stays in utils
import { modelsConfig as C_MODELS } from '../config/models.js'; // Needed for tree configuration
import { createTreeMesh } from '../rendering/models/sceneryModels.js'; // Import for tree creation

const logger = createLogger('ObjectPoolManager'); // Create logger instance

export class ObjectPoolManager { // Add named export
    constructor() {
        this.pools = {
            collectibles: [],  // Pool of inactive collectible meshes (coins, magnets)
            obstacles: [],     // Pool of inactive obstacle meshes (rocks, trees, cacti)
            tumbleweeds: []    // Pool of inactive tumbleweed instances (GameObjects)
        };
        logger.info("ObjectPoolManager instantiated");
    }

    /**
     * Gets an object from the specified pool, optionally matching a type.
     * @param {string} poolName - The name of the pool ('collectibles', 'obstacles', 'tumbleweeds').
     * @param {string} [objectType=null] - Optional object type to match (e.g., 'coin', 'tree_pine').
     * @returns {THREE.Mesh|Object|null} The retrieved object or null if none available/matching.
     */
    getFromPool(poolName, objectType = null) {
        if (!this.pools[poolName] || this.pools[poolName].length === 0) {
            return null;
        }

        let foundObject = null;
        let foundIndex = -1;

        // If object type specified, find the first matching object from the end
        if (objectType) {
            for (let i = this.pools[poolName].length - 1; i >= 0; i--) {
                const obj = this.pools[poolName][i];
                // Check userData for meshes, or directly for GameObjects like Tumbleweed
                const typeToCheck = obj.userData?.objectType || obj.type; // Assuming Tumbleweed has a 'type' property
                if (typeToCheck === objectType) {
                    foundObject = obj;
                    foundIndex = i;
                    break;
                }
            }
            // If a matching object was found, remove it from the pool
            if (foundIndex !== -1) {
                this.pools[poolName].splice(foundIndex, 1);
                return foundObject;
            } else {
                 return null; // No matching type found
            }
        } else {
            // If no type specified, just get the last object (LIFO)
            foundObject = this.pools[poolName].pop();
            const type = foundObject.userData?.objectType || foundObject.type || 'unknown';
            return foundObject;
        }
    }


    /**
     * Adds an object back to the specified pool.
     * @param {string} poolName - The name of the pool ('collectibles', 'obstacles', 'tumbleweeds').
     * @param {THREE.Mesh|Object} object - The object to add.
     */
    addToPool(poolName, object) {
        if (!this.pools[poolName]) {
            logger.warn(`Attempted to add to non-existent pool: ${poolName}`);
            this.pools[poolName] = []; // Create pool if it doesn't exist
        }
        if (!object) {
            logger.warn(`Attempted to add null/undefined object to pool: ${poolName}`);
            return;
        }

        const objectType = object.userData?.objectType || object.type || 'unknown';

        // Special validation and preparation for tree_pine objects
        if (objectType === 'tree_pine') {
            let hasTrunk = false, hasFoliage = false;
            let trunkMesh = null, foliageMesh = null;

            object.traverse((child) => {
                if (child.name === 'treeTrunk') {
                    hasTrunk = true;
                    trunkMesh = child;
                }
                if (child.name === 'treeFoliage') {
                    hasFoliage = true;
                    foliageMesh = child;
                }
            });

            if (!hasTrunk || !hasFoliage) {
                logger.warn(`Tree missing parts when adding to pool. Creating a new tree instead of pooling.`);
                this._disposeObject(object, poolName);
                return; // Don't add incomplete trees to the pool
            }

            // Reset the tree scale to 1 to avoid scaling issues when reused
            object.scale.set(1, 1, 1);

            // Use the custom reset method if available
            if (typeof object.resetTreeParts === 'function') {
                object.resetTreeParts();
            } else {
                // Manual reset as fallback
                if (object.userData.originalTrunkPosition && object.userData.originalFoliagePosition) {
                    trunkMesh.position.copy(object.userData.originalTrunkPosition);
                    foliageMesh.position.copy(object.userData.originalFoliagePosition);
                } else {
                    // Use constants if original positions aren't stored
                    const config = C_MODELS.TREE_PINE;
                    if (trunkMesh) trunkMesh.position.y = config.TRUNK_HEIGHT / 2;
                    if (foliageMesh) foliageMesh.position.y = config.TRUNK_HEIGHT + config.FOLIAGE_HEIGHT / 2;
                }
            }

            // Ensure the tree is marked as complete
            object.userData.isCompleteTree = true;
        }

        // Hide the object but keep it in memory
        if (object.visible !== undefined) { // For THREE.Object3D based objects
            object.visible = false;
        } else if (object.object3D && object.object3D.visible !== undefined) { // For GameObjects like Tumbleweed
            object.object3D.visible = false;
        }

        // Limit pool size based on performance settings (adjust multiplier as needed)
        // Using a fixed large number for now, can be tied to RENDERING config later
        const maxPoolSize = 500; // Example fixed size, adjust as needed
        // const maxPoolSize = (RENDERING?.MAX_OBJECTS_PER_CHUNK || 50) * 5; // Example based on config

        if (this.pools[poolName].length >= maxPoolSize) {
            // If pool is full, dispose the oldest object (FIFO for disposal)
            const oldestObject = this.pools[poolName].shift();
            this._disposeObject(oldestObject, poolName);
        }

        // Add the object to the pool
        this.pools[poolName].push(object);
    }

    /**
     * Clears all objects from all pools, disposing their resources.
     */
    clearPools() {
        logger.info("Clearing all object pools...");
        for (const poolName in this.pools) {
            logger.debug(`Clearing pool: ${poolName} (${this.pools[poolName].length} items)`);
            while (this.pools[poolName].length > 0) {
                const object = this.pools[poolName].pop();
                this._disposeObject(object, poolName);
            }
        }
        logger.info("All object pools cleared.");
    }

    /**
     * Disposes of an object's resources based on its type.
     * @param {THREE.Mesh|Object} object - The object to dispose.
     * @param {string} poolName - The name of the pool it came from.
     * @private
     */
    _disposeObject(object, poolName) {
        if (!object) return;

        try {
            // Special handling for tree_pine objects to preserve their structure
            if (object.userData?.objectType === 'tree_pine') {
                // Check if the tree has all its parts before disposal
                let hasTrunk = false, hasFoliage = false;
                object.traverse((child) => {
                    if (child.name === 'treeTrunk') hasTrunk = true;
                    if (child.name === 'treeFoliage') hasFoliage = true;
                });

                if (!hasTrunk || !hasFoliage) {
                    logger.warn(`Tree missing parts during disposal. Creating a new tree instead.`);

                    // If the tree is incomplete, create a new one to replace it
                    // This ensures we don't keep broken trees in the system
                    try {
                        // Create a new tree to replace the broken one
                        const newTree = createTreeMesh();
                        // Don't return the new tree - we're disposing the old one, not replacing it
                        // Just log that we're creating a new one for future use
                        logger.info('Created a new tree to replace incomplete one');
                    } catch (error) {
                        logger.error('Failed to create replacement tree:', error);
                    }
                } else {
                    // Only dispose materials and geometries, but keep the structure intact
                    object.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            // Only dispose the geometry and material, not the mesh itself
                            child.geometry?.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => mat?.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        }
                    });
                }

                // Ensure the object itself is removed if it was somehow still parented
                if(object.parent) {
                    object.parent.remove(object);
                }
            } else if (poolName === 'tumbleweeds' && typeof object.dispose === 'function') {
                object.dispose(); // Call GameObject dispose method if available
            } else if (object instanceof THREE.Object3D) { // Handle Meshes and Groups
                object.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.geometry?.dispose();
                        // Dispose materials carefully
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat?.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
                // Ensure the object itself is removed if it was somehow still parented
                if(object.parent) {
                    object.parent.remove(object);
                }
            } else {
                 logger.warn(`Unknown object type in pool ${poolName} during disposal:`, object);
            }
        } catch (error) {
            logger.error(`Error disposing object from pool ${poolName}:`, error);
        }
    }


    /**
     * Gets the current sizes of all pools.
     * @returns {Object} An object with pool names as keys and sizes as values.
     */
    getPoolSizes() {
        const sizes = {};
        for (const poolName in this.pools) {
            sizes[poolName] = this.pools[poolName].length;
        }
        return sizes;
    }
}

// Singleton instance
const objectPoolManager = new ObjectPoolManager();

export default objectPoolManager;