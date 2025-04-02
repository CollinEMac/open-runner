import * as THREE from 'three';
// Import the specific enemy classes
import { Bear, Squirrel, Deer, Coyote, Rattlesnake, Scorpion } from './enemy.js'; // Added new enemy imports

export class EnemyManager {
    constructor(scene, spatialGrid) { // Accept spatialGrid
        if (!scene || !spatialGrid) {
            throw new Error("EnemyManager requires scene and SpatialGrid instances!");
        }
        this.scene = scene;
        this.spatialGrid = spatialGrid; // Store spatialGrid
        // Use a Map to store active enemies, mapping mesh ID to enemy instance
        // This allows quick lookup if we only have the mesh (e.g., from collision)
        this.activeEnemies = new Map();
    }

    /**
     * Creates and spawns an enemy of the specified type.
     * @param {string} enemyType - The type of enemy ('bear', 'squirrel', 'deer').
     * @param {object} initialData - Data containing position, rotation, etc.
     * @param {ChunkManager} chunkManager - The ChunkManager instance (needed for Enemy constructor).
     * @param {object} levelConfig - The configuration object for the current level.
     * @returns {Enemy|null} The created enemy instance, or null if type is unknown.
     */
    spawnEnemy(enemyType, initialData, chunkManager, levelConfig) { // Added levelConfig
        if (!chunkManager || !levelConfig) {
             console.error(`[EnemyManager] spawnEnemy called without valid ChunkManager or levelConfig! Cannot spawn ${enemyType}.`);
             return null;
        }
        // Get properties for this enemy type from the level config
        const properties = levelConfig.ENEMY_PROPERTIES?.[enemyType];
        if (!properties) {
            console.warn(`[EnemyManager] Properties not found for enemy type '${enemyType}' in level config.`);
            return null; // Cannot spawn without properties
        }
        let enemyInstance = null;
        // console.log(`[EnemyManager] Attempting to spawn enemy of type: ${enemyType}`);

        switch (enemyType) {
            case 'bear':
                // Pass received chunkManager to constructor
                enemyInstance = new Bear(initialData, properties, this.scene, chunkManager);
                break;
            case 'squirrel':
                 // Pass received chunkManager to constructor
                enemyInstance = new Squirrel(initialData, properties, this.scene, chunkManager);
                break;
            case 'deer':
                 // Pass received chunkManager to constructor
                enemyInstance = new Deer(initialData, properties, this.scene, chunkManager);
                break;
            // Add cases for desert enemies
            case 'coyote':
                 enemyInstance = new Coyote(initialData, properties, this.scene, chunkManager);
                 break;
            case 'rattlesnake':
                 enemyInstance = new Rattlesnake(initialData, properties, this.scene, chunkManager);
                 break;
            case 'scorpion':
                 enemyInstance = new Scorpion(initialData, properties, this.scene, chunkManager);
                 break;
            default:
                console.warn(`[EnemyManager] Unknown enemy type requested for spawn: ${enemyType}`);
                return null;
        }

        if (enemyInstance && enemyInstance.mesh) {
            this.activeEnemies.set(enemyInstance.mesh.id, enemyInstance);
            this.spatialGrid.add(enemyInstance.mesh); // Add enemy mesh to spatial grid
            // console.log(`[EnemyManager] Spawned ${enemyType} (ID: ${enemyInstance.mesh.id}). Total active: ${this.activeEnemies.size}`);
            return enemyInstance;
        } else {
            console.error(`[EnemyManager] Failed to create mesh or instance for enemy type ${enemyType}`);
            return null;
        }
    }

    /**
     * Removes an enemy instance and its mesh from the scene.
     * @param {Enemy} enemyInstance - The enemy instance to remove.
     */
    removeEnemy(enemyInstance) {
        if (!enemyInstance || !enemyInstance.mesh) {
            console.warn("[EnemyManager] Attempted to remove invalid enemy instance or instance without mesh.");
            return;
        }

        const meshId = enemyInstance.mesh.id;
        if (this.activeEnemies.has(meshId)) {
            this.spatialGrid.remove(enemyInstance.mesh); // Remove enemy mesh from spatial grid
            enemyInstance.removeFromScene(); // Tell the enemy to remove its mesh
            this.activeEnemies.delete(meshId);
            // console.log(`[EnemyManager] Removed enemy ${enemyInstance.type} (ID: ${meshId}). Total active: ${this.activeEnemies.size}`);
        } else {
            console.warn(`[EnemyManager] Attempted to remove enemy (ID: ${meshId}) not found in active list.`);
            // Ensure mesh is removed even if not in map (belt and suspenders)
            this.spatialGrid.remove(enemyInstance.mesh); // Attempt removal from grid anyway
            enemyInstance.removeFromScene();
        }
    }

     /**
     * Removes an enemy based on its mesh ID.
     * @param {number} meshId - The ID of the enemy's mesh to remove.
     */
    removeEnemyByMeshId(meshId) {
        const enemyInstance = this.activeEnemies.get(meshId);
        if (enemyInstance) {
            this.removeEnemy(enemyInstance);
        } else {
             console.warn(`[EnemyManager] Attempted to remove enemy by mesh ID ${meshId}, but not found.`);
        }
    }


    /**
     * Updates all active enemies.
     * @param {THREE.Vector3} playerPos - The current position of the player.
     * @param {number} deltaTime - Time elapsed since the last frame.
     * @param {number} elapsedTime - Total time elapsed.
     */
    update(playerPos, deltaTime, elapsedTime) { // Add elapsedTime
        if (!playerPos) return; // Need player position
// // console.log(`[EnemyManager] Updating ${this.activeEnemies.size} enemies...`);
for (const enemy of this.activeEnemies.values()) {
            // Pass elapsedTime for animation
            enemy.update(playerPos, deltaTime, elapsedTime);
            // Update enemy's position in the spatial grid after its internal update
            if (enemy.mesh) {
                this.spatialGrid.update(enemy.mesh);
            }
        }
    }

    /**
     * Gets the meshes of all currently active enemies.
     * @returns {THREE.Mesh[]} An array of active enemy meshes.
     */
    getActiveEnemyMeshes() {
        const meshes = [];
        for (const enemy of this.activeEnemies.values()) {
            if (enemy.mesh) {
                meshes.push(enemy.mesh);
            }
        }
        // // console.log(`[EnemyManager] Returning ${meshes.length} active enemy meshes.`);
        return meshes;
    }

    /**
     * Removes all active enemies from the scene and clears the manager.
     * Used during level transitions.
     */
    removeAllEnemies() {
        console.log(`[EnemyManager] Removing all ${this.activeEnemies.size} enemies...`);
        // Iterate over a copy of the values, as removeEnemy modifies the map
        const enemiesToRemove = [...this.activeEnemies.values()];
        for (const enemyInstance of enemiesToRemove) {
            this.removeEnemy(enemyInstance); // Use existing remove logic
        }
        // Double-check the map is empty
        if (this.activeEnemies.size > 0) {
             console.warn(`[EnemyManager] activeEnemies map not empty after removeAllEnemies. Size: ${this.activeEnemies.size}`);
             this.activeEnemies.clear(); // Force clear if needed
        }
        console.log("[EnemyManager] All enemies removed.");
    }
}
