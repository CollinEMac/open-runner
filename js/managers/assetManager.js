// js/managers/assetManager.js
import * as THREE from 'three'; // Re-enabled THREE import as it's used for geometries/materials
import * as UIManager from './uiManager.js'; // Stays in managers
// Import specific config objects
import { materialsConfig } from '../config/materials.js';
import { fallbackGeometriesConfig } from '../config/fallbackGeometries.js';
import { modelsConfig } from '../config/models.js';
import { createLogger } from '../utils/logger.js'; // Import logger

const logger = createLogger('AssetManager'); // Instantiate logger
import * as ModelFactory from '../rendering/modelFactory.js'; // Moved to rendering
// Duplicate logger import and instantiation removed

// --- Private Asset Storage ---
// Stores assets for the currently loaded level
let levelAssets = {};

/**
 * Initializes and stores shared assets like geometries and materials for a specific level.
 * @param {object} levelConfig - The configuration object for the level.
 */
export function initLevelAssets(levelConfig) {
    logger.info("Initializing assets for level...");

    // Clear previous level's assets first
    disposeLevelAssets();
    levelAssets = {}; // Reset the storage

    if (!levelConfig) {
        const errorMsg = "Cannot initialize assets without levelConfig!";
        UIManager.displayError(new Error(`[AssetManager] ${errorMsg}`));
        logger.error(errorMsg);
        return;
    }

    // --- Coin --- (Uses level config OR fallback geometry constants)
    const coinVis = levelConfig.COIN_VISUALS || {}; // Start with empty object
    const coinRadius = coinVis.radius ?? fallbackGeometriesConfig.COIN.RADIUS;
    const coinHeight = coinVis.height ?? fallbackGeometriesConfig.COIN.HEIGHT;
    const coinColor = coinVis.color ?? 0xFFFF00; // Default yellow if not in config
    const coinSegments = fallbackGeometriesConfig.COIN.SEGMENTS;
    levelAssets.coinGeometry = new THREE.CylinderGeometry(coinRadius, coinRadius, coinHeight, coinSegments);
    levelAssets.coinGeometry.rotateX(Math.PI / 2);
    levelAssets.coinMaterial = new THREE.MeshStandardMaterial({ color: coinColor, metalness: 0.3, roughness: 0.4 }); // Keep metalness/roughness for now

    // --- Powerups ---
    // --- Magnet --- (Uses level config OR model defaults and ModelFactory)
    const magnetVis = levelConfig.MAGNET_VISUALS || {};
    const magnetProps = {
        size: magnetVis.size ?? modelsConfig.MAGNET.DEFAULT_SIZE,
        color: magnetVis.color ?? modelsConfig.MAGNET.DEFAULT_COLOR
    };
    try {
        levelAssets.magnetGroup = ModelFactory.createMagnetModel(magnetProps); // Use ModelFactory with potentially defaulted props
        // Define magnet material using constants from MODELS.MAGNET
        levelAssets.magnetMaterial = new THREE.MeshStandardMaterial({
          color: magnetProps.color, // Use the determined color
          emissive: modelsConfig.MAGNET.MAGNET_EMISSIVE,
          metalness: modelsConfig.MAGNET.MAGNET_METALNESS,
          roughness: modelsConfig.MAGNET.MAGNET_ROUGHNESS
        });
    } catch (error) {
        logger.error("Error creating magnet model:", error);
        UIManager.displayError(new Error("[AssetManager] Error creating magnet model."));
    }


    // --- Obstacles Materials (Use constants from MATERIALS) ---
    levelAssets.rockMaterial = new THREE.MeshStandardMaterial({ color: materialsConfig.ROCK_COLOR, roughness: materialsConfig.ROCK_ROUGHNESS });
    levelAssets.logMaterial = new THREE.MeshStandardMaterial({ color: materialsConfig.LOG_COLOR, roughness: materialsConfig.LOG_ROUGHNESS });
    levelAssets.cabinMaterial = new THREE.MeshStandardMaterial({ color: materialsConfig.CABIN_COLOR, roughness: materialsConfig.CABIN_ROUGHNESS });
    levelAssets.cactusMaterial = new THREE.MeshStandardMaterial({ color: materialsConfig.CACTUS_COLOR, roughness: materialsConfig.CACTUS_ROUGHNESS });
    levelAssets.saloonMaterial = new THREE.MeshStandardMaterial({ color: materialsConfig.SALOON_COLOR, roughness: materialsConfig.SALOON_ROUGHNESS });
    // Add other materials as needed...

    // --- Obstacles Geometries (Based on levelConfig.OBJECT_TYPES) ---
    const objectTypes = levelConfig.OBJECT_TYPES || [];
    objectTypes.forEach(objType => {
        // Only create geometries if they don't exist yet for this level load
        switch (objType.type) {
            case 'rock_small':
                if (!levelAssets.rockSmallGeo) levelAssets.rockSmallGeo = new THREE.IcosahedronGeometry(fallbackGeometriesConfig.ROCK_SMALL.RADIUS, fallbackGeometriesConfig.ROCK_SMALL.DETAIL); // Use Icosahedron for blocky look
                break;
            case 'rock_large':
                if (!levelAssets.rockLargeGeo) levelAssets.rockLargeGeo = new THREE.IcosahedronGeometry(fallbackGeometriesConfig.ROCK_LARGE.RADIUS, fallbackGeometriesConfig.ROCK_LARGE.DETAIL); // Use Icosahedron
                break;
            case 'log_fallen':
                if (!levelAssets.logFallenGeo) levelAssets.logFallenGeo = new THREE.CylinderGeometry(fallbackGeometriesConfig.LOG_FALLEN.RADIUS, fallbackGeometriesConfig.LOG_FALLEN.RADIUS, fallbackGeometriesConfig.LOG_FALLEN.HEIGHT, fallbackGeometriesConfig.LOG_FALLEN.SEGMENTS);
                break;
            case 'cabin_simple':
                if (!levelAssets.cabinGeo) levelAssets.cabinGeo = new THREE.BoxGeometry(fallbackGeometriesConfig.CABIN.WIDTH, fallbackGeometriesConfig.CABIN.HEIGHT, fallbackGeometriesConfig.CABIN.DEPTH);
                break;
            case 'rock_desert':
                 if (!levelAssets.rockDesertGeo) levelAssets.rockDesertGeo = new THREE.DodecahedronGeometry(fallbackGeometriesConfig.ROCK_DESERT.RADIUS, fallbackGeometriesConfig.ROCK_DESERT.DETAIL);
                 break;
            case 'cactus_barrel':
                 if (!levelAssets.cactusBarrelGeo) levelAssets.cactusBarrelGeo = new THREE.CylinderGeometry(fallbackGeometriesConfig.CACTUS_BARREL.RAD_BOT, fallbackGeometriesConfig.CACTUS_BARREL.RAD_TOP, fallbackGeometriesConfig.CACTUS_BARREL.HEIGHT, fallbackGeometriesConfig.CACTUS_BARREL.SEGMENTS);
                 break;
            case 'saloon':
                 if (!levelAssets.saloonGeo) levelAssets.saloonGeo = new THREE.BoxGeometry(fallbackGeometriesConfig.SALOON.WIDTH, fallbackGeometriesConfig.SALOON.HEIGHT, fallbackGeometriesConfig.SALOON.DEPTH);
                 break;
            case 'skull':
                 if (!levelAssets.skullGeo) levelAssets.skullGeo = new THREE.IcosahedronGeometry(fallbackGeometriesConfig.SKULL.RADIUS, fallbackGeometriesConfig.SKULL.DETAIL);
                 break;
            case 'dried_bush':
                 if (!levelAssets.driedBushGeo) levelAssets.driedBushGeo = new THREE.IcosahedronGeometry(fallbackGeometriesConfig.DRIED_BUSH.RADIUS, fallbackGeometriesConfig.DRIED_BUSH.DETAIL);
                 break;
            case 'wagon_wheel':
                 if (!levelAssets.wagonWheelGeo) levelAssets.wagonWheelGeo = new THREE.TorusGeometry(fallbackGeometriesConfig.WAGON_WHEEL.RADIUS, fallbackGeometriesConfig.WAGON_WHEEL.TUBE, fallbackGeometriesConfig.WAGON_WHEEL.RAD_SEG, fallbackGeometriesConfig.WAGON_WHEEL.TUB_SEG);
                 break;
            case 'tumbleweed':
                 if (!levelAssets.tumbleweedGeo) levelAssets.tumbleweedGeo = new THREE.IcosahedronGeometry(fallbackGeometriesConfig.TUMBLEWEED.RADIUS, fallbackGeometriesConfig.TUMBLEWEED.DETAIL);
                 break;
            // Geometries for models created dynamically in factory are not stored here
            case 'tree_pine':
            case 'cactus_saguaro':
            case 'railroad_sign':
            case 'mine_entrance':
            case 'water_tower':
                break; // No static geometry needed
        }
    });

    // --- Tree Materials (Use constants if needed by level) ---
    if (objectTypes.some(t => t.type === modelsConfig.TREE_PINE.OBJECT_TYPE)) {
        levelAssets.treeFoliageMaterial = new THREE.MeshStandardMaterial({ color: modelsConfig.TREE_PINE.FALLBACK_FOLIAGE_COLOR, roughness: modelsConfig.TREE_PINE.FALLBACK_FOLIAGE_ROUGHNESS });
        levelAssets.treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: modelsConfig.TREE_PINE.FALLBACK_TRUNK_COLOR, roughness: modelsConfig.TREE_PINE.FALLBACK_TRUNK_ROUGHNESS });
    }

    logger.info("Level assets initialized:", Object.keys(levelAssets));
}

