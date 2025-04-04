// js/config.js
// Global game configuration using the ConfigManager

import configManager from './utils/configManager.js';
import { createLogger } from './utils/logger.js';
import performanceManager from './utils/performanceManager.js';

const logger = createLogger('Config');

// Define configuration sections
const SECTIONS = {
    WORLD: 'world',
    TERRAIN: 'terrain',
    PLAYER: 'player',
    CAMERA: 'camera',
    CONTROLS: 'controls',
    PHYSICS: 'physics',
    RENDERING: 'rendering',
    PERFORMANCE: 'performance'
};

// Initialize default configuration
const defaultConfig = {
    // Default values that don't fit into specific sections
    DEBUG_MODE: false,
    MAX_DELTA_TIME: 1 / 15, // Max time step allowed (prevents physics explosion after pause)
    SHOW_FPS: false // Whether to show FPS counter
};

// World generation configuration
const worldConfig = {
    SEED: 'open-runner-seed', // Fixed seed for consistent world generation
    CHUNK_SIZE: 100, // Width and depth of a single terrain chunk
    RENDER_DISTANCE_CHUNKS: performanceManager.getSettings().renderDistance, // Render distance in chunks (from performance settings)
    GRID_CELL_SIZE: 25, // Size of cells in the spatial grid for collision detection
    PLAYER_SPAWN_SAFE_RADIUS: 50 // Increased minimum distance objects can spawn from player's spawn point
};

// Terrain configuration
const terrainConfig = {
    SEGMENTS_X: performanceManager.getSettings().terrainSegments, // Number of segments in the plane geometry per chunk
    SEGMENTS_Y: performanceManager.getSettings().terrainSegments  // Higher means more detail but less performance
};

// Player configuration
const playerConfig = {
    // Movement
    SPEED: 15.0, // Initial units per second
    SPEED_INCREASE_RATE: 0.25, // Units per second, per second
    HEIGHT_OFFSET: 3.5, // Approx distance from player origin to feet
    RAYCAST_ORIGIN_OFFSET: 5, // How far above player to start ground raycast
    RAYCAST_STRIDE_OFFSET: 1.0, // How far forward/back to cast ground rays

    // Model dimensions
    HEAD_SIZE: 1.5,
    TORSO_HEIGHT: 3,
    TORSO_WIDTH: 2,
    TORSO_DEPTH: 1,
    LIMB_WIDTH: 0.75,
    ARM_LENGTH: 2.5,
    LEG_LENGTH: 3,

    // Animation
    ANIMATION_BASE_SPEED: 3.0,
    MAX_ANIMATION_SPEED_FACTOR: 2.0,
    ARM_SWING_AMPLITUDE: Math.PI / 3,
    LEG_SWING_AMPLITUDE: Math.PI / 4,
    ELBOW_BEND_AMPLITUDE: Math.PI / 2.5,
    KNEE_BEND_AMPLITUDE: Math.PI / 2
};

// Derived player values
playerConfig.UPPER_ARM_LENGTH = playerConfig.ARM_LENGTH * 0.5;
playerConfig.FOREARM_LENGTH = playerConfig.ARM_LENGTH * 0.5;
playerConfig.THIGH_LENGTH = playerConfig.LEG_LENGTH * 0.5;
playerConfig.CALF_LENGTH = playerConfig.LEG_LENGTH * 0.5;
playerConfig.JOINT_RADIUS = playerConfig.LIMB_WIDTH / 1.5;

// Camera configuration
const cameraConfig = {
    FOV: 75,
    NEAR_PLANE: 0.1,
    FAR_PLANE: 2000, // Far plane might need adjustment based on level fog
    FOLLOW_OFFSET_X: 0,
    FOLLOW_OFFSET_Y: 15,
    FOLLOW_OFFSET_Z: 30,
    LOOK_AT_OFFSET_Y: 2,
    SMOOTHING_FACTOR: 0.01
};

// Controls configuration
const controlsConfig = {
    MOUSE_SENSITIVITY: 0.002,
    PLAYER_TILT_FACTOR: 0.25,
    PLAYER_TILT_SMOOTHING: 0.1,
    KEY_TURN_SPEED: Math.PI / 1.5
};

