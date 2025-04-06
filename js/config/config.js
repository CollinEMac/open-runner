// js/config/config.js
// Global game configuration using the ConfigManager

import configManager from '../utils/configManager.js'; // Updated path
import { createLogger } from '../utils/logger.js'; // Updated path
import performanceManager from '../utils/performanceManager.js'; // Updated path

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
    PERFORMANCE: 'performance',
    GAMEPLAY: 'gameplay',
    INPUT: 'input',
    TUMBLEWEED: 'tumbleweed',
    UI: 'ui',
    MODELS: 'models',
    PARTICLES: 'particles',
    RENDERING_ADVANCED: 'renderingAdvanced',
    ENEMY_DEFAULTS: 'enemyDefaults',
    AUDIO: 'audio',
    MATERIALS: 'materials', // New section for shared materials
    FALLBACK_GEOMETRIES: 'fallbackGeometries', // New section for fallback geo params
    DEBUG: 'debug' // New section for debug flags
};

// Initialize default configuration
const defaultConfig = {
    // Default values that don't fit into specific sections
    DEBUG_MODE: false,
    MAX_DELTA_TIME: 1 / 15, // Max time step allowed (prevents physics explosion after pause)
    // SHOW_FPS: false, // Moved to debugConfig
    LEVEL1_TRANSITION_SCORE: 300 // Score needed to transition from level 1
};

// World generation configuration
const worldConfig = {
    SEED: 'open-runner-seed', // Fixed seed for consistent world generation
    CHUNK_SIZE: 100, // Width and depth of a single terrain chunk
    RENDER_DISTANCE_CHUNKS: performanceManager.getSettings().renderDistance, // Render distance in chunks (from performance settings)
    GRID_CELL_SIZE: 25, // Size of cells in the spatial grid for collision detection
    PLAYER_SPAWN_SAFE_RADIUS: 20, // Reduced minimum distance objects can spawn from player's spawn point
    MAX_OBJECTS_PER_CHUNK: performanceManager.getSettings().maxObjectsPerChunk // Moved from RENDERING
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
    KNEE_BEND_AMPLITUDE: Math.PI / 2,

    // Visuals / Model Construction
    DEFAULT_COLOR: 0x808080,
    DEFAULT_ROUGHNESS: 0.7,
    DEFAULT_METALNESS: 0.1,
    JOINT_SEGMENTS_W: 8,
    JOINT_SEGMENTS_H: 6,
    LIMB_OFFSET_FACTOR: 0.5 // Multiplier for jointRadius offset
};

// Derived player values
playerConfig.UPPER_ARM_LENGTH = playerConfig.ARM_LENGTH * 0.5;
playerConfig.FOREARM_LENGTH = playerConfig.ARM_LENGTH * 0.5;
playerConfig.THIGH_LENGTH = playerConfig.LEG_LENGTH * 0.5;
playerConfig.CALF_LENGTH = playerConfig.LEG_LENGTH * 0.5;
playerConfig.JOINT_RADIUS = playerConfig.LIMB_WIDTH / 1.5;
playerConfig.INITIAL_POS_X = 0;
playerConfig.INITIAL_POS_Y = 10;
playerConfig.INITIAL_POS_Z = 5;


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
    KEY_TURN_SPEED: Math.PI / 1.5,
    // Key bindings (lowercase for easier comparison)
    KEY_TOGGLE_FPS: 'f',
    KEY_PAUSE_RESUME_BACK: 'escape',
    KEY_RESTART_GAME_OVER: 'r',
    KEY_LEVEL_SELECT_TITLE: 'l',
    TURN_SOUND_THRESHOLD: 0.001 // Minimum rotation delta to trigger turn sound
};

// Rendering configuration (Basic)
const renderingConfig = {
    SHADOWS_ENABLED: performanceManager.getSettings().shadowsEnabled,
    PIXEL_RATIO: performanceManager.getSettings().pixelRatio,
    ANTIALIAS: performanceManager.getSettings().antialias
    // PARTICLE_DENSITY moved to particleConfig
    // MAX_OBJECTS_PER_CHUNK moved to worldConfig
};

// Advanced Rendering / Shadow configuration
const renderingAdvancedConfig = {
    SHADOW_MAP_SIZE_LOW: 512,
    SHADOW_MAP_SIZE_MEDIUM: 1024,
    SHADOW_MAP_SIZE_HIGH: 2048,
    SHADOW_CAMERA_NEAR: 0.5,
    SHADOW_CAMERA_FAR: 500,
    SHADOW_BIAS: -0.001,
    // Frustum size - needs tuning based on typical view distance and chunk size
    // Example: Cover roughly 3x3 chunks centered around origin initially
    SHADOW_FRUSTUM_SIZE: 150, // Half-width/height (e.g., CHUNK_SIZE * 1.5)
    INITIAL_CAMERA_POS_X: 0,
    INITIAL_CAMERA_POS_Y: 50,
    INITIAL_CAMERA_POS_Z: 100,
    FPS_COUNTER_PREFIX: 'FPS: ',
    FPS_COUNTER_SEPARATOR: ' | Quality: ',
    // FPS Counter styles could be added here, but might be better in CSS
    // Camera Transitions & Drift
    TRANSITION_DURATION_DEFAULT: 0.6,
    TRANSITION_DURATION_TITLE: 0.5,
    TRANSITION_DURATION_GAMEPLAY: 0.4,
    TITLE_LOOK_AT_X: 0, TITLE_LOOK_AT_Y: 0, TITLE_LOOK_AT_Z: 0,
    DRIFT_AMPLITUDE_X: 15, DRIFT_AMPLITUDE_Y: 7.5, DRIFT_AMPLITUDE_Z: 10,
    DRIFT_PERIOD_X: 45, DRIFT_PERIOD_Y: 30, DRIFT_PERIOD_Z: 60,
    DRIFT_LERP_FACTOR: 0.02
};

// Gameplay configuration
const gameplayConfig = {
    POWERUP_TYPE_MAGNET: 'magnet',
    POWERUP_DURATION: 10, // Duration in seconds
    // Magnet visual effect
    MAGNET_EFFECT_COLOR: 0xff0000,
    MAGNET_EFFECT_EMISSIVE: 0x330000,
    MAGNET_EFFECT_METALNESS: 0.9,
    MAGNET_EFFECT_ROUGHNESS: 0.1,
    DEFAULT_COIN_SCORE: 10,
    MAGNET_POWERUP_RADIUS: 80, // For coin attraction
    MAGNET_POWERUP_FORCE: 150, // For coin attraction
    COIN_COLLECTION_RADIUS_FACTOR: 1.5, // Multiplier for coin radius during magnet collection
    PLAYER_SAFE_DISTANCE_FACTOR: 0.2, // Multiplier for player radius for min safe distance
    TREE_COLLISION_BUFFER: 0.2 // Buffer below trunk top for collision
};

// Tumbleweed configuration
const tumbleweedConfig = {
    // Behavior
    ROLL_SPEED_MIN: 4.0,
    ROLL_SPEED_MAX: 9.0,
    ROTATION_SPEED_MIN: -2.0, // Halved from original calculation (-0.5 * 4.0)
    ROTATION_SPEED_MAX: 2.0,  // Halved from original calculation (0.5 * 4.0)
    ACTIVATION_DISTANCE: 100,
    DEACTIVATION_DISTANCE: 150,
    TARGET_AHEAD_MIN: 50, // For activation target point
    TARGET_AHEAD_MAX: 80, // For activation target point
    TARGET_RANDOMNESS: 0.3, // For activation direction
    INITIAL_SPEED_FACTOR_MIN: 1.0, // For activation speed
    INITIAL_SPEED_FACTOR_MAX: 1.6, // For activation speed
    UPDATE_TARGET_AHEAD_MIN: 40, // For movement update target point
    UPDATE_TARGET_AHEAD_MAX: 60, // For movement update target point
    UPDATE_DIRECTION_RANDOMNESS: 0.2, // For movement update direction
    STEERING_LERP_FACTOR: 0.08,
    STEERING_FORCE_FACTOR: 0.5,
    MAX_SPEED_FACTOR: 1.0, // Multiplier for rollSpeed to get max speed limit
    WOBBLE_FACTOR: 0.1,
    MIN_VELOCITY_SQ_THRESHOLD: 0.1, // Min velocity squared to apply steering/rotation
    TERRAIN_ADJUST_THRESHOLD: 0.5, // How far above terrain to float
    GROUND_BOUNCE_FACTOR: 0.3,

    // Physics
    MASS: 0.5,
    FRICTION: 0.2,
    RESTITUTION: 0.3,
    USE_GRAVITY: true,
    GRAVITY_FORCE: 9.8,

    // Visuals
    SCALE_MIN: 0.8, // Example: Add min/max scale if needed later
    SCALE_MAX: 1.2, // Example: Add min/max scale if needed later
    MAIN_GEOMETRY_RADIUS: 1.0,
    MAIN_GEOMETRY_DETAIL: 1,
    MAIN_MATERIAL_COLOR: 0xAD8B60,
    MAIN_MATERIAL_ROUGHNESS: 0.9,
    MAIN_MATERIAL_METALNESS: 0.1,
    MAIN_MATERIAL_WIREFRAME: true,
    INNER_GEOMETRY_RADIUS: 0.8,
    INNER_GEOMETRY_DETAIL: 1,
    INNER_MATERIAL_COLOR: 0x8B6B40,
    INNER_MATERIAL_ROUGHNESS: 0.7,
    INNER_MATERIAL_METALNESS: 0.1,

    // Identification
    OBJECT_TYPE_NAME: 'tumbleweed'
};

