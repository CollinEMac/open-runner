// js/config.js

// Using a fixed seed for consistent world generation during development
// Change this or use Math.random() for different worlds each time
export const WORLD_SEED = 'open-runner-seed';

// Dimensions of the terrain plane (Original - less relevant with chunks)
export const TERRAIN_WIDTH = 500;
export const TERRAIN_HEIGHT = 500; // Note: This will become less relevant with chunks

// --- Chunk System ---
export const CHUNK_SIZE = 100; // Width and depth of a single terrain chunk
export const RENDER_DISTANCE_CHUNKS = 5; // Render distance in chunks (Increased after optimizations)

// Number of segments in the plane geometry (higher means more detail but less performance)
// This will now apply per chunk
export const TERRAIN_SEGMENTS_X = 50; // Reduced segments per chunk initially for performance
export const TERRAIN_SEGMENTS_Y = 50;

// Noise parameters for terrain height
export const NOISE_FREQUENCY = 0.01; // How close together the hills are (lower = wider hills)
export const NOISE_AMPLITUDE = 8;   // How high the hills are (larger = higher peaks/deeper valleys)

// Optional: Add more noise layers (octaves) for detail later
// export const NOISE_OCTAVES = 4;
// export const NOISE_PERSISTENCE = 0.5; // How much each octave contributes


// --- Player ---
export const PLAYER_SPEED = 15.0; // Initial units per second
// export const PLAYER_MAX_SPEED = 25.0; // Removed - Speed increases indefinitely
export const PLAYER_SPEED_INCREASE_RATE = 0.25; // Units per second, per second (Reduced for ~2min target)
export const PLAYER_HEIGHT_OFFSET = 3.5; // Approx distance from player origin (center torso) to feet for raycasting
export const PLAYER_RAYCAST_ORIGIN_OFFSET = 5; // How far above the player's current position to start the terrain-following raycast
export const PLAYER_RAYCAST_STRIDE_OFFSET = 1.0; // How far forward/back to cast rays for terrain check

// --- Player Model Dimensions ---
export const PLAYER_HEAD_SIZE = 1.5;
export const PLAYER_TORSO_HEIGHT = 3;
export const PLAYER_TORSO_WIDTH = 2;
export const PLAYER_TORSO_DEPTH = 1;
export const PLAYER_LIMB_WIDTH = 0.75;
export const PLAYER_ARM_LENGTH = 2.5;
export const PLAYER_LEG_LENGTH = 3;
// Derived:
export const PLAYER_UPPER_ARM_LENGTH = PLAYER_ARM_LENGTH * 0.5;
export const PLAYER_FOREARM_LENGTH = PLAYER_ARM_LENGTH * 0.5;
export const PLAYER_THIGH_LENGTH = PLAYER_LEG_LENGTH * 0.5;
export const PLAYER_CALF_LENGTH = PLAYER_LEG_LENGTH * 0.5;
export const PLAYER_JOINT_RADIUS = PLAYER_LIMB_WIDTH / 1.5;

// --- Player Animation ---
export const PLAYER_ANIMATION_BASE_SPEED = 3.0; // Base multiplier for animation frequency (Increased for faster start)
export const PLAYER_MAX_ANIMATION_SPEED_FACTOR = 2.0; // Max multiplier for animation speed (prevents excessive flailing)
export const PLAYER_ARM_SWING_AMPLITUDE = Math.PI / 3;
export const PLAYER_LEG_SWING_AMPLITUDE = Math.PI / 4;
export const PLAYER_ELBOW_BEND_AMPLITUDE = Math.PI / 2.5;
export const PLAYER_KNEE_BEND_AMPLITUDE = Math.PI / 2;

// --- Mouse Controls ---
export const MOUSE_SENSITIVITY = 0.002; // Radians turned per pixel moved
export const PLAYER_TILT_FACTOR = 0.25; // Radians tilted per unit of rotation speed (approx) - Reduced
export const PLAYER_TILT_SMOOTHING = 0.1; // Smoothing factor for tilt return (lower = slower)
export const PLAYER_KEY_TURN_SPEED = Math.PI / 1.5; // Radians per second (120 deg/sec)

