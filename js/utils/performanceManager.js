// js/utils/performanceManager.js

import { createLogger } from './logger.js';

const logger = createLogger('PerformanceManager');

/**
 * Quality presets for different performance levels
 */
export const QualityPresets = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    ULTRA: 'ultra',
    AUTO: 'auto' // Automatically determined based on device capabilities
};

/**
 * Performance settings for different quality levels
 */
const qualitySettings = {
    [QualityPresets.LOW]: {
        terrainSegments: 20,
        renderDistance: 3,
        shadowsEnabled: false,
        pixelRatio: 0.75,
        particleDensity: 0.5,
        antialias: false,
        maxObjectsPerChunk: 15
    },
    [QualityPresets.MEDIUM]: {
        terrainSegments: 30,
        renderDistance: 4,
        shadowsEnabled: true,
        pixelRatio: 1.0,
        particleDensity: 0.75,
        antialias: true,
        maxObjectsPerChunk: 25
    },
    [QualityPresets.HIGH]: {
        terrainSegments: 40,
        renderDistance: 5,
        shadowsEnabled: true,
        pixelRatio: window.devicePixelRatio,
        particleDensity: 1.0,
        antialias: true,
        maxObjectsPerChunk: 35
    },
    [QualityPresets.ULTRA]: {
        terrainSegments: 50,
        renderDistance: 6,
        shadowsEnabled: true,
        pixelRatio: window.devicePixelRatio,
        particleDensity: 1.5,
        antialias: true,
        maxObjectsPerChunk: 50
    }
};

/**
 * Manages performance settings and monitoring
 */
class PerformanceManager {
    constructor() {
        this.currentQuality = QualityPresets.AUTO;
        this.settings = { ...qualitySettings[QualityPresets.MEDIUM] }; // Default to medium
        this.fpsHistory = [];
        this.fpsUpdateInterval = 500; // ms
        this.lastFpsUpdate = 0;
        this.frameCount = 0;
        this.adaptiveQualityEnabled = true;
        this.targetFps = 50; // Target FPS for adaptive quality
        this.adaptiveQualityThreshold = 5; // FPS difference to trigger quality change
        this.adaptiveQualityCooldown = 5000; // ms between adaptive quality changes
        this.lastQualityChange = 0;
        this.onSettingsChanged = null; // Callback for when settings change
    }

    /**
     * Initialize the performance manager
     */
    init() {
        logger.debug('Initializing performance manager');

        // Detect device capabilities and set initial quality
        if (this.currentQuality === QualityPresets.AUTO) {
            this.detectDeviceCapabilities();
        }

        // Initialize FPS monitoring
        this.initFpsMonitoring();

        logger.debug(`Initial quality set to ${this.currentQuality}`);
        return this;
    }

    /**
     * Detect device capabilities and set appropriate quality preset
     */
    detectDeviceCapabilities() {
        // Check if running on mobile - only use user agent and touch capability
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);