// UI configuration
const uiConfig = {
    // Durations (ms)
    FADE_DURATION_MS: 300,
    LOADING_HIDE_DELAY_MS: 400,
    PULSE_ANIMATION_DURATION_MS: 1000,
    NOTIFICATION_DURATION_MS: 3000,
    NOTIFICATION_FADE_DURATION_MS: 300,

    // Opacity
    OPACITY_VISIBLE: '1',
    OPACITY_HIDDEN: '0',

    // CSS Classes (can be added here or kept in uiManager)
    // e.g., CSS_HIGH_SCORE_PULSE: 'high-score-pulse',

    // Text Prefixes
    SCORE_PREFIX: 'Score: ',
    HIGH_SCORE_PREFIX: 'High Score: ',
    LOADING_TEXT_PREFIX: 'Loading... ',
    LOADING_TEXT_SUFFIX: '%',
    LOCKED_LEVEL_TEXT: 'Locked - Complete previous levels to unlock'
};

// Models configuration
const modelsConfig = {
    // --- Helper Defaults ---
    HELPER_EYE_COLOR: 0x000000,
    HELPER_EYE_SIZE_FACTOR: 0.1, // Relative to head width/height
    HELPER_EYE_ROUGHNESS: 0.3,
    HELPER_EYE_METALNESS: 0.2,
    HELPER_EYE_WHITE_COLOR: 0xFFFFFF,
    HELPER_EYE_WHITE_ROUGHNESS: 0.3,
    HELPER_EYE_WHITE_METALNESS: 0.0,
    HELPER_EYE_WHITE_SIZE_FACTOR: 1.3, // Relative to eye size
    HELPER_EYE_OFFSET_FACTOR: 0.25, // Relative to head width
    HELPER_EYE_DEPTH_FACTOR: 0.4, // Relative to head width
    HELPER_EYE_PUPIL_DEPTH_FACTOR: 0.5, // Relative to eye size
    HELPER_SNOUT_COLOR_MULTIPLIER: 0.9,
    HELPER_SNOUT_TIP_COLOR_MULTIPLIER: 0.7,
    HELPER_SNOUT_TIP_SIZE_FACTOR: 0.3, // Relative to snout width
    HELPER_SNOUT_TIP_DEPTH_FACTOR: 0.6, // Relative to snout depth
    HELPER_SNOUT_ROUGHNESS: 0.9,
    HELPER_SNOUT_TIP_ROUGHNESS: 0.7,
    HELPER_SNOUT_Y_OFFSET_FACTOR: 0.1, // Relative to snout height
    HELPER_SNOUT_Z_OFFSET_FACTOR: 1.2, // Relative to snout depth
    HELPER_EAR_COLOR_MULTIPLIER: 0.9,
    HELPER_INNER_EAR_COLOR: 0xFF9999,
    HELPER_EAR_ROUGHNESS: 0.8,
    HELPER_INNER_EAR_ROUGHNESS: 0.7,
    HELPER_POINTY_EAR_RADIUS_FACTOR: 0.15, // Relative to head width
    HELPER_POINTY_EAR_HEIGHT_FACTOR: 0.5, // Relative to head height
    HELPER_POINTY_INNER_EAR_RADIUS_FACTOR: 0.1, // Relative to head width
    HELPER_POINTY_INNER_EAR_HEIGHT_FACTOR: 0.35, // Relative to head height
    HELPER_ROUND_EAR_RADIUS_FACTOR: 0.2, // Relative to head width
    HELPER_ROUND_INNER_EAR_RADIUS_FACTOR: 0.15, // Relative to head width
    HELPER_ROUND_EAR_SCALE_Y: 1.2,
    HELPER_ROUND_EAR_SCALE_Z: 0.7,
    HELPER_INNER_EAR_Z_OFFSET: -0.05,
    HELPER_POINTY_EAR_ROTATION_Z: Math.PI / 12,
    HELPER_EAR_OFFSET_FACTOR: 0.35, // Relative to head width
    HELPER_EAR_Y_OFFSET_FACTOR: 0.4, // Relative to head height
    HELPER_TAIL_SEGMENTS: 4,
    HELPER_TAIL_CURVE_FACTOR: Math.PI / 8,

    // --- Tree Pine ---
    TREE_PINE: {
        GROUP_NAME: 'tree_pine_group',
        TRUNK_NAME: 'treeTrunk',
        FOLIAGE_NAME: 'treeFoliage',
        OBJECT_TYPE: 'tree_pine',
        TRUNK_HEIGHT: 4,
        TRUNK_RADIUS: 0.5,
        FOLIAGE_HEIGHT: 12,
        FOLIAGE_RADIUS: 3.5,
        TRUNK_SEGMENTS: 8,
        FOLIAGE_SEGMENTS: 8,
        TRUNK_MATERIAL_KEY: 'treeTrunkMaterial',
        FOLIAGE_MATERIAL_KEY: 'treeFoliageMaterial',
        FALLBACK_TRUNK_COLOR: 0x8B4513,
        FALLBACK_TRUNK_ROUGHNESS: 0.9,
        FALLBACK_FOLIAGE_COLOR: 0x228B22,
        FALLBACK_FOLIAGE_ROUGHNESS: 0.7,
        // Collision (Trunk radius used directly from dimensions)
        ALLOW_WALK_UNDER: true // Flag to indicate special collision handling
    },

    // --- Bear ---
    BEAR: {
        DEFAULT_COLOR: 0x8B4513,
        TORSO_WIDTH: 3.5, TORSO_HEIGHT: 2.5, TORSO_DEPTH: 5.0,
        HEAD_WIDTH: 1.8, HEAD_HEIGHT: 1.5, HEAD_DEPTH: 1.5,
        LEG_WIDTH: 0.8, LEG_HEIGHT: 2.0, LEG_DEPTH: 0.8,
        TORSO_ROUGHNESS: 0.8,
        HEAD_ROUGHNESS: 0.7,
        LEG_ROUGHNESS: 0.8,
        TORSO_Y_OFFSET_FACTOR: -0.2, // Relative to leg height + torso height
        HEAD_Y_OFFSET_FACTOR: 0.4, // Relative to torso height
        HEAD_Z_OFFSET_FACTOR: -0.3, // Relative to head depth
        EYE_SIZE: 0.15,
        SNOUT_WIDTH: 0.9, SNOUT_HEIGHT: 0.7, SNOUT_DEPTH: 0.8,
        LEG_Y_OFFSET_FACTOR: 0.5, // Relative to leg height
        LEG_X_OFFSET_FACTOR: 0.4, // Relative to leg width
        FRONT_LEG_Z_FACTOR: 0.6, // Relative to leg depth
        BACK_LEG_Z_FACTOR: 0.6, // Relative to leg depth
        GEOMETRY_DETAIL: 2, // Segments for BoxGeometry
        // Collision (Approximated from dimensions)
        COLLISION_WIDTH_FACTOR: 1.0, // Use full width
        COLLISION_DEPTH_FACTOR: 1.0  // Use full depth
    },

    // --- Squirrel ---
    SQUIRREL: {
        DEFAULT_COLOR: 0xA0522D,
        TORSO_WIDTH: 0.8, TORSO_HEIGHT: 0.7, TORSO_DEPTH: 1.5,
        HEAD_WIDTH: 0.6, HEAD_HEIGHT: 0.5, HEAD_DEPTH: 0.5,
        LEG_WIDTH: 0.25, LEG_HEIGHT: 0.6, LEG_DEPTH: 0.25,
        MATERIAL_ROUGHNESS: 0.7,
        TORSO_Y_POS: 0.5,
        HEAD_Y_OFFSET: 0.2, // Relative to torso pos
        HEAD_Z_OFFSET: -0.8,
        EYE_SIZE: 0.08,
        SNOUT_WIDTH: 0.3, SNOUT_HEIGHT: 0.25, SNOUT_DEPTH: 0.25,
        LEG_Y_POS: 0,
        LEG_X_OFFSET_FACTOR: 0.1, // Relative to torso width
        FRONT_LEG_Z_OFFSET_FACTOR: 0.2, // Relative to torso depth
        BACK_LEG_Z_OFFSET_FACTOR: 0.2, // Relative to torso depth
        TAIL_BASE_Y_OFFSET: 0.3, // Relative to torso pos
        TAIL_BASE_Z_OFFSET_FACTOR: 0.2, // Relative to torso depth
        TAIL_SEGMENTS: 5,
        TAIL_WIDTH: 0.4,
        TAIL_SEGMENT_LENGTH: 0.3,
        TAIL_CURVE: Math.PI / 4,
        TAIL_INITIAL_ANGLE: -Math.PI / 6,
        TAIL_SEGMENT_WIDTH_FACTOR: 0.7, // For first/last segment
        GEOMETRY_DETAIL: 2,
        // Collision (Approximated from dimensions)
        COLLISION_WIDTH_FACTOR: 1.0,
        COLLISION_DEPTH_FACTOR: 1.0
    },

    // --- Deer ---
    DEER: {
        DEFAULT_COLOR: 0xD2B48C,
        TORSO_WIDTH: 1.2, TORSO_HEIGHT: 1.3, TORSO_DEPTH: 2.8,
        HEAD_WIDTH: 0.8, HEAD_HEIGHT: 0.8, HEAD_DEPTH: 0.9,
        NECK_WIDTH: 0.5, NECK_HEIGHT: 0.5, NECK_DEPTH: 0.8,
        LEG_WIDTH: 0.3, LEG_HEIGHT: 1.5, LEG_DEPTH: 0.3,
        MATERIAL_ROUGHNESS: 0.7,
        TORSO_Y_POS: 1.0,
        HEAD_Y_OFFSET: 0.5, // Relative to torso pos
        HEAD_Z_OFFSET: -1.6,
        EYE_SIZE: 0.1,
        SNOUT_WIDTH: 0.4, SNOUT_HEIGHT: 0.3, SNOUT_DEPTH: 0.5,
        NECK_Y_OFFSET: 0.3, // Relative to torso pos
        NECK_Z_OFFSET: -1.1,
        NECK_ROTATION_X: Math.PI / 6,
        LEG_Y_POS: 0,
        LEG_X_OFFSET: 0.4,
        FRONT_LEG_Z: -1.0,
        BACK_LEG_Z: 1.0,
        ANTLER_COLOR: 0x654321,
        ANTLER_ROUGHNESS: 0.9,
        ANTLER_MAIN_RADIUS_BOTTOM: 0.05, ANTLER_MAIN_RADIUS_TOP: 0.08, ANTLER_MAIN_HEIGHT: 0.8, ANTLER_MAIN_SEGMENTS: 5,
        ANTLER_SECONDARY_RADIUS_BOTTOM: 0.03, ANTLER_SECONDARY_RADIUS_TOP: 0.05, ANTLER_SECONDARY_HEIGHT: 0.4, ANTLER_SECONDARY_SEGMENTS: 5,
        ANTLER_MAIN_Y_OFFSET: 0.4,
        ANTLER_MAIN_ROTATION_Z: Math.PI / 12,
        ANTLER_BRANCH1_X_OFFSET: 0.1, ANTLER_BRANCH1_Y_OFFSET: 0.6, ANTLER_BRANCH1_ROTATION_Z: Math.PI / 4,
        ANTLER_BRANCH2_X_OFFSET: -0.1, ANTLER_BRANCH2_Y_OFFSET: 0.7, ANTLER_BRANCH2_ROTATION_Z: -Math.PI / 5,
        ANTLER_GROUP_X_OFFSET: 0.3,
        ANTLER_GROUP_Y_OFFSET: 0.4, // Relative to head pos
        ANTLER_RIGHT_ROTATION_Y: Math.PI,
        GEOMETRY_DETAIL: 2,
        // Collision (Approximated from dimensions)
        COLLISION_WIDTH_FACTOR: 1.0,
        COLLISION_DEPTH_FACTOR: 1.0
    },

    // --- Rock Desert ---
    ROCK_DESERT: {
        GEO_KEY: 'rockDesertGeo',
        MATERIAL_KEY: 'rockMaterial',
        // Collision (Example radius, adjust as needed)
        COLLISION_RADIUS: 1.5 // Generic radius for rocks
    },

    // --- Cactus Saguaro ---
    CACTUS_SAGUARO: {
        MATERIAL_KEY: 'cactusMaterial',
        TRUNK_RADIUS_BOTTOM: 0.5, TRUNK_RADIUS_TOP: 0.6, TRUNK_HEIGHT: 8, TRUNK_SEGMENTS: 8,
        TRUNK_Y_POS: 4,
        ARM_RADIUS_BOTTOM: 0.3, ARM_RADIUS_TOP: 0.4, ARM_HEIGHT: 3, ARM_SEGMENTS: 6,
        ARM1_X_POS: 0.6, ARM1_Y_POS: 5, ARM1_Z_ROT: -Math.PI / 4, ARM1_Y_ROT: Math.PI / 8,
        ARM2_X_POS: -0.6, ARM2_Y_POS: 6, ARM2_Z_ROT: Math.PI / 4, ARM2_Y_ROT: -Math.PI / 8,
        // Collision (Approximated from trunk radius)
        COLLISION_RADIUS: 0.8
    },

    // --- Cactus Barrel ---
    CACTUS_BARREL: {
        MATERIAL_KEY: 'cactusMaterial',
        GEO_KEY: 'cactusBarrelGeo',
        FALLBACK_RADIUS_BOTTOM: 1.0, FALLBACK_RADIUS_TOP: 1.2, FALLBACK_HEIGHT: 1.5, FALLBACK_SEGMENTS: 12,
        Y_POS_FACTOR: 0.5, // Relative to height
        // Collision (Approximated from fallback radius)
        COLLISION_RADIUS: 1.2
    },

    // --- Saloon ---
    SALOON: {
        MATERIAL_KEY: 'saloonMaterial',
        GEO_KEY: 'saloonGeo',
        FALLBACK_WIDTH: 12, FALLBACK_HEIGHT: 8, FALLBACK_DEPTH: 15,
        BUILDING_Y_POS_FACTOR: 0.5, // Relative to height
        ROOF_WIDTH_FACTOR: 1.16, // Relative to building width (14/12)
        ROOF_HEIGHT: 0.5,
        ROOF_DEPTH: 4,
        ROOF_Y_OFFSET: -0.25, // Relative to building height
        ROOF_Z_OFFSET_FACTOR: -0.63, // Relative to building depth (-9.5/15)
        // Collision (Approximated from fallback dimensions)
        COLLISION_RADIUS: 6.0 // Half of width
    },

    // --- Railroad Sign ---
    RAILROAD_SIGN: {
        WOOD_MATERIAL_KEY: 'logMaterial',
        SIGN_COLOR: 0xffffff,
        POST_RADIUS: 0.2, POST_HEIGHT: 5, POST_SEGMENTS: 6,
        POST_Y_POS_FACTOR: 0.5, // Relative to height
        SIGN_WIDTH: 3, SIGN_HEIGHT: 0.5, SIGN_DEPTH: 0.1,
        SIGN_Y_POS: 4.5,
        SIGN_ROTATION_Z: Math.PI / 4,
        // Collision (Approximated from post radius)
        COLLISION_RADIUS: 0.3
    },

    // --- Skull ---
    SKULL: {
        GEO_KEY: 'skullGeo',
        FALLBACK_RADIUS: 0.5, FALLBACK_DETAIL: 0,
        COLOR: 0xFFFACD,
        ROUGHNESS: 0.6,
        // Collision (Approximated from fallback radius)
        COLLISION_RADIUS: 0.5
    },

    // --- Dried Bush ---
    DRIED_BUSH: {
        GEO_KEY: 'driedBushGeo',
        FALLBACK_RADIUS: 0.8, FALLBACK_DETAIL: 0,
        COLOR: 0xBC8F8F,
        ROUGHNESS: 0.9,
        // Collision (Approximated from fallback radius)
        COLLISION_RADIUS: 1.0
    },

    // --- Wagon Wheel ---
    WAGON_WHEEL: {
        MATERIAL_KEY: 'logMaterial',
        GEO_KEY: 'wagonWheelGeo',
        FALLBACK_RADIUS: 1.0, FALLBACK_TUBE_RADIUS: 0.15, FALLBACK_RADIAL_SEGMENTS: 6, FALLBACK_TUBULAR_SEGMENTS: 12,
        ROTATION_X: Math.PI / 2,
        // Collision (Approximated from fallback radius)
        COLLISION_RADIUS: 1.0
    },

    // --- Mine Entrance ---
    MINE_ENTRANCE: {
        WOOD_MATERIAL_KEY: 'logMaterial',
        ROCK_MATERIAL_KEY: 'rockMaterial', // Available but not used in current code
        FRAME_SIDE_WIDTH: 0.5, FRAME_SIDE_HEIGHT: 6, FRAME_SIDE_DEPTH: 0.5,
        FRAME_TOP_WIDTH: 5, FRAME_TOP_HEIGHT: 0.5, FRAME_TOP_DEPTH: 0.5,
        POST_X_OFFSET_FACTOR: 0.45, // Relative to top width (2.25/5)
        POST_Y_POS_FACTOR: 0.5, // Relative to side height
        TOP_Y_POS_FACTOR: 1.04, // Relative to side height (6.25/6)
        OPENING_COLOR: 0x111111,
        OPENING_WIDTH_FACTOR: 0.8, // Relative to top width (4/5)
        OPENING_HEIGHT_FACTOR: 0.917, // Relative to side height (5.5/6)
        OPENING_Y_POS_FACTOR: 0.458, // Relative to side height (2.75/6)
        OPENING_Z_POS: 0.3,
        // Collision (Approximated from frame width)
        COLLISION_RADIUS: 2.5 // Half of top width
    },

    // --- Water Tower ---
    WATER_TOWER: {
        WOOD_MATERIAL_KEY: 'logMaterial',
        TANK_RADIUS: 3, TANK_HEIGHT: 5, TANK_SEGMENTS: 12,
        TANK_Y_POS: 8,
        LEG_WIDTH: 0.4, LEG_HEIGHT: 6, LEG_DEPTH: 0.4,
        LEG_Y_POS_FACTOR: 0.5, // Relative to leg height
        LEG_OFFSET: 2,
        // Collision (Approximated from tank radius)
        COLLISION_RADIUS: 2.5 // Slightly less than tank radius
    },

    // --- Tumbleweed Model (Visual only) ---
    TUMBLEWEED_MODEL: {
        GEO_KEY: 'tumbleweedGeo',
        FALLBACK_RADIUS: 1.0, FALLBACK_DETAIL: 1,
        COLOR: 0xAD8B60,
        ROUGHNESS: 0.8,
        // Collision (Approximated from fallback radius)
        COLLISION_RADIUS: 1.0
    },

    // --- Coyote ---
    COYOTE: {
        DEFAULT_COLOR: 0xAAAAAA,
        TORSO_WIDTH: 1.0, TORSO_HEIGHT: 1.1, TORSO_DEPTH: 2.5,
        HEAD_WIDTH: 0.7, HEAD_HEIGHT: 0.7, HEAD_DEPTH: 0.8,
        NECK_WIDTH: 0.4, NECK_HEIGHT: 0.4, NECK_DEPTH: 0.6,
        LEG_WIDTH: 0.25, LEG_HEIGHT: 1.2, LEG_DEPTH: 0.25,
        MATERIAL_ROUGHNESS: 0.7,
        TORSO_Y_POS: 0.8,
        HEAD_Y_OFFSET: 0.4, // Relative to torso pos
        HEAD_Z_OFFSET: -1.4,
        EYE_SIZE: 0.1,
        SNOUT_WIDTH: 0.4, SNOUT_HEIGHT: 0.3, SNOUT_DEPTH: 0.6,
        NECK_Y_OFFSET: 0.2, // Relative to torso pos
        NECK_Z_OFFSET: -1.0,
        NECK_ROTATION_X: Math.PI / 7,
        LEG_Y_POS: 0,
        LEG_X_OFFSET: 0.35,
        FRONT_LEG_Z: -0.8,
        BACK_LEG_Z: 0.8,
        TAIL_BASE_Y_OFFSET: -0.1, // Relative to torso pos
        TAIL_BASE_Z_OFFSET: 1.4,
        TAIL_SEGMENTS: 4,
        TAIL_WIDTH: 0.2,
        TAIL_SEGMENT_LENGTH: 0.3,
        TAIL_INITIAL_ANGLE: Math.PI / 5,
        TAIL_SEGMENT_WIDTH_FACTOR: 0.15, // Multiplier for width reduction per segment
        TAIL_ANGLE_INCREMENT: Math.PI / 20,
        GEOMETRY_DETAIL: 2,
        // Collision (Approximated from dimensions)
        COLLISION_RADIUS: 0.8
    },

    // --- Rattlesnake ---
    RATTLESNAKE: {
        DEFAULT_COLOR: 0xCD853F,
        SEGMENT_ROUGHNESS: 0.8,
        HEAD_RADIUS: 0.3, HEAD_HEIGHT: 0.7, HEAD_SEGMENTS: 8,
        HEAD_ROUGHNESS: 0.7,
        HEAD_ROTATION_X: -Math.PI / 2,
        HEAD_Y_POS: 0.15, HEAD_Z_POS: 2.0,
        EYE_RADIUS: 0.06, EYE_SEGMENTS: 8,
        EYE_COLOR: 0x000000, EYE_ROUGHNESS: 0.3, EYE_METALNESS: 0.2,
        EYE_X_OFFSET: 0.15, EYE_Y_POS: 0.2, EYE_Z_POS: 1.8,
        NUM_BODY_SEGMENTS: 8,
        BODY_INITIAL_Y_POS: 0.15, BODY_INITIAL_Z_POS: 1.5,
        BODY_RADIUS_START: 0.2, BODY_RADIUS_DECREMENT: 0.01,
        BODY_RADIUS_TOP_FACTOR: 1.25, // Top radius = bottom radius + 0.05 -> (radius + 0.05) / radius
        BODY_SEGMENT_LENGTH: 0.6, BODY_SEGMENTS: 8,
        BODY_COLOR_MULTIPLIER: 0.9, // For alternating segments
        BODY_ROTATION_X: Math.PI / 2,
        BODY_Z_DECREMENT: 0.5,
        BODY_X_OFFSET: 0.15,
        BODY_ANGLE_INCREMENT: 0.15,
        RATTLE_BASE_Z_OFFSET: -0.3,
        RATTLE_SEGMENTS: 3,
        RATTLE_COLOR: 0xAAAAAA, RATTLE_ROUGHNESS: 0.9,
        RATTLE_SIZE_START: 0.15, RATTLE_SIZE_DECREMENT: 0.02, RATTLE_SEGMENTS_DETAIL: 6,
        RATTLE_Z_OFFSET_FACTOR: 0.15, // Distance between rattle segments
        // Collision (Approximated)
        COLLISION_RADIUS: 0.4
    },

    // --- Scorpion ---
    SCORPION: {
        DEFAULT_COLOR: 0x444444,
        BODY_WIDTH: 0.6, BODY_HEIGHT: 0.3, BODY_DEPTH: 1.0,
        HEAD_WIDTH: 0.5, HEAD_HEIGHT: 0.25, HEAD_DEPTH: 0.4,
        MATERIAL_ROUGHNESS: 0.8,
        BODY_Y_POS: 0.15,
        HEAD_Y_POS: 0.15, HEAD_Z_OFFSET: -0.6,
        EYE_RADIUS: 0.04, EYE_SEGMENTS: 6,
        EYE_COLOR: 0x000000, EYE_ROUGHNESS: 0.3,
        EYE_X_OFFSET: 0.1, EYE_Y_POS: 0.2, EYE_Z_OFFSET: -0.8,
        TAIL_INITIAL_Y: 0.2, TAIL_INITIAL_Z: 0.6, TAIL_SEGMENTS: 5,
        TAIL_RADIUS_START: 0.1, TAIL_RADIUS_DECREMENT: 0.01, TAIL_SEGMENT_LENGTH: 0.3, TAIL_SEGMENT_SEGMENTS: 8,
        TAIL_ROTATION_X: Math.PI / 2,
        TAIL_CURVE_FACTOR: -Math.PI / 6,
        TAIL_Y_INCREMENT: 0.15, TAIL_Z_INCREMENT: 0.15,
        STINGER_RADIUS: 0.08, STINGER_HEIGHT: 0.25, STINGER_SEGMENTS: 8,
        STINGER_COLOR: 0x222222, STINGER_ROUGHNESS: 0.7, STINGER_METALNESS: 0.2,
        STINGER_ROTATION_X: -Math.PI / 2,
        CLAW_BASE_WIDTH: 0.15, CLAW_BASE_HEIGHT: 0.15, CLAW_BASE_DEPTH: 0.4,
        PINCER_WIDTH: 0.1, PINCER_HEIGHT: 0.1, PINCER_DEPTH: 0.3,
        CLAW_BASE_Z_OFFSET: 0.2,
        PINCER_UPPER_Y_OFFSET: 0.05, PINCER_LOWER_Y_OFFSET: -0.05, PINCER_Z_OFFSET: -0.15,
        CLAW_GROUP_X_OFFSET: 0.4, CLAW_GROUP_Y_POS: 0.15, CLAW_GROUP_Z_OFFSET: -0.6,
        CLAW_ROTATION_Y: Math.PI / 6,
        LEG_WIDTH: 0.05, LEG_HEIGHT: 0.1, LEG_DEPTH: 0.25,
        LEG_Y_POS: 0.1, LEG_ROTATION_Z: Math.PI / 4,
        LEG_POSITIONS: [ { x: 0.35, z: -0.3 }, { x: 0.35, z: 0 }, { x: 0.35, z: 0.3 }, { x: 0.35, z: 0.6 } ],
        GEOMETRY_DETAIL: 2,
        // Collision (Approximated)
        COLLISION_RADIUS: 0.4
    },

    // --- Buzzard ---
    BUZZARD: {
        BODY_COLOR: 0x333333, BODY_ROUGHNESS: 0.8,
        BODY_RADIUS: 0.5, BODY_SEGMENTS_W: 12, BODY_SEGMENTS_H: 8,
        BODY_SCALE_Y: 0.7, BODY_SCALE_Z: 2.0,
        HEAD_COLOR: 0x333333, HEAD_ROUGHNESS: 0.7,
        HEAD_RADIUS: 0.3, HEAD_SEGMENTS_W: 10, HEAD_SEGMENTS_H: 8,
        HEAD_Y_OFFSET: 0.1, HEAD_Z_OFFSET: -0.8,
        EYE_COLOR: 0xFFFF00, EYE_ROUGHNESS: 0.3, EYE_METALNESS: 0.2,
        EYE_RADIUS: 0.05, EYE_SEGMENTS: 8,
        EYE_X_OFFSET: 0.15, EYE_Y_POS: 0.2, EYE_Z_OFFSET: -0.9,
        BEAK_COLOR: 0x888888, BEAK_ROUGHNESS: 0.7,
        BEAK_RADIUS: 0.1, BEAK_HEIGHT: 0.4, BEAK_SEGMENTS: 8,
        BEAK_ROTATION_X: -Math.PI / 2,
        BEAK_Y_POS: 0.05, BEAK_Z_OFFSET: -1.1,
        WING_SEGMENTS: 3, WING_LENGTH: 3.0, WING_ROUGHNESS: 0.8,
        WING_SEGMENT_WIDTH_FACTOR: 0.8, WING_SEGMENT_WIDTH_REDUCTION: 0.2,
        WING_SEGMENT_HEIGHT: 0.05,
        WING_SEGMENT_ROTATION_FACTOR: Math.PI / 12,
        FEATHER_COLOR: 0x222222, FEATHER_ROUGHNESS: 0.9,
        FEATHER_WIDTH: 0.4, FEATHER_HEIGHT: 0.02, FEATHER_DEPTH: 0.15,
        FEATHER_COUNT: 5, FEATHER_X_POS: -2.8, FEATHER_Z_START: -0.3, FEATHER_Z_INCREMENT: 0.15,
        FEATHER_ROTATION_Z: Math.PI / 6,
        TAIL_WIDTH: 0.6, TAIL_HEIGHT: 0.1, TAIL_DEPTH: 0.8, TAIL_ROUGHNESS: 0.8,
        TAIL_Y_POS: 0, TAIL_Z_POS: 1.0,
        GEOMETRY_DETAIL: 2,
        // Collision (Approximated)
        COLLISION_RADIUS: 0.5 // Based on body radius
    },

    // --- Magnet ---
    MAGNET: {
        DEFAULT_SIZE: 0.8,
        DEFAULT_COLOR: 0xF60000,
        MAGNET_EMISSIVE: 0x330000, MAGNET_METALNESS: 0.9, MAGNET_ROUGHNESS: 0.05,
        TIP_COLOR: 0xFFFFFF, TIP_EMISSIVE: 0x666666, TIP_METALNESS: 0.9, TIP_ROUGHNESS: 0.05,
        BASE_WIDTH_FACTOR: 1.6, BASE_HEIGHT_FACTOR: 0.4, BASE_SEGMENTS: 16, BASE_ARC: Math.PI,
        ARM_WIDTH_FACTOR: 0.4, ARM_HEIGHT_FACTOR: 1.6, ARM_SEGMENTS: 16,
        TIP_RADIUS_FACTOR: 0.35, TIP_HEIGHT_FACTOR: 0.3, TIP_SEGMENTS: 16,
        GROUP_ROTATION_X: Math.PI / 2,
        TILTED_GROUP_ROTATION_Z: Math.PI / 6,
        TILTED_GROUP_ROTATION_Y: Math.PI / 12,
        // Collision (Approximated)
        COLLISION_RADIUS: 1.0 // Based on default size
    }
};

