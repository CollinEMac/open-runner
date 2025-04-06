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
            if (newSectionValue && typeof newSectionValue === 'object' && !Array.isArray(newSectionValue)) { // Check for object, not array
                // Deep clone the new section value before assigning
                this.defaultConfig[sectionKey] = JSON.parse(JSON.stringify(newSectionValue));
            } else {
                 // Assign primitive values or arrays directly (implicitly clones primitives)
                 this.defaultConfig[sectionKey] = newSectionValue;
            }
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

        if (!this.configs.has(section)) {
            logger.debug(`Section "${section}" not found, registering with updates.`);
            this.configs.set(section, JSON.parse(JSON.stringify(updates)));
        } else {
            const currentConfig = this.configs.get(section);
            // Simple merge (does not handle deep merging within the section)
            this.configs.set(section, { ...currentConfig, ...JSON.parse(JSON.stringify(updates)) });
        }
        logger.debug(`Updated config for section "${section}"`, this.configs.get(section));
        return true;
    }

    /**
     * Gets a configuration value
     * @param {string} key - Configuration key in format "section.key" or just "key" for top-level defaults
     * @param {*} [defaultValue] - Default value if key not found
     * @returns {*} Configuration value or default
     */
    get(key, defaultValue) {
        if (!key || typeof key !== 'string') {
            logger.warn(`Invalid key provided: "${key}". Key must be a non-empty string.`);
            return defaultValue;
        }

        // 1. Check if it's a top-level default key
        if (this.defaultConfig.hasOwnProperty(key)) {
            // Check if it's also a section name (ambiguous) - prefer section if registered
            if (!this.configs.has(key) && !key.includes('.')) {
                 return this.defaultConfig[key];
            }
            // If it could be a section name, fall through to section logic
        }

        // 2. Check for section.key format
        if (key.includes('.')) {
            const parts = key.split('.');
            const section = parts[0];
            const sectionKey = parts.slice(1).join('.');

            if (section && sectionKey) {
                // 2a. Check registered config section
                if (this.configs.has(section)) {
                    const sectionConfig = this.configs.get(section);
                    if (sectionConfig.hasOwnProperty(sectionKey)) {
                        return sectionConfig[sectionKey];
                    }
                }
                // 2b. Check default config section
                if (this.defaultConfig.hasOwnProperty(section) && typeof this.defaultConfig[section] === 'object' && this.defaultConfig[section] !== null) {
                     const defaultSectionConfig = this.defaultConfig[section];
                     if (defaultSectionConfig.hasOwnProperty(sectionKey)) {
                         return defaultSectionConfig[sectionKey];
                     }
                }
            } else {
                 logger.warn(`Invalid key format: "${key}". Format should be "section.key".`);
            }
        }
        // 3. If not found as top-level or section.key, issue warning only if it lacked a '.'
        else {
             logger.warn(`Key "${key}" not found as top-level default or in section format "section.key".`);
        }


        // 4. Return the provided default value if not found anywhere
        return defaultValue;
    }

    /**
     * Gets an entire configuration section, merging defaults and registered values.
     * @param {string} section - Section name
     * @returns {Object|null} Deep cloned configuration section or null if section is invalid.
     */
    getSection(section) {
        if (!section || typeof section !== 'string') {
            logger.error('Invalid section name provided to getSection');
            return null;
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
        try {
            return JSON.parse(JSON.stringify(mergedConfig));
        } catch (e) {
            logger.error(`Failed to deep clone section "${section}":`, e);
            return {}; // Return empty object on clone failure
        }
    }

    /**
     * Gets all configuration sections, merged with defaults.
     * @returns {Object} All configurations (deep cloned).
     */
    getAll() {
        const allSections = new Set([...Object.keys(this.defaultConfig), ...this.configs.keys()]);
        const result = {};

        allSections.forEach(section => {
            // Use getSection to get the correctly merged and cloned section config
            result[section] = this.getSection(section);
        });

        // Return a deep clone of the entire result
        try {
            return JSON.parse(JSON.stringify(result));
        } catch (e) {
            logger.error("Failed to deep clone all configs:", e);
            return {}; // Return empty object on clone failure
        }
    }

    /**
     * Removes a configuration section from the registered configs (not defaults).
     * @param {string} section - Section name
     * @returns {boolean} Whether the section was removed from registered configs.
     */
    removeSection(section) {
         if (!section || typeof section !== 'string') {
            logger.error('Invalid section name provided to removeSection');
            return false;
        }
        let removed = false;
        if (this.configs.has(section)) {
            this.configs.delete(section);
            logger.debug(`Removed registered config section "${section}"`);
            removed = true;
        }

        if (!removed) {
             logger.debug(`Section "${section}" not found in registered configs.`);
        }
        return removed;
    }

    /**
     * Clears all registered and default configurations.
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