// --- Camera ---
export const CAMERA_FOV = 75;
export const CAMERA_NEAR_PLANE = 0.1;
export const CAMERA_FAR_PLANE = 2000;
export const CAMERA_FOLLOW_OFFSET_X = 0;
export const CAMERA_FOLLOW_OFFSET_Y = 15;
export const CAMERA_FOLLOW_OFFSET_Z = 30;
export const CAMERA_LOOK_AT_OFFSET_Y = 2;
export const CAMERA_SMOOTHING_FACTOR = 0.01; // Lower = slower smoothing (used in 1 - Math.pow(factor, deltaTime))

// --- Scene ---
export const SCENE_BACKGROUND_COLOR = 0x87CEEB;
export const SCENE_FOG_COLOR = 0x87CEEB;
export const SCENE_FOG_NEAR = 35;
export const SCENE_FOG_FAR = 1000;

// --- Lighting ---
export const AMBIENT_LIGHT_COLOR = 0xffffff;
export const AMBIENT_LIGHT_INTENSITY = 0.6;
export const DIRECTIONAL_LIGHT_COLOR = 0xffffff;
export const DIRECTIONAL_LIGHT_INTENSITY = 0.8;
export const DIRECTIONAL_LIGHT_POS_X = 100;
export const DIRECTIONAL_LIGHT_POS_Y = 100;
export const DIRECTIONAL_LIGHT_POS_Z = 50;

// --- Enemies --- // Define constants BEFORE they are used in OBJECT_TYPES
export const ENEMY_DEFAULT_SPEED = 5.0; // Fallback speed
export const ENEMY_DEFAULT_AGGRO_RADIUS = 30.0; // Fallback aggro distance (doubled)
export const ENEMY_DEFAULT_DEAGGRO_RADIUS = 30.0; // Fallback de-aggro distance
export const ENEMY_SPAWN_DENSITY = 0.000125; // Overall density for any enemy type (Increased ~25%)

// --- Enemy Roaming ---
export const ENEMY_ROAMING_RADIUS = 15.0; // How far from origin they can roam
export const ENEMY_ROAMING_SPEED_FACTOR = 0.5; // Multiplier for their normal speed when roaming
export const ENEMY_ROAMING_MIN_WAIT_TIME = 2.0; // Seconds (minimum time to pause after reaching roam target)
export const ENEMY_ROAMING_MAX_WAIT_TIME = 5.0; // Seconds (maximum time to pause)


// --- Specific Enemy Properties ---
// Bear
export const ENEMY_BEAR_SPEED = 8.0; // Slower than player
export const ENEMY_BEAR_AGGRO_RADIUS = 40.0; // (doubled)
export const ENEMY_BEAR_DEAGGRO_RADIUS = 40.0;
export const ENEMY_BEAR_COLOR = 0x8B4513; // Brown
// export const ENEMY_BEAR_DENSITY = 0.00003; // No longer used for calculation
export const ENEMY_BEAR_MIN_DISTANCE = 25.0;

// Squirrel
export const ENEMY_SQUIRREL_SPEED = 12.0; // Faster, closer to player speed
export const ENEMY_SQUIRREL_AGGRO_RADIUS = 20.0; // Smaller aggro (doubled)
export const ENEMY_SQUIRREL_DEAGGRO_RADIUS = 25.0;
export const ENEMY_SQUIRREL_COLOR = 0xA0522D; // Sienna/Reddish-brown
// export const ENEMY_SQUIRREL_DENSITY = 0.0001; // No longer used for calculation
export const ENEMY_SQUIRREL_MIN_DISTANCE = 8.0;

// Deer
export const ENEMY_DEER_SPEED = 10.0; // Faster than bear, slower than squirrel
export const ENEMY_DEER_AGGRO_RADIUS = 36.0; // (doubled)
export const ENEMY_DEER_DEAGGRO_RADIUS = 35.0;
export const ENEMY_DEER_COLOR = 0xD2B48C; // Tan
// export const ENEMY_DEER_DENSITY = 0.00008; // No longer used for calculation
export const ENEMY_DEER_MIN_DISTANCE = 15.0;