// Particle configuration
const particleConfig = {
    PARTICLE_DENSITY: performanceManager.getSettings().particleDensity, // Moved from RENDERING
    BASE_MAX_PARTICLES: 500,
    BASE_PARTICLE_LIFETIME: 0.8, // Seconds
    BASE_PARTICLES_PER_SECOND: 150,
    INITIAL_SPEED_MIN: 0.5,
    INITIAL_SPEED_MAX: 1.5,
    DRIFT_VELOCITY_X: 0,
    DRIFT_VELOCITY_Y: 0.8,
    DRIFT_VELOCITY_Z: -0.5,
    SIZE: 0.3,
    COLOR: 0xAAAAAA,
    LIFETIME_LOW_QUALITY_FACTOR: 0.7,
    EMIT_POS_RANDOM_FACTOR: 0.5,
    EMIT_VEL_SPREAD_FACTOR: 0.5,
    EMIT_VEL_UPWARD_BIAS_MIN: 0.2,
    EMIT_VEL_UPWARD_BIAS_MAX: 0.5,
    EMIT_VEL_BACKWARD_BIAS: -0.3,
    EMIT_ORIGIN_Y_OFFSET_FACTOR: 0.8, // Relative to player height offset
    TEXTURE_SIZE: 64,
    TEXTURE_GRADIENT_STOPS: [ // [offset, colorString]
        [0, 'rgba(255,255,255,1)'],
        [0.2, 'rgba(255,255,255,0.8)'],
        [0.4, 'rgba(200,200,200,0.3)'],
        [1, 'rgba(150,150,150,0)']
    ]
};