// Rendering configuration
const renderingConfig = {
    SHADOWS_ENABLED: performanceManager.getSettings().shadowsEnabled,
    PIXEL_RATIO: performanceManager.getSettings().pixelRatio,
    ANTIALIAS: performanceManager.getSettings().antialias,
    PARTICLE_DENSITY: performanceManager.getSettings().particleDensity,
    MAX_OBJECTS_PER_CHUNK: performanceManager.getSettings().maxObjectsPerChunk
};

// Register all configurations
configManager.setDefaults(defaultConfig);
configManager.registerConfig(SECTIONS.WORLD, worldConfig);
configManager.registerConfig(SECTIONS.TERRAIN, terrainConfig);
configManager.registerConfig(SECTIONS.PLAYER, playerConfig);
configManager.registerConfig(SECTIONS.CAMERA, cameraConfig);
configManager.registerConfig(SECTIONS.CONTROLS, controlsConfig);
configManager.registerConfig(SECTIONS.RENDERING, renderingConfig);

logger.debug('Game configuration initialized');

/**
 * Gets a configuration value
 * @param {string} key - Configuration key in format "section.key" or just "key" for default section
 * @param {*} [defaultValue] - Default value if key not found
 * @returns {*} Configuration value or default
 */
export function getConfig(key, defaultValue) {
    return configManager.get(key, defaultValue);
}

/**
 * Gets an entire configuration section
 * @param {string} section - Section name
 * @returns {Object|null} Configuration section or null if not found
 */
export function getConfigSection(section) {
    return configManager.getSection(section);
}

/**
 * Updates a configuration value
 * @param {string} section - Section name
 * @param {Object} updates - Configuration updates
 * @returns {boolean} Whether the update was successful
 */
export function updateConfig(section, updates) {
    return configManager.updateConfig(section, updates);
}

// Set up performance manager callback to update config when settings change
performanceManager.setOnSettingsChanged((settings) => {
    // Update terrain settings
    configManager.updateConfig(SECTIONS.TERRAIN, {
        SEGMENTS_X: settings.terrainSegments,
        SEGMENTS_Y: settings.terrainSegments
    });

    // Update world settings
    configManager.updateConfig(SECTIONS.WORLD, {
        RENDER_DISTANCE_CHUNKS: settings.renderDistance
    });

    // Update rendering settings
    configManager.updateConfig(SECTIONS.RENDERING, {
        SHADOWS_ENABLED: settings.shadowsEnabled,
        PIXEL_RATIO: settings.pixelRatio,
        ANTIALIAS: settings.antialias,
        PARTICLE_DENSITY: settings.particleDensity,
        MAX_OBJECTS_PER_CHUNK: settings.maxObjectsPerChunk
    });

    logger.debug('Updated configuration based on performance settings');
});

// Export configuration sections for direct access
export const WORLD = configManager.getSection(SECTIONS.WORLD);
export const TERRAIN = configManager.getSection(SECTIONS.TERRAIN);
export const PLAYER = configManager.getSection(SECTIONS.PLAYER);
export const CAMERA = configManager.getSection(SECTIONS.CAMERA);
export const CONTROLS = configManager.getSection(SECTIONS.CONTROLS);
export const RENDERING = configManager.getSection(SECTIONS.RENDERING);

// Export individual constants for backward compatibility
// World
export const WORLD_SEED = WORLD.SEED;
export const CHUNK_SIZE = WORLD.CHUNK_SIZE;
export const RENDER_DISTANCE_CHUNKS = WORLD.RENDER_DISTANCE_CHUNKS;
export const GRID_CELL_SIZE = WORLD.GRID_CELL_SIZE;
export const PLAYER_SPAWN_SAFE_RADIUS = WORLD.PLAYER_SPAWN_SAFE_RADIUS;

// Terrain
export const TERRAIN_SEGMENTS_X = TERRAIN.SEGMENTS_X;
export const TERRAIN_SEGMENTS_Y = TERRAIN.SEGMENTS_Y;

