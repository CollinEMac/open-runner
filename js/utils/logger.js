// js/utils/logger.js

/**
 * Log levels enum
 * @readonly
 * @enum {number}
 */
export const LogLevel = Object.freeze({
    /** Most detailed logging level */
    DEBUG: 0,
    /** Informational messages */
    INFO: 1,
    /** Warning messages */
    WARN: 2,
    /** Error messages */
    ERROR: 3,
    /** No logging */
    NONE: 4
});

/**
 * A configurable logger for consistent logging across the application
 */
class Logger {
    /**
     * Creates a new logger instance
     * @param {string} [moduleName=''] - Name of the module using this logger
     * @param {LogLevel} [minLevel=LogLevel.INFO] - Minimum level to log
     */
    constructor(moduleName = '', minLevel = LogLevel.INFO) {
        this.moduleName = moduleName;
        this.minLevel = minLevel;
        this.enabled = true;
    }

    /**
     * Sets the minimum log level
     * @param {LogLevel} level - The minimum level to log
     */
    setLevel(level) {
        if (Object.values(LogLevel).includes(level)) {
            this.minLevel = level;
        } else {
            console.warn(`[Logger] Invalid log level: ${level}`);
        }
    }

    /**
     * Enables or disables the logger
     * @param {boolean} enabled - Whether logging is enabled
     */
    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
    }

    /**
     * Formats a log message with the module name
     * @private
     * @param {string} message - The message to format
     * @returns {string} Formatted message
     */
    _formatMessage(message) {
        return this.moduleName ? `[${this.moduleName}] ${message}` : message;
    }

    /**
     * Logs a debug message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    debug(message, ...args) {
        if (!this.enabled || this.minLevel > LogLevel.DEBUG) return;
        console.debug(this._formatMessage(message), ...args);
    }

    /**
     * Logs an info message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    info(message, ...args) {
        if (!this.enabled || this.minLevel > LogLevel.INFO) return;
        console.info(this._formatMessage(message), ...args);
    }

    /**
     * Logs a warning message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    warn(message, ...args) {
        if (!this.enabled || this.minLevel > LogLevel.WARN) return;
        console.warn(this._formatMessage(message), ...args);
    }

    /**
     * Logs an error message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    error(message, ...args) {
        if (!this.enabled || this.minLevel > LogLevel.ERROR) return;
        console.error(this._formatMessage(message), ...args);
    }

    /**
     * Logs a message with a custom level
     * @param {LogLevel} level - The log level
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    log(level, message, ...args) {
        switch (level) {
            case LogLevel.DEBUG:
                this.debug(message, ...args);
                break;
            case LogLevel.INFO:
                this.info(message, ...args);
                break;
            case LogLevel.WARN:
                this.warn(message, ...args);
                break;
            case LogLevel.ERROR:
                this.error(message, ...args);
                break;
            default:
                // Do nothing for NONE or invalid levels
                break;
        }
    }

    /**
     * Creates a child logger with the same settings but a different module name
     * @param {string} subModuleName - Name of the sub-module
     * @returns {Logger} A new logger instance
     */
    createSubLogger(subModuleName) {
        const fullName = this.moduleName 
            ? `${this.moduleName}.${subModuleName}` 
            : subModuleName;
        
        const subLogger = new Logger(fullName, this.minLevel);
        subLogger.setEnabled(this.enabled);
        return subLogger;
    }

    /**
     * Logs the start of a performance measurement
     * @param {string} label - Label for the measurement
     */
    timeStart(label) {
        if (!this.enabled || this.minLevel > LogLevel.DEBUG) return;
        console.time(this._formatMessage(label));
    }

    /**
     * Logs the end of a performance measurement
     * @param {string} label - Label for the measurement (must match timeStart)
     */
    timeEnd(label) {
        if (!this.enabled || this.minLevel > LogLevel.DEBUG) return;
        console.timeEnd(this._formatMessage(label));
    }
}

// Create a default logger
const defaultLogger = new Logger('App');

/**
 * Creates a new logger for a specific module
 * @param {string} moduleName - Name of the module
 * @param {LogLevel} [level] - Optional minimum log level
 * @returns {Logger} A new logger instance
 */
export function createLogger(moduleName, level) {
    return new Logger(moduleName, level !== undefined ? level : defaultLogger.minLevel);
}

/**
 * Sets the global minimum log level for all new loggers
 * @param {LogLevel} level - The minimum level to log
 */
export function setGlobalLogLevel(level) {
    defaultLogger.setLevel(level);
}

/**
 * Enables or disables logging globally
 * @param {boolean} enabled - Whether logging is enabled
 */
export function setLoggingEnabled(enabled) {
    defaultLogger.setEnabled(enabled);
}

// Export the default logger
export default defaultLogger;