// Default Enemy configuration (used if level config doesn't provide)
const enemyDefaultsConfig = {
    SPEED: 5.0,
    AGGRO_RADIUS: 30.0,
    DEAGGRO_RADIUS: 40.0, // Slightly larger than aggro
    ROAMING_RADIUS: 15.0,
    ROAMING_SPEED_FACTOR: 0.5,
    ROAMING_MIN_WAIT_TIME: 2.0,
    ROAMING_MAX_WAIT_TIME: 5.0,
    POSITION_SMOOTHING_FACTOR: 0.3, // Lower = smoother
    ROTATION_SLERP_FACTOR: 0.1, // Higher = faster turning
    GROUND_CHECK_OFFSET: 2.0, // Raycast start height offset
    GROUND_SMOOTHING_FACTOR: 0.2, // Blend factor for new ground height (1.0 - this = old height factor)
    RETURN_DISTANCE_THRESHOLD: 1.0, // How close to origin to switch from RETURNING
    MOVE_THRESHOLD: 0.1, // Min distance to target to initiate move
    LOOK_THRESHOLD_SQ: 0.0001, // Min move direction squared length to update look rotation
    ANIMATION_SPEED_FACTOR: 0.8, // Multiplier for currentSpeed -> animationSpeed
    LEG_SWING_AMPLITUDE: Math.PI / 6,
    STOPPED_ANIMATION_SMOOTHING: 0.1, // Smoothing for leg rotation returning to 0
    // Specific overrides for grounding non-legged enemies
    GROUNDING_OFFSET_SNAKE: 0.5,
    GROUNDING_HEIGHT_SNAKE: 0.3,
    GROUNDING_OFFSET_SCORPION: 0.5,
    GROUNDING_HEIGHT_SCORPION: 0.3
};

