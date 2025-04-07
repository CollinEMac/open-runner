// js/config/world.js
import performanceManager from '../utils/performanceManager.js';

// World generation configuration
export const worldConfig = {
    SEED: 'open-runner-seed', // Fixed seed for consistent world generation
    CHUNK_SIZE: 100, // Width and depth of a single terrain chunk
    RENDER_DISTANCE_CHUNKS: performanceManager.getSettings().renderDistance, // Render distance in chunks (from performance settings)
    GRID_CELL_SIZE: 25, // Size of cells in the spatial grid for collision detection
    PLAYER_SPAWN_SAFE_RADIUS: 20, // Reduced minimum distance objects can spawn from player's spawn point
    MAX_OBJECTS_PER_CHUNK: performanceManager.getSettings().maxObjectsPerChunk // Moved from RENDERING
};