// --- Object Generation ---
// Defines properties for all placeable objects (coins, obstacles, enemies)
export const OBJECT_TYPES = [
    // --- Coins (Adapted from previous constants) ---
    {
        type: 'coin',
        density: 0.00031, // Approx per square unit (Increased ~25%)
        minDistance: 3.0,
        verticalOffset: 1.5,
        scaleRange: [1, 1], // No scaling
        randomRotationY: true, // Coins spin, handled separately, but set true for consistency
        collidable: false,
        scoreValue: 10,
        maxPlacementAttempts: 10,
        // Visuals defined separately for now (radius, height, color)
    },
    // --- Obstacles ---
    {
        type: 'rock_small',
        density: 0.00019, // Slightly less common than coins (Increased ~25%)
        minDistance: 2.0, // Can be closer than coins
        verticalOffset: 0.5, // Sits mostly on the ground
        scaleRange: [0.8, 2.4], // Random size variation (1x to 3x)
        randomRotationY: true,
        collidable: true,
        scoreValue: 0,
        maxPlacementAttempts: 8,
    },
    {
        type: 'rock_large',
        density: 0.000063, // Less common (Increased ~25%)
        minDistance: 5.0, // Needs more space
        verticalOffset: 1.0, // Sits higher
        scaleRange: [1.5, 4.5], // Random size variation (1x to 3x)
        randomRotationY: true,
        collidable: true,
        scoreValue: 0,
        maxPlacementAttempts: 10,
    },
    {
        type: 'tree_pine',
        density: 0.00025, // Fairly common (Increased ~25%)
        minDistance: 4.0, // Keep minimum distance reasonable
        verticalOffset: 0, // Base sits on the ground (group origin)
        scaleRange: [1.5, 3.0], // Increased scale range for bigger trees
        randomRotationY: true, // Slight rotation looks more natural
        collidable: true,
        scoreValue: 0,
        maxPlacementAttempts: 10,
    },
    {
        type: 'log_fallen',
        density: 0.000126, // Uncommon (Increased ~25%) -> Doubled density
        minDistance: 5.0, // Logs take up space -> Reduced distance requirement
        verticalOffset: 0.2, // Slightly above ground
        scaleRange: [0.8, 3.5], // Increased length/thickness variation
        randomRotationY: true,
        collidable: true,
        scoreValue: 0,
        maxPlacementAttempts: 12,
    },
    {
        type: 'cabin_simple',
        density: 0.0000063, // Very rare (Increased ~25%)
        minDistance: 15.0, // Needs significant clear space
        verticalOffset: 0, // Sits on ground
        scaleRange: [1, 1], // Fixed size for now
        randomRotationY: false, // Usually aligned N/S/E/W, maybe add later
        collidable: true,
        scoreValue: 0,
        maxPlacementAttempts: 15, // Higher attempts due to rarity/size
    },
    // --- Enemies (Will be handled separately in objectGenerator.js now) ---
    /* Remove enemy definitions from here
    {
        type: 'bear',
        // density: ENEMY_BEAR_DENSITY, // Use general ENEMY_SPAWN_DENSITY
        minDistance: ENEMY_BEAR_MIN_DISTANCE,
        verticalOffset: 0.1, // Place base slightly above terrain
        scaleRange: [1, 1], // Fixed size for now
        randomRotationY: true,
        collidable: true, // Enemies are collidable
        scoreValue: 0,
        maxPlacementAttempts: 15,
    },
    {
        type: 'squirrel',
        // density: ENEMY_SQUIRREL_DENSITY, // Use general ENEMY_SPAWN_DENSITY
        minDistance: ENEMY_SQUIRREL_MIN_DISTANCE,
        verticalOffset: 0.1, // Place base slightly above terrain
        scaleRange: [1, 1],
        randomRotationY: true,
        collidable: true,
        scoreValue: 0,
        maxPlacementAttempts: 10,
    },
    {
        type: 'deer',
        // density: ENEMY_DEER_DENSITY, // Use general ENEMY_SPAWN_DENSITY
        minDistance: ENEMY_DEER_MIN_DISTANCE,
        verticalOffset: 0.1, // Place base slightly above terrain
        scaleRange: [1, 1],
        randomRotationY: true,
        collidable: true,
        scoreValue: 0,
        maxPlacementAttempts: 12,
    },
    */
];

// --- Coins (Legacy - Visual/Behavioral Defaults) ---
// Note: Placement logic (Density, MinDistance, VerticalOffset, MaxAttempts, ScoreValue)
// is now primarily controlled by OBJECT_TYPES['coin'] above.
// These constants might still be used for direct visual creation if needed.
export const COIN_RADIUS = 0.75;
export const COIN_HEIGHT = 0.2;
export const COIN_COLOR = 0xFFFF00; // Yellow
export const COIN_SPIN_SPEED = 1.0; // Radians per second


// console.log('Config loaded'); // Removed log