// Shared Material Defaults
const materialsConfig = {
    ROCK_COLOR: 0x888888, ROCK_ROUGHNESS: 0.8,
    LOG_COLOR: 0x8B4513, LOG_ROUGHNESS: 0.9,
    CABIN_COLOR: 0xDEB887, CABIN_ROUGHNESS: 0.8,
    CACTUS_COLOR: 0x2E8B57, CACTUS_ROUGHNESS: 0.7,
    SALOON_COLOR: 0xA0522D, SALOON_ROUGHNESS: 0.8,
    // Add others as needed
};

// Fallback Geometry Parameters (used if assets fail to load or aren't defined)
const fallbackGeometriesConfig = {
    COIN: { RADIUS: 0.75, HEIGHT: 0.2, SEGMENTS: 16 },
    ROCK_SMALL: { RADIUS: 1, DETAIL: 0 }, // Using Icosahedron/Dodecahedron detail param
    ROCK_LARGE: { RADIUS: 2.5, DETAIL: 0 },
    LOG_FALLEN: { RADIUS: 0.5, HEIGHT: 5, SEGMENTS: 8 },
    CABIN: { WIDTH: 8, HEIGHT: 6, DEPTH: 10 },
    ROCK_DESERT: { RADIUS: 1.5, DETAIL: 0 },
    CACTUS_BARREL: { RAD_BOT: 1.0, RAD_TOP: 1.2, HEIGHT: 1.5, SEGMENTS: 12 },
    SALOON: { WIDTH: 12, HEIGHT: 8, DEPTH: 15 },
    SKULL: { RADIUS: 0.5, DETAIL: 0 },
    DRIED_BUSH: { RADIUS: 0.8, DETAIL: 0 },
    WAGON_WHEEL: { RADIUS: 1.0, TUBE: 0.15, RAD_SEG: 6, TUB_SEG: 12 },
    TUMBLEWEED: { RADIUS: 1.0, DETAIL: 1 }
};

