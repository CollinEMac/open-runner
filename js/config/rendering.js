// js/config/rendering.js
import performanceManager from '../utils/performanceManager.js';

// Rendering configuration (Basic)
export const renderingConfig = {
    SHADOWS_ENABLED: performanceManager.getSettings().shadowsEnabled,
    PIXEL_RATIO: performanceManager.getSettings().pixelRatio,
    ANTIALIAS: performanceManager.getSettings().antialias
    // PARTICLE_DENSITY moved to particleConfig
    // MAX_OBJECTS_PER_CHUNK moved to worldConfig
};