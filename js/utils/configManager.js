// js/utils/configManager.js

import { createLogger } from './logger.js';

const logger = createLogger('ConfigManager');

/**
 * Manages game configuration with support for overrides and defaults
 */
class ConfigManager {
    constructor() {
        // Core configuration storage
        this.configs = new Map();
        
        // Default configuration
        this.defaultConfig = {};
    }
    
    /**
     * Sets the default configuration values
     * @param {Object} defaultConfig - Default configuration object
     */
    setDefaults(defaultConfig) {
        if (!defaultConfig || typeof defaultConfig !== 'object') {
            logger.error('Invalid default config provided');
            return;
        }
        
        this.defaultConfig = { ...defaultConfig };
        logger.debug('Default configuration set', this.defaultConfig);
    }
    
    /**
     * Registers a configuration section
     * @param {string} section - Section name
     * @param {Object} config - Configuration object for this section
     * @param {boolean} [override=false] - Whether to override existing config
     * @returns {boolean} Whether the registration was successful
     */
    registerConfig(section, config, override = false) {
        if (!section || typeof section !== 'string') {
            logger.error('Invalid section name');
            return false;
        }
        
        if (!config || typeof config !== 'object') {
            logger.error(`Invalid config for section "${section}"`);
            return false;
        }
        
        if (this.configs.has(section) && !override) {
            logger.warn(`Config section "${section}" already exists and override is false`);
            return false;
        }
        
        this.configs.set(section, { ...config });
        logger.debug(`Registered config for section "${section}"`, config);
        return true;
    }
    
    /**
     * Updates a configuration section
     * @param {string} section - Section name
     * @param {Object} updates - Configuration updates
     * @returns {boolean} Whether the update was successful
     */
    updateConfig(section, updates) {
        if (!this.configs.has(section)) {
            logger.warn(`Cannot update non-existent config section "${section}"`);
            return false;
        }
        
        if (!updates || typeof updates !== 'object') {
            logger.error(`Invalid updates for section "${section}"`);
            return false;
        }
        
        const currentConfig = this.configs.get(section);
        this.configs.set(section, { ...currentConfig, ...updates });
        logger.debug(`Updated config for section "${section}"`, updates);
        return true;
    }
    
    /**
     * Gets a configuration value
     * @param {string} key - Configuration key in format "section.key" or just "key" for default section
     * @param {*} [defaultValue] - Default value if key not found
     * @returns {*} Configuration value or default
     */
    get(key, defaultValue) {
        if (!key || typeof key !== 'string') {
            logger.error('Invalid config key');
            return defaultValue;
        }
        
        const parts = key.split('.');
        
        // Handle default section
        if (parts.length === 1) {
            return this.defaultConfig[key] !== undefined 
                ? this.defaultConfig[key] 
                : defaultValue;
        }
        
        // Handle section.key format
        const [section, ...keyParts] = parts;
        const sectionKey = keyParts.join('.');
        
        if (!this.configs.has(section)) {
            logger.debug(`Config section "${section}" not found, using default value`);
            return defaultValue;
        }
        
        const sectionConfig = this.configs.get(section);
        return sectionConfig[sectionKey] !== undefined 
            ? sectionConfig[sectionKey] 
            : defaultValue;
    }
    
    /**
     * Gets an entire configuration section
     * @param {string} section - Section name
     * @returns {Object|null} Configuration section or null if not found
     */
    getSection(section) {
        if (!this.configs.has(section)) {
            logger.debug(`Config section "${section}" not found`);
            return null;
        }
        
        // Return a copy to prevent modification
        return { ...this.configs.get(section) };
    }
    
    /**
     * Gets all configuration sections
     * @returns {Object} All configurations
     */
    getAll() {
        const result = { default: { ...this.defaultConfig } };
        
        this.configs.forEach((config, section) => {
            result[section] = { ...config };
        });
        
        return result;
    }
    
    /**
     * Removes a configuration section
     * @param {string} section - Section name
     * @returns {boolean} Whether the section was removed
     */
    removeSection(section) {
        if (!this.configs.has(section)) {
            logger.debug(`Cannot remove non-existent config section "${section}"`);
            return false;
        }
        
        this.configs.delete(section);
        logger.debug(`Removed config section "${section}"`);
        return true;
    }
    
    /**
     * Clears all configuration
     */
    clear() {
        this.configs.clear();
        this.defaultConfig = {};
        logger.debug('Cleared all configurations');
    }
}

// Create and export a singleton instance
const configManager = new ConfigManager();
export default configManager;

// Export a function to create isolated config managers for testing
export function createConfigManager() {
    return new ConfigManager();
}