// Audio configuration
const audioConfig = {
    INITIAL_MASTER_GAIN: 0.7,
    COIN: {
        DURATION: 0.1,
        FREQUENCY: 1800,
        VOLUME: 0.4,
        ATTACK_TIME: 0.005,
        DECAY_TARGET: 0.001,
        OSC_TYPE: 'square',
        // Harmony (Optional)
        USE_HARMONY: true,
        HARMONY_FACTOR: 1.5, // Perfect Fifth
        HARMONY_VOLUME_FACTOR: 0.5
    },
    COLLISION: {
        DURATION: 0.18,
        VOLUME: 0.6,
        ATTACK_TIME: 0.01,
        DECAY_TARGET: 0.001,
        // Thump (Optional)
        USE_THUMP: true,
        THUMP_FREQ: 70,
        THUMP_VOLUME_FACTOR: 0.3,
        THUMP_DECAY_FACTOR: 0.8 // Relative to main duration
    },
    BUTTON_CLICK: {
        DURATION: 0.03,
        FREQUENCY: 1000,
        VOLUME: 0.3,
        ATTACK_TIME: 0.002,
        DECAY_TARGET: 0.001,
        OSC_TYPE: 'square'
    },
    GAME_OVER: {
        NOTE_DURATION: 0.15,
        GAP: 0.08,
        START_VOLUME: 0.4,
        FREQUENCIES: [392.00, 329.63, 261.63, 261.63 * 0.8], // G4, E4, C4, ~G#3
        ATTACK_TIME: 0.01,
        HOLD_FACTOR: 0.7, // Hold note for 70% of duration before decay
        DECAY_TARGET: 0.001,
        OSC_TYPE: 'square',
        // Vibrato (Optional)
        USE_VIBRATO: true,
        VIBRATO_RATE: 10,
        VIBRATO_DEPTH: 5
    },
    TURN: {
        DURATION: 0.05,
        FREQUENCY: 300,
        VOLUME: 0.15,
        ATTACK_TIME: 0.005,
        DECAY_TARGET: 0.001,
        OSC_TYPE: 'square'
    }
};

// Debug configuration
const debugConfig = {
    SHOW_FPS: false // Whether to show FPS counter
};

