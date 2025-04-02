// js/config.js
// Contains GLOBAL game configurations. Level-specific settings are in js/levels/

// Using a fixed seed for consistent world generation during development
// Change this or use Math.random() for different worlds each time
// TODO: Consider if WORLD_SEED should be level-specific later.
export const WORLD_SEED = 'open-runner-seed';

// --- Chunk System ---
export const CHUNK_SIZE = 100; // Width and depth of a single terrain chunk
export const RENDER_DISTANCE_CHUNKS = 5; // Render distance in chunks

// Number of segments in the plane geometry per chunk
// Higher means more detail but less performance. Could potentially be level-specific later.
export const TERRAIN_SEGMENTS_X = 50;
export const TERRAIN_SEGMENTS_Y = 50;

// --- Player ---
export const PLAYER_SPEED = 15.0; // Initial units per second
export const PLAYER_SPEED_INCREASE_RATE = 0.25; // Units per second, per second
export const PLAYER_HEIGHT_OFFSET = 3.5; // Approx distance from player origin to feet
export const PLAYER_RAYCAST_ORIGIN_OFFSET = 5; // How far above player to start ground raycast
export const PLAYER_RAYCAST_STRIDE_OFFSET = 1.0; // How far forward/back to cast ground rays

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
export const PLAYER_ANIMATION_BASE_SPEED = 3.0;
export const PLAYER_MAX_ANIMATION_SPEED_FACTOR = 2.0;
export const PLAYER_ARM_SWING_AMPLITUDE = Math.PI / 3;
export const PLAYER_LEG_SWING_AMPLITUDE = Math.PI / 4;
export const PLAYER_ELBOW_BEND_AMPLITUDE = Math.PI / 2.5;
export const PLAYER_KNEE_BEND_AMPLITUDE = Math.PI / 2;

// --- Mouse Controls ---
export const MOUSE_SENSITIVITY = 0.002;
export const PLAYER_TILT_FACTOR = 0.25;
export const PLAYER_TILT_SMOOTHING = 0.1;
export const PLAYER_KEY_TURN_SPEED = Math.PI / 1.5;

// --- Camera ---
export const CAMERA_FOV = 75;
export const CAMERA_NEAR_PLANE = 0.1;
export const CAMERA_FAR_PLANE = 2000; // Far plane might need adjustment based on level fog
export const CAMERA_FOLLOW_OFFSET_X = 0;
export const CAMERA_FOLLOW_OFFSET_Y = 15;
export const CAMERA_FOLLOW_OFFSET_Z = 30;
export const CAMERA_LOOK_AT_OFFSET_Y = 2;
export const CAMERA_SMOOTHING_FACTOR = 0.01;

// NOTE: Level-specific settings like terrain noise, colors, fog, lighting,
// object types, and enemy properties have been moved to files in js/levels/
