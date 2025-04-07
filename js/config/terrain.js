// js/config/terrain.js
import performanceManager from '../utils/performanceManager.js';

// Terrain configuration
export const terrainConfig = {
    SEGMENTS_X: performanceManager.getSettings().terrainSegments, // Number of segments in the plane geometry per chunk
    SEGMENTS_Y: performanceManager.getSettings().terrainSegments  // Higher means more detail but less performance
};