/**
 * Retrieves a pre-initialized asset by key for the current level.
 * @param {string} key - The key of the asset (e.g., 'coinGeometry', 'rockMaterial').
 * @returns {THREE.BufferGeometry | THREE.Material | THREE.Group | undefined} The requested asset or undefined if not found.
 */
export function getAsset(key) {
    if (!levelAssets[key]) {
        // This might be expected if an asset isn't used in the current level
    }
    return levelAssets[key];
}

/**
 * Disposes of assets loaded for the current level.
 * Call this before loading a new level.
 */
export function disposeLevelAssets() {
    logger.info("Disposing current level assets...");
    let disposedCount = 0;
    Object.keys(levelAssets).forEach(key => {
        const asset = levelAssets[key];
        if (asset) {
            try {
                if (asset.dispose) { // Materials and Geometries have dispose()
                    asset.dispose();
                    disposedCount++;
                } else if (asset instanceof THREE.Texture) { // Handle textures
                     asset.dispose();
                     disposedCount++;
                } else if (asset instanceof THREE.Group) {
                    // Dispose resources within groups (like magnet model)
                    asset.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.geometry?.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(m => m?.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        }
                    });
                    // Group itself doesn't have dispose, just clear children references implicitly
                }
            } catch (error) {
                logger.error(`Error disposing asset "${key}":`, error);
            }
        }
    });
    levelAssets = {}; // Clear the storage object
    logger.info(`Level assets disposed. ${disposedCount} items disposed.`);
}

// --- Model Factory Functions Removed ---
// All create...Model functions and helpers (createBoxPart, createEyes, etc.)
// have been moved to js/modelFactory.js