// Register all configurations
configManager.setDefaults(defaultConfig);
configManager.registerConfig(SECTIONS.WORLD, worldConfig);
configManager.registerConfig(SECTIONS.TERRAIN, terrainConfig);
configManager.registerConfig(SECTIONS.PLAYER, playerConfig);
configManager.registerConfig(SECTIONS.CAMERA, cameraConfig);
configManager.registerConfig(SECTIONS.CONTROLS, controlsConfig); // Controls section remains separate
configManager.registerConfig(SECTIONS.RENDERING, renderingConfig);
configManager.registerConfig(SECTIONS.GAMEPLAY, gameplayConfig);
configManager.registerConfig(SECTIONS.TUMBLEWEED, tumbleweedConfig);
configManager.registerConfig(SECTIONS.UI, uiConfig);
configManager.registerConfig(SECTIONS.MODELS, modelsConfig);
configManager.registerConfig(SECTIONS.PARTICLES, particleConfig);
configManager.registerConfig(SECTIONS.RENDERING_ADVANCED, renderingAdvancedConfig);
configManager.registerConfig(SECTIONS.ENEMY_DEFAULTS, enemyDefaultsConfig);
configManager.registerConfig(SECTIONS.AUDIO, audioConfig);
configManager.registerConfig(SECTIONS.MATERIALS, materialsConfig);
configManager.registerConfig(SECTIONS.FALLBACK_GEOMETRIES, fallbackGeometriesConfig);
configManager.registerConfig(SECTIONS.DEBUG, debugConfig);
// Note: Input keys are part of controlsConfig now, no separate INPUT section needed for registration yet.

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
        RENDER_DISTANCE_CHUNKS: settings.renderDistance,
        MAX_OBJECTS_PER_CHUNK: settings.maxObjectsPerChunk // Update moved value
    });

    // Update rendering settings
    configManager.updateConfig(SECTIONS.RENDERING, {
        SHADOWS_ENABLED: settings.shadowsEnabled,
        PIXEL_RATIO: settings.pixelRatio,
        ANTIALIAS: settings.antialias
        // PARTICLE_DENSITY and MAX_OBJECTS_PER_CHUNK are updated in their respective sections
    });

    // Update particle settings
    configManager.updateConfig(SECTIONS.PARTICLES, {
        PARTICLE_DENSITY: settings.particleDensity // Update moved value
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
export const GAMEPLAY = configManager.getSection(SECTIONS.GAMEPLAY);
export const TUMBLEWEED = configManager.getSection(SECTIONS.TUMBLEWEED);
export const UI = configManager.getSection(SECTIONS.UI);
export const MODELS = configManager.getSection(SECTIONS.MODELS);
export const PARTICLES = configManager.getSection(SECTIONS.PARTICLES);
export const RENDERING_ADVANCED = configManager.getSection(SECTIONS.RENDERING_ADVANCED);
export const ENEMY_DEFAULTS = configManager.getSection(SECTIONS.ENEMY_DEFAULTS);
export const AUDIO = configManager.getSection(SECTIONS.AUDIO);
export const MATERIALS = configManager.getSection(SECTIONS.MATERIALS);
export const FALLBACK_GEOMETRIES = configManager.getSection(SECTIONS.FALLBACK_GEOMETRIES);

// Export individual constants for backward compatibility
// World
export const WORLD_SEED = WORLD.SEED;
export const CHUNK_SIZE = WORLD.CHUNK_SIZE;
export const RENDER_DISTANCE_CHUNKS = WORLD.RENDER_DISTANCE_CHUNKS;
export const GRID_CELL_SIZE = WORLD.GRID_CELL_SIZE;
export const PLAYER_SPAWN_SAFE_RADIUS = WORLD.PLAYER_SPAWN_SAFE_RADIUS;
export const MAX_OBJECTS_PER_CHUNK = WORLD.MAX_OBJECTS_PER_CHUNK; // Export moved value
export const LEVEL1_TRANSITION_SCORE = defaultConfig.LEVEL1_TRANSITION_SCORE; // Access directly from defaultConfig

// Terrain
export const TERRAIN_SEGMENTS_X = TERRAIN.SEGMENTS_X;
export const TERRAIN_SEGMENTS_Y = TERRAIN.SEGMENTS_Y;

// Player
export const PLAYER_SPEED = PLAYER.SPEED;
export const PLAYER_SPEED_INCREASE_RATE = PLAYER.SPEED_INCREASE_RATE;
export const PLAYER_HEIGHT_OFFSET = PLAYER.HEIGHT_OFFSET;
export const PLAYER_RAYCAST_ORIGIN_OFFSET = PLAYER.RAYCAST_ORIGIN_OFFSET;
export const PLAYER_RAYCAST_STRIDE_OFFSET = PLAYER.RAYCAST_STRIDE_OFFSET;
export const PLAYER_INITIAL_POS_X = PLAYER.INITIAL_POS_X;
export const PLAYER_INITIAL_POS_Y = PLAYER.INITIAL_POS_Y;
export const PLAYER_INITIAL_POS_Z = PLAYER.INITIAL_POS_Z;

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
export const PLAYER_DEFAULT_COLOR = PLAYER.DEFAULT_COLOR;
export const PLAYER_DEFAULT_ROUGHNESS = PLAYER.DEFAULT_ROUGHNESS;
export const PLAYER_DEFAULT_METALNESS = PLAYER.DEFAULT_METALNESS;
export const PLAYER_JOINT_SEGMENTS_W = PLAYER.JOINT_SEGMENTS_W;
export const PLAYER_JOINT_SEGMENTS_H = PLAYER.JOINT_SEGMENTS_H;
export const PLAYER_LIMB_OFFSET_FACTOR = PLAYER.LIMB_OFFSET_FACTOR;

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
export const KEY_TOGGLE_FPS = CONTROLS.KEY_TOGGLE_FPS;
export const KEY_PAUSE_RESUME_BACK = CONTROLS.KEY_PAUSE_RESUME_BACK;
export const KEY_RESTART_GAME_OVER = CONTROLS.KEY_RESTART_GAME_OVER;
export const KEY_LEVEL_SELECT_TITLE = CONTROLS.KEY_LEVEL_SELECT_TITLE;
export const TURN_SOUND_THRESHOLD = CONTROLS.TURN_SOUND_THRESHOLD;

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
// Export the default value directly to avoid potential initialization order issues with getConfig
export const MAX_DELTA_TIME = defaultConfig.MAX_DELTA_TIME;

// Gameplay
export const POWERUP_TYPE_MAGNET = GAMEPLAY.POWERUP_TYPE_MAGNET;
export const POWERUP_DURATION = GAMEPLAY.POWERUP_DURATION;
export const MAGNET_EFFECT_COLOR = GAMEPLAY.MAGNET_EFFECT_COLOR;
export const MAGNET_EFFECT_EMISSIVE = GAMEPLAY.MAGNET_EFFECT_EMISSIVE;
export const MAGNET_EFFECT_METALNESS = GAMEPLAY.MAGNET_EFFECT_METALNESS;
export const MAGNET_EFFECT_ROUGHNESS = GAMEPLAY.MAGNET_EFFECT_ROUGHNESS;
export const DEFAULT_COIN_SCORE = GAMEPLAY.DEFAULT_COIN_SCORE;
export const MAGNET_POWERUP_RADIUS = GAMEPLAY.MAGNET_POWERUP_RADIUS;
export const MAGNET_POWERUP_FORCE = GAMEPLAY.MAGNET_POWERUP_FORCE;
export const COIN_COLLECTION_RADIUS_FACTOR = GAMEPLAY.COIN_COLLECTION_RADIUS_FACTOR;
export const PLAYER_SAFE_DISTANCE_FACTOR = GAMEPLAY.PLAYER_SAFE_DISTANCE_FACTOR;
export const TREE_COLLISION_BUFFER = GAMEPLAY.TREE_COLLISION_BUFFER;

// Tumbleweed (Exporting all for potential use)
export const TW_ROLL_SPEED_MIN = TUMBLEWEED.ROLL_SPEED_MIN;
export const TW_ROLL_SPEED_MAX = TUMBLEWEED.ROLL_SPEED_MAX;
export const TW_ROTATION_SPEED_MIN = TUMBLEWEED.ROTATION_SPEED_MIN;
export const TW_ROTATION_SPEED_MAX = TUMBLEWEED.ROTATION_SPEED_MAX;
export const TW_ACTIVATION_DISTANCE = TUMBLEWEED.ACTIVATION_DISTANCE;
export const TW_DEACTIVATION_DISTANCE = TUMBLEWEED.DEACTIVATION_DISTANCE;
export const TW_TARGET_AHEAD_MIN = TUMBLEWEED.TARGET_AHEAD_MIN;
export const TW_TARGET_AHEAD_MAX = TUMBLEWEED.TARGET_AHEAD_MAX;
export const TW_TARGET_RANDOMNESS = TUMBLEWEED.TARGET_RANDOMNESS;
export const TW_INITIAL_SPEED_FACTOR_MIN = TUMBLEWEED.INITIAL_SPEED_FACTOR_MIN;
export const TW_INITIAL_SPEED_FACTOR_MAX = TUMBLEWEED.INITIAL_SPEED_FACTOR_MAX;
export const TW_UPDATE_TARGET_AHEAD_MIN = TUMBLEWEED.UPDATE_TARGET_AHEAD_MIN;
export const TW_UPDATE_TARGET_AHEAD_MAX = TUMBLEWEED.UPDATE_TARGET_AHEAD_MAX;
export const TW_UPDATE_DIRECTION_RANDOMNESS = TUMBLEWEED.UPDATE_DIRECTION_RANDOMNESS;
export const TW_STEERING_LERP_FACTOR = TUMBLEWEED.STEERING_LERP_FACTOR;
export const TW_STEERING_FORCE_FACTOR = TUMBLEWEED.STEERING_FORCE_FACTOR;
export const TW_MAX_SPEED_FACTOR = TUMBLEWEED.MAX_SPEED_FACTOR;
export const TW_WOBBLE_FACTOR = TUMBLEWEED.WOBBLE_FACTOR;
export const TW_MIN_VELOCITY_SQ_THRESHOLD = TUMBLEWEED.MIN_VELOCITY_SQ_THRESHOLD;
export const TW_TERRAIN_ADJUST_THRESHOLD = TUMBLEWEED.TERRAIN_ADJUST_THRESHOLD;
export const TW_GROUND_BOUNCE_FACTOR = TUMBLEWEED.GROUND_BOUNCE_FACTOR;
export const TW_MASS = TUMBLEWEED.MASS;
export const TW_FRICTION = TUMBLEWEED.FRICTION;
export const TW_RESTITUTION = TUMBLEWEED.RESTITUTION;
export const TW_USE_GRAVITY = TUMBLEWEED.USE_GRAVITY;
export const TW_GRAVITY_FORCE = TUMBLEWEED.GRAVITY_FORCE;
export const TW_SCALE_MIN = TUMBLEWEED.SCALE_MIN;
export const TW_SCALE_MAX = TUMBLEWEED.SCALE_MAX;
export const TW_MAIN_GEOMETRY_RADIUS = TUMBLEWEED.MAIN_GEOMETRY_RADIUS;
export const TW_MAIN_GEOMETRY_DETAIL = TUMBLEWEED.MAIN_GEOMETRY_DETAIL;
export const TW_MAIN_MATERIAL_COLOR = TUMBLEWEED.MAIN_MATERIAL_COLOR;
export const TW_MAIN_MATERIAL_ROUGHNESS = TUMBLEWEED.MAIN_MATERIAL_ROUGHNESS;
export const TW_MAIN_MATERIAL_METALNESS = TUMBLEWEED.MAIN_MATERIAL_METALNESS;
export const TW_MAIN_MATERIAL_WIREFRAME = TUMBLEWEED.MAIN_MATERIAL_WIREFRAME;
export const TW_INNER_GEOMETRY_RADIUS = TUMBLEWEED.INNER_GEOMETRY_RADIUS;
export const TW_INNER_GEOMETRY_DETAIL = TUMBLEWEED.INNER_GEOMETRY_DETAIL;
export const TW_INNER_MATERIAL_COLOR = TUMBLEWEED.INNER_MATERIAL_COLOR;
export const TW_INNER_MATERIAL_ROUGHNESS = TUMBLEWEED.INNER_MATERIAL_ROUGHNESS;
export const TW_INNER_MATERIAL_METALNESS = TUMBLEWEED.INNER_MATERIAL_METALNESS;
export const TW_OBJECT_TYPE_NAME = TUMBLEWEED.OBJECT_TYPE_NAME;

// UI
export const UI_FADE_DURATION_MS = UI.FADE_DURATION_MS;
export const UI_LOADING_HIDE_DELAY_MS = UI.LOADING_HIDE_DELAY_MS;
export const UI_PULSE_ANIMATION_DURATION_MS = UI.PULSE_ANIMATION_DURATION_MS;
export const UI_NOTIFICATION_DURATION_MS = UI.NOTIFICATION_DURATION_MS;
export const UI_NOTIFICATION_FADE_DURATION_MS = UI.NOTIFICATION_FADE_DURATION_MS;
export const UI_OPACITY_VISIBLE = UI.OPACITY_VISIBLE;
export const UI_OPACITY_HIDDEN = UI.OPACITY_HIDDEN;
export const UI_SCORE_PREFIX = UI.SCORE_PREFIX;
export const UI_HIGH_SCORE_PREFIX = UI.HIGH_SCORE_PREFIX;
export const UI_LOADING_TEXT_PREFIX = UI.LOADING_TEXT_PREFIX;
export const UI_LOADING_TEXT_SUFFIX = UI.LOADING_TEXT_SUFFIX;
export const UI_LOCKED_LEVEL_TEXT = UI.LOCKED_LEVEL_TEXT;

// Advanced Rendering / Shadows
export const SHADOW_MAP_SIZE_LOW = RENDERING_ADVANCED.SHADOW_MAP_SIZE_LOW;
export const SHADOW_MAP_SIZE_MEDIUM = RENDERING_ADVANCED.SHADOW_MAP_SIZE_MEDIUM;
export const SHADOW_MAP_SIZE_HIGH = RENDERING_ADVANCED.SHADOW_MAP_SIZE_HIGH;
export const SHADOW_CAMERA_NEAR = RENDERING_ADVANCED.SHADOW_CAMERA_NEAR;
export const SHADOW_CAMERA_FAR = RENDERING_ADVANCED.SHADOW_CAMERA_FAR;
export const SHADOW_BIAS = RENDERING_ADVANCED.SHADOW_BIAS;
export const SHADOW_FRUSTUM_SIZE = RENDERING_ADVANCED.SHADOW_FRUSTUM_SIZE;
export const INITIAL_CAMERA_POS_X = RENDERING_ADVANCED.INITIAL_CAMERA_POS_X;
export const INITIAL_CAMERA_POS_Y = RENDERING_ADVANCED.INITIAL_CAMERA_POS_Y;
export const INITIAL_CAMERA_POS_Z = RENDERING_ADVANCED.INITIAL_CAMERA_POS_Z;
export const FPS_COUNTER_PREFIX = RENDERING_ADVANCED.FPS_COUNTER_PREFIX;
export const FPS_COUNTER_SEPARATOR = RENDERING_ADVANCED.FPS_COUNTER_SEPARATOR;

// Enemy Defaults (Exporting all for potential use)
export const ENEMY_DEFAULT_SPEED = ENEMY_DEFAULTS.SPEED;
export const ENEMY_DEFAULT_AGGRO_RADIUS = ENEMY_DEFAULTS.AGGRO_RADIUS;
export const ENEMY_DEFAULT_DEAGGRO_RADIUS = ENEMY_DEFAULTS.DEAGGRO_RADIUS;
export const ENEMY_DEFAULT_ROAMING_RADIUS = ENEMY_DEFAULTS.ROAMING_RADIUS;
export const ENEMY_DEFAULT_ROAMING_SPEED_FACTOR = ENEMY_DEFAULTS.ROAMING_SPEED_FACTOR;
export const ENEMY_DEFAULT_ROAMING_MIN_WAIT = ENEMY_DEFAULTS.ROAMING_MIN_WAIT_TIME;
export const ENEMY_DEFAULT_ROAMING_MAX_WAIT = ENEMY_DEFAULTS.ROAMING_MAX_WAIT_TIME;
export const ENEMY_POSITION_SMOOTHING = ENEMY_DEFAULTS.POSITION_SMOOTHING_FACTOR;
export const ENEMY_ROTATION_SLERP = ENEMY_DEFAULTS.ROTATION_SLERP_FACTOR;
export const ENEMY_GROUND_CHECK_OFFSET = ENEMY_DEFAULTS.GROUND_CHECK_OFFSET;
export const ENEMY_GROUND_SMOOTHING = ENEMY_DEFAULTS.GROUND_SMOOTHING_FACTOR;
export const ENEMY_RETURN_THRESHOLD = ENEMY_DEFAULTS.RETURN_DISTANCE_THRESHOLD;
export const ENEMY_MOVE_THRESHOLD = ENEMY_DEFAULTS.MOVE_THRESHOLD;
export const ENEMY_LOOK_THRESHOLD_SQ = ENEMY_DEFAULTS.LOOK_THRESHOLD_SQ;
export const ENEMY_ANIMATION_SPEED_FACTOR = ENEMY_DEFAULTS.ANIMATION_SPEED_FACTOR;
export const ENEMY_LEG_SWING_AMPLITUDE = ENEMY_DEFAULTS.LEG_SWING_AMPLITUDE;
export const ENEMY_STOPPED_ANIM_SMOOTHING = ENEMY_DEFAULTS.STOPPED_ANIMATION_SMOOTHING;
export const ENEMY_GROUND_OFFSET_SNAKE = ENEMY_DEFAULTS.GROUNDING_OFFSET_SNAKE;
export const ENEMY_GROUND_HEIGHT_SNAKE = ENEMY_DEFAULTS.GROUNDING_HEIGHT_SNAKE;
export const ENEMY_GROUND_OFFSET_SCORPION = ENEMY_DEFAULTS.GROUNDING_OFFSET_SCORPION;
export const ENEMY_GROUND_HEIGHT_SCORPION = ENEMY_DEFAULTS.GROUNDING_HEIGHT_SCORPION;

// Audio (Exporting only the top-level object)


// Particles
export const P_PARTICLE_DENSITY = PARTICLES.PARTICLE_DENSITY; // Export moved constant
export const P_BASE_MAX_PARTICLES = PARTICLES.BASE_MAX_PARTICLES;
export const P_BASE_PARTICLE_LIFETIME = PARTICLES.BASE_PARTICLE_LIFETIME;
export const P_BASE_PARTICLES_PER_SECOND = PARTICLES.BASE_PARTICLES_PER_SECOND;
export const P_INITIAL_SPEED_MIN = PARTICLES.INITIAL_SPEED_MIN;
export const P_INITIAL_SPEED_MAX = PARTICLES.INITIAL_SPEED_MAX;
export const P_DRIFT_VELOCITY_X = PARTICLES.DRIFT_VELOCITY_X;
export const P_DRIFT_VELOCITY_Y = PARTICLES.DRIFT_VELOCITY_Y;
export const P_DRIFT_VELOCITY_Z = PARTICLES.DRIFT_VELOCITY_Z;
export const P_SIZE = PARTICLES.SIZE;
export const P_COLOR = PARTICLES.COLOR;
export const P_LIFETIME_LOW_QUALITY_FACTOR = PARTICLES.LIFETIME_LOW_QUALITY_FACTOR;
export const P_EMIT_POS_RANDOM_FACTOR = PARTICLES.EMIT_POS_RANDOM_FACTOR;
export const P_EMIT_VEL_SPREAD_FACTOR = PARTICLES.EMIT_VEL_SPREAD_FACTOR;
export const P_EMIT_VEL_UPWARD_BIAS_MIN = PARTICLES.EMIT_VEL_UPWARD_BIAS_MIN;
export const P_EMIT_VEL_UPWARD_BIAS_MAX = PARTICLES.EMIT_VEL_UPWARD_BIAS_MAX;
export const P_EMIT_VEL_BACKWARD_BIAS = PARTICLES.EMIT_VEL_BACKWARD_BIAS;
export const P_EMIT_ORIGIN_Y_OFFSET_FACTOR = PARTICLES.EMIT_ORIGIN_Y_OFFSET_FACTOR;
export const P_TEXTURE_SIZE = PARTICLES.TEXTURE_SIZE;
export const P_TEXTURE_GRADIENT_STOPS = PARTICLES.TEXTURE_GRADIENT_STOPS;

// Materials (Exporting only the top-level object)
// Access via MATERIALS.ROCK_COLOR etc.

// Fallback Geometries (Exporting only the top-level object)
// Access via FALLBACK_GEOMETRIES.COIN.RADIUS etc.

// Export performance manager
export { performanceManager };

// Export the config manager for advanced usage
export default configManager;