        // Check GPU capabilities via WebGL
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) {
            logger.warn('WebGL not supported, defaulting to LOW quality');
            this.setQuality(QualityPresets.LOW);
            return;
        }

        // Get WebGL info
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';

        logger.debug(`Detected renderer: ${renderer}`);

        // Determine quality based on device and renderer
        if (isMobile) {
            // Mobile devices
            if (renderer.includes('Apple') || renderer.includes('Mali-G') || renderer.includes('Adreno 6') || renderer.includes('Adreno 7')) {
                this.setQuality(QualityPresets.MEDIUM);
            } else {
                this.setQuality(QualityPresets.LOW);
            }
        } else {
            // Desktop devices
            if (renderer.includes('NVIDIA') || renderer.includes('AMD') || renderer.includes('Radeon')) {
                this.setQuality(QualityPresets.HIGH);
            } else if (renderer.includes('Intel')) {
                this.setQuality(QualityPresets.MEDIUM);
            } else {
                this.setQuality(QualityPresets.MEDIUM);
            }
        }
    }

    /**
     * Initialize FPS monitoring
     */
    initFpsMonitoring() {
        // Reset FPS tracking
        this.fpsHistory = [];
        this.lastFpsUpdate = performance.now();
        this.frameCount = 0;
    }

    /**
     * Update FPS tracking
     */
    updateFps() {
        this.frameCount++;

        const now = performance.now();
        const elapsed = now - this.lastFpsUpdate;

        if (elapsed >= this.fpsUpdateInterval) {
            const fps = (this.frameCount * 1000) / elapsed;
            this.fpsHistory.push(fps);

            // Keep history limited to last 10 readings
            if (this.fpsHistory.length > 10) {
                this.fpsHistory.shift();
            }

            // Reset counters
            this.lastFpsUpdate = now;
            this.frameCount = 0;

            // Check if we need to adapt quality
            if (this.adaptiveQualityEnabled) {
                this.checkAdaptiveQuality();
            }
        }
    }

    /**
     * Get the current FPS (average of recent history)
     * @returns {number} Current FPS
     */
    getCurrentFps() {
        if (this.fpsHistory.length === 0) return 60;

        const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
        return sum / this.fpsHistory.length;
    }

    /**
     * Check if quality needs to be adapted based on FPS
     */
    checkAdaptiveQuality() {
        const now = performance.now();
        if (now - this.lastQualityChange < this.adaptiveQualityCooldown) {
            return; // Still in cooldown period
        }

        const currentFps = this.getCurrentFps();

        // If FPS is too low, decrease quality
        if (currentFps < this.targetFps - this.adaptiveQualityThreshold) {
            this.decreaseQuality();
            this.lastQualityChange = now;
        }
        // If FPS is high enough, consider increasing quality
        else if (currentFps > this.targetFps + this.adaptiveQualityThreshold * 2) {
            this.increaseQuality();
            this.lastQualityChange = now;
        }
    }

    /**
     * Decrease quality to improve performance
     */
    decreaseQuality() {
        const qualityLevels = [QualityPresets.LOW, QualityPresets.MEDIUM, QualityPresets.HIGH, QualityPresets.ULTRA];
        const currentIndex = qualityLevels.indexOf(this.currentQuality);

        if (currentIndex > 0) {
            const newQuality = qualityLevels[currentIndex - 1];
            logger.debug(`Decreasing quality from ${this.currentQuality} to ${newQuality} due to low FPS`);
            this.setQuality(newQuality);
        }
    }

    /**
     * Increase quality if performance allows
     */
    increaseQuality() {
        const qualityLevels = [QualityPresets.LOW, QualityPresets.MEDIUM, QualityPresets.HIGH, QualityPresets.ULTRA];
        const currentIndex = qualityLevels.indexOf(this.currentQuality);

        if (currentIndex < qualityLevels.length - 1) {
            const newQuality = qualityLevels[currentIndex + 1];
            logger.debug(`Increasing quality from ${this.currentQuality} to ${newQuality} due to high FPS`);
            this.setQuality(newQuality);
        }
    }

    /**
     * Set quality preset
     * @param {string} quality - Quality preset to use
     */
    setQuality(quality) {
        if (!qualitySettings[quality]) {
            logger.error(`Invalid quality preset: ${quality}`);
            return;
        }

        this.currentQuality = quality;
        this.settings = { ...qualitySettings[quality] };

        logger.debug(`Quality set to ${quality}`, this.settings);

        // Notify listeners
        if (this.onSettingsChanged) {
            this.onSettingsChanged(this.settings);
        }
    }

    /**
     * Get current performance settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Set a specific setting
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    setSetting(key, value) {
        if (this.settings[key] !== undefined) {
            this.settings[key] = value;

            // Custom quality when manually changing settings
            this.currentQuality = 'custom';

            // Notify listeners
            if (this.onSettingsChanged) {
                this.onSettingsChanged(this.settings);
            }
        }
    }

    /**
     * Enable or disable adaptive quality
     * @param {boolean} enabled - Whether adaptive quality is enabled
     */
    setAdaptiveQuality(enabled) {
        this.adaptiveQualityEnabled = enabled;
        logger.debug(`Adaptive quality ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set callback for when settings change
     * @param {Function} callback - Callback function
     */
    setOnSettingsChanged(callback) {
        this.onSettingsChanged = callback;
    }
}

// Create singleton instance
const performanceManager = new PerformanceManager();

export default performanceManager;
