// js/levelManager.js
import * as UIManager from './uiManager.js'; // Import UI Manager for error display
import * as AssetManager from './assetManager.js'; // Import Asset Manager

// Define available levels
const AVAILABLE_LEVELS = [
    { id: 'level1', name: 'Forest' },
    { id: 'level2', name: 'Desert' },
    // Add more levels here as they are created
];

let currentLevelId = null; // Will store the string ID (e.g., 'level1')
let currentLevelConfig = null;
let chunkManagerInstance = null; // Reference to ChunkManager
let enemyManagerInstance = null; // Reference to EnemyManager
/**
 * Loads the configuration for a specific level.
 * @param {string} levelId - The ID of the level to load (e.g., 'level1', 'level2').
 * @returns {Promise<boolean>} True if loading was successful, false otherwise.
 */
export async function loadLevel(levelId) { // levelId is now a string
    console.log(`[LevelManager] Attempting to load level ${levelId}...`);
    let configModule;
    try {
        switch (levelId) {
            case 'level1':
                configModule = await import('./levels/level1_forest.js');
                currentLevelConfig = configModule.level1Config;
                break;
            case 'level2':
                configModule = await import('./levels/level2_desert.js');
                currentLevelConfig = configModule.level2Config;
                break;
            // Add cases for future levels here
            default:
                console.error(`[LevelManager] Unknown level ID: ${levelId}`);
                currentLevelConfig = null;
                currentLevelId = null;
                return false;
        }

        if (!currentLevelConfig) {
             // Use UI Manager for critical config load failure
             UIManager.displayError(new Error(`[LevelManager] Failed to load config object for level ${levelId}`));
             currentLevelId = null;
             return false;
        }

        currentLevelId = levelId;
        console.log(`[LevelManager] Successfully loaded configuration for level ${levelId}.`);
        // Asset initialization is now triggered after config is confirmed loaded
        if (currentLevelConfig) {
            // Assuming AssetManager might become async later
            await AssetManager.initLevelAssets(currentLevelConfig);
            console.log("[LevelManager] Triggered AssetManager initialization.");
        } else {
            console.error("[LevelManager] Cannot initialize assets, config is null.");
            // Should we return false here? The config load itself succeeded earlier.
            // For now, log error and continue. The lack of assets will likely cause issues later.
        }

        // TODO: Trigger scene setup/reset here (e.g., camera position, lighting specific resets beyond AssetManager)

        return true;

    } catch (error) {
        // Use UI Manager for critical level load failure
        UIManager.displayError(new Error(`[LevelManager] Error loading level ${levelId}: ${error.message}`));
        currentLevelConfig = null;
        currentLevelId = null;
        return false;
    }
}

/**
 * Gets the configuration object for the currently loaded level.
 * @returns {object | null} The configuration object or null if no level is loaded.
 */
export function getCurrentConfig() {
    if (!currentLevelConfig) {
        console.warn("[LevelManager] getCurrentConfig called before a level was loaded.");
    }
    return currentLevelConfig;
}

/**
 * Gets the ID of the currently loaded level.
 * @returns {string | null} The current level ID (e.g., 'level1') or null.
 */
export function getCurrentLevelId() {
    return currentLevelId;
}

/**
 * Stores references to the core managers needed for level loading/unloading.
 * @param {ChunkManager} chunkMgr
 * @param {EnemyManager} enemyMgr
 */
export function setManagers(chunkMgr, enemyMgr) {
    chunkManagerInstance = chunkMgr;
    enemyManagerInstance = enemyMgr;
    console.log("[LevelManager] ChunkManager and EnemyManager instances set.");
}

/**
 * Handles unloading the current level's assets and state.
 */
export function unloadCurrentLevel() {
    console.log(`[LevelManager] Unloading level ${currentLevelId}...`);
    if (!currentLevelId) {
        console.log("[LevelManager] No level currently loaded to unload.");
        return;
    }

    // Signal ChunkManager to clear chunks
    if (chunkManagerInstance) {
        chunkManagerInstance.clearAllChunks();
    } else {
        console.warn("[LevelManager] ChunkManager instance not set, cannot clear chunks.");
    }

    // Signal EnemyManager to remove enemies
    if (enemyManagerInstance) {
        enemyManagerInstance.removeAllEnemies();
    } else {
        console.warn("[LevelManager] EnemyManager instance not set, cannot remove enemies.");
    }

    // Signal AssetManager to dispose level-specific assets
    AssetManager.disposeLevelAssets(); // Called directly via namespace

    // TODO: Clear other level-specific states (e.g., UI elements specific to the level?)

    const unloadedId = currentLevelId; // Store before nulling
    currentLevelId = null;
    currentLevelConfig = null;
    console.log(`[LevelManager] Level ${unloadedId} unloaded.`);
}

/**
 * Gets the list of available levels.
 * @returns {Array<Object>} An array of level objects ({ id: string, name: string }).
 */
export function getAvailableLevels() {
    return AVAILABLE_LEVELS;
}