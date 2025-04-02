// js/levelManager.js

// Define available levels
const AVAILABLE_LEVELS = [
    { id: 'level1', name: 'Forest' },
    { id: 'level2', name: 'Desert' },
    // Add more levels here as they are created
];

let currentLevelId = null; // Will store the string ID (e.g., 'level1')
let currentLevelConfig = null;

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
             console.error(`[LevelManager] Failed to load config object for level ${levelId}`);
             currentLevelId = null;
             return false;
        }

        currentLevelId = levelId;
        console.log(`[LevelManager] Successfully loaded configuration for level ${levelId}.`);

        // TODO: Trigger asset preloading/creation via AssetManager here
        // TODO: Trigger scene setup/reset here

        return true;

    } catch (error) {
        console.error(`[LevelManager] Error loading level ${levelId}:`, error);
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
 * Placeholder function to handle unloading the current level's assets and state.
 */
export function unloadCurrentLevel() {
    console.log(`[LevelManager] Unloading level ${currentLevelId}...`);
    // TODO: Signal ChunkManager to clear chunks
    // TODO: Signal EnemyManager to remove enemies
    // TODO: Signal AssetManager to dispose level-specific assets
    // TODO: Clear other level-specific states

    currentLevelId = null;
    currentLevelConfig = null;
    console.log("[LevelManager] Current level unloaded.");
    }
    
    /**
     * Gets the list of available levels.
     * @returns {Array<Object>} An array of level objects ({ id: string, name: string }).
     */
    export function getAvailableLevels() {
        return AVAILABLE_LEVELS;
}