// js/utils/configManager.js

import { createLogger, LogLevel } from './logger.js'; // Import LogLevel

const logger = createLogger('ConfigManager', LogLevel.INFO); // Set level to INFO

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

        // Iterate over the new defaults provided
        Object.keys(defaultConfig).forEach(sectionKey => {
            const newSectionValue = defaultConfig[sectionKey];
            if (newSectionValue && typeof newSectionValue === 'object') {
                // Deep clone the new section value before assigning
                this.defaultConfig[sectionKey] = JSON.parse(JSON.stringify(newSectionValue));
            } else {
                 // Assign primitive values directly (implicitly clones)
                 this.defaultConfig[sectionKey] = newSectionValue;
            }
            // Note: This logic replaces the entire section if it exists,
            // and adds it if it doesn't. Sections not present in the input
            // `defaultConfig` remain untouched in `this.defaultConfig`.
        });
        logger.debug('Default configuration updated', this.defaultConfig);
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

        // Deep clone to avoid external modifications affecting registered config
        this.configs.set(section, JSON.parse(JSON.stringify(config)));
        logger.debug(`Registered config for section "${section}"`, this.configs.get(section));
        return true;
    }

    /**
     * Updates a configuration section
     * @param {string} section - Section name
     * @param {Object} updates - Configuration updates
     * @returns {boolean} Whether the update was successful
     */
    updateConfig(section, updates) {
        if (!section || typeof section !== 'string') {
            logger.error('Invalid section name for update');
            return false;
        }

        if (!updates || typeof updates !== 'object' || updates === null) {
            logger.error(`Invalid updates provided for section "${section}"`);
            return false;
        }

        // If section doesn't exist, register it with the updates
        if (!this.configs.has(section)) {
            logger.debug(`Section "${section}" not found, registering with updates.`);
            // Deep clone updates for the new section
            this.configs.set(section, JSON.parse(JSON.stringify(updates)));
        } else {
            // Merge updates into existing section (deep clone updates)
            const currentConfig = this.configs.get(section);
            this.configs.set(section, { ...currentConfig, ...JSON.parse(JSON.stringify(updates)) });
        }
        logger.debug(`Updated config for section "${section}"`, this.configs.get(section));
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
            logger.warn(`Invalid key provided: "${key}". Key must be a non-empty string.`);
            return defaultValue;
        }

        if (!key.includes('.')) {
            logger.warn(`Non-section key provided: "${key}". Use getSection for whole sections.`);
            return defaultValue;
        }

        const parts = key.split('.');
        const section = parts[0];
        const sectionKey = parts.slice(1).join('.'); // Handle keys with dots

        if (!section || !sectionKey) {
             logger.warn(`Invalid key format: "${key}". Format should be "section.key".`);
             return defaultValue;
        }

        // 1. Check registered config for the specific section and key
        if (this.configs.has(section)) {
            const sectionConfig = this.configs.get(section);
            if (sectionConfig.hasOwnProperty(sectionKey)) {
                return sectionConfig[sectionKey];
            }
        }

        // 2. Check default config for the specific section and key
        if (this.defaultConfig.hasOwnProperty(section) && typeof this.defaultConfig[section] === 'object' && this.defaultConfig[section] !== null) {
             const defaultSectionConfig = this.defaultConfig[section];
             if (defaultSectionConfig.hasOwnProperty(sectionKey)) {
                 return defaultSectionConfig[sectionKey]; // Found in default
             } // else { // Removed log block
        }
        // }

        // 3. Return the provided default value if not found in registered or defaults
        return defaultValue;
    }

    /**
     * Gets an entire configuration section
     * @param {string} section - Section name
     * @returns {Object|null} Configuration section or null if section is invalid or not found
     */
    getSection(section) {
        if (!section || typeof section !== 'string') {
            logger.error('Invalid section name provided to getSection');
            return null; // Return null for invalid section to be consistent with get method
        }

        const sectionDefaults = (this.defaultConfig.hasOwnProperty(section) && typeof this.defaultConfig[section] === 'object' && this.defaultConfig[section] !== null)
            ? this.defaultConfig[section]
            : {};

        const registeredConfig = this.configs.has(section)
            ? this.configs.get(section)
            : {};

        // Merge defaults and registered config, with registered taking precedence
        const mergedConfig = { ...sectionDefaults, ...registeredConfig };

        // Return a deep clone to prevent modification of internal state
        return JSON.parse(JSON.stringify(mergedConfig));
    }

    /**
     * Gets all configuration sections
     * @returns {Object} All configurations
     */
    getAll() {
        const allSections = new Set([...Object.keys(this.defaultConfig), ...this.configs.keys()]);
        const result = {};

        allSections.forEach(section => {
            // Use getSection to get the correctly merged and cloned section config
            result[section] = this.getSection(section);
        });

        // Return a deep clone of the entire result
        return JSON.parse(JSON.stringify(result));
    }

    /**
     * Removes a configuration section
     * @param {string} section - Section name
     * @returns {boolean} Whether the section was removed
     */
    removeSection(section) {
         if (!section || typeof section !== 'string') {
            logger.error('Invalid section name provided to removeSection');
            return false;
        }
        let removed = false;
        // Remove from registered configs
        if (this.configs.has(section)) {
            this.configs.delete(section);
            logger.debug(`Removed registered config section "${section}"`);
            removed = true;
        }
        // DO NOT remove from defaults, only from registered configs.
        // The expectation is that get() should fall back to defaults if they exist.
        // if (this.defaultConfig.hasOwnProperty(section)) {
        //     delete this.defaultConfig[section];
        //     removed = true; // Keep track if removed from registered OR defaults
        // }

        if (!removed) {
             logger.debug(`Section "${section}" not found in registered or default configs.`);
        }
        return removed;
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