// Player
export const PLAYER_SPEED = PLAYER.SPEED;
export const PLAYER_SPEED_INCREASE_RATE = PLAYER.SPEED_INCREASE_RATE;
export const PLAYER_HEIGHT_OFFSET = PLAYER.HEIGHT_OFFSET;
export const PLAYER_RAYCAST_ORIGIN_OFFSET = PLAYER.RAYCAST_ORIGIN_OFFSET;
export const PLAYER_RAYCAST_STRIDE_OFFSET = PLAYER.RAYCAST_STRIDE_OFFSET;

export const PLAYER_HEAD_SIZE = PLAYER.HEAD_SIZE;
export const PLAYER_TORSO_HEIGHT = PLAYER.TORSO_HEIGHT;
export const PLAYER_TORSO_WIDTH = PLAYER.TORSO_WIDTH;
export const PLAYER_TORSO_DEPTH = PLAYER.TORSO_DEPTH;
export const PLAYER_LIMB_WIDTH = PLAYER.LIMB_WIDTH;
export const PLAYER_ARM_LENGTH = PLAYER.ARM_LENGTH;
export const PLAYER_LEG_LENGTH = PLAYER.LEG_LENGTH;
export const PLAYER_UPPER_ARM_LENGTH = PLAYER.UPPER_ARM_LENGTH;
export const PLAYER_FOREARM_LENGTH = PLAYER.FOREARM_LENGTH;
export const PLAYER_THIGH_LENGTH = PLAYER.THIGH_LENGTH;
export const PLAYER_CALF_LENGTH = PLAYER.CALF_LENGTH;
export const PLAYER_JOINT_RADIUS = PLAYER.JOINT_RADIUS;

export const PLAYER_ANIMATION_BASE_SPEED = PLAYER.ANIMATION_BASE_SPEED;
export const PLAYER_MAX_ANIMATION_SPEED_FACTOR = PLAYER.MAX_ANIMATION_SPEED_FACTOR;
export const PLAYER_ARM_SWING_AMPLITUDE = PLAYER.ARM_SWING_AMPLITUDE;
export const PLAYER_LEG_SWING_AMPLITUDE = PLAYER.LEG_SWING_AMPLITUDE;
export const PLAYER_ELBOW_BEND_AMPLITUDE = PLAYER.ELBOW_BEND_AMPLITUDE;
export const PLAYER_KNEE_BEND_AMPLITUDE = PLAYER.KNEE_BEND_AMPLITUDE;

// Controls
export const MOUSE_SENSITIVITY = CONTROLS.MOUSE_SENSITIVITY;
export const PLAYER_TILT_FACTOR = CONTROLS.PLAYER_TILT_FACTOR;
export const PLAYER_TILT_SMOOTHING = CONTROLS.PLAYER_TILT_SMOOTHING;
export const PLAYER_KEY_TURN_SPEED = CONTROLS.KEY_TURN_SPEED;

// Camera
export const CAMERA_FOV = CAMERA.FOV;
export const CAMERA_NEAR_PLANE = CAMERA.NEAR_PLANE;
export const CAMERA_FAR_PLANE = CAMERA.FAR_PLANE;
export const CAMERA_FOLLOW_OFFSET_X = CAMERA.FOLLOW_OFFSET_X;
export const CAMERA_FOLLOW_OFFSET_Y = CAMERA.FOLLOW_OFFSET_Y;
export const CAMERA_FOLLOW_OFFSET_Z = CAMERA.FOLLOW_OFFSET_Z;
export const CAMERA_LOOK_AT_OFFSET_Y = CAMERA.LOOK_AT_OFFSET_Y;
export const CAMERA_SMOOTHING_FACTOR = CAMERA.SMOOTHING_FACTOR;

// Timing
export const MAX_DELTA_TIME = getConfig('MAX_DELTA_TIME');

// Powerups
export const POWERUP_DURATION = 10;

// Export performance manager
export { performanceManager };

// Export the config manager for advanced usage
export default configManager;
