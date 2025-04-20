import performanceManager from '../utils/performanceManager.js';
export const terrainConfig = {
    SEGMENTS_X: performanceManager.getSettings().terrainSegments,
    SEGMENTS_Y: performanceManager.getSettings().terrainSegments
};