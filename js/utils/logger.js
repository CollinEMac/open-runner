// js/utils/logger.js
// Default log level is set to INFO to reduce verbosity
// For debugging, you can use the URL parameter ?logLevel=DEBUG to enable more detailed logging


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

const LOG_LEVEL_NAMES = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
};

let logContainerElement = null;
let logContainerId = 'mcp-log-output'; // Default ID

/**
 * Gets or creates the log container element in the DOM.
 * @private
 * @returns {HTMLElement | null} The log container element or null if document is not ready.
 */
function _getOrCreateLogContainer() {
    if (logContainerElement) {
        return logContainerElement;
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return null; // Not in a browser environment
    }

    // If document.body isn't ready yet, wait for DOMContentLoaded
    if (!document.body) {
        // We'll try again when the DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // Try to create the container once the DOM is ready
                _getOrCreateLogContainer();
            });
        }
        return null; // Document not ready yet
    }

    // Document is ready, try to get or create the container
    logContainerElement = document.getElementById(logContainerId);
    if (!logContainerElement) {
        console.warn(`[Logger] Log container #${logContainerId} not found. Creating one.`);
        logContainerElement = document.createElement('div');
        logContainerElement.id = logContainerId;
        logContainerElement.style.display = 'none'; // Hidden by default
        logContainerElement.setAttribute('aria-live', 'polite');
        document.body.appendChild(logContainerElement);
    }
    return logContainerElement;
}

/**
 * Appends a log message to the DOM container.
 * @private
 * @param {LogLevel} level - The log level.
 * @param {string} formattedMessage - The pre-formatted message.
 * @param {...any} args - Additional arguments.
 */
function _appendToDom(level, formattedMessage, ...args) {
    // Skip DOM logging for non-error messages by default to improve performance
    if (level < LogLevel.ERROR) {
        // Only check config for non-error messages
        try {
            // Use a direct check for the URL parameter first for early initialization
            const urlParams = new URLSearchParams(window.location.search);
            const debugParam = urlParams.get('debug');

            // If debug parameter is not explicitly set to 'true', skip non-error logs
            if (debugParam !== 'true') {
                // Try to access config - this might not be available during early initialization
                const configModule = window.configManager || window.getConfig;
                if (configModule) {
                    const enableDomLogging = configModule.get ?
                        configModule.get('debug.ENABLE_DOM_LOGGING') :
                        (typeof getConfig === 'function' ? getConfig('debug.ENABLE_DOM_LOGGING') : false);

                    // Skip DOM logging if explicitly disabled or not explicitly enabled
                    if (enableDomLogging !== true) return;
                } else {
                    // No config available, skip non-error logs
                    return;
                }
            }
        } catch (e) {
            // If any error occurs during config check, skip non-error logs
            return;
        }
    }

    // Skip DOM logging if we're not in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    const container = _getOrCreateLogContainer();
    if (!container) {
        // If container isn't available yet but we're in a browser, store logs to append later
        if (!window._pendingLogMessages) {
            window._pendingLogMessages = [];
        }
        // Store the log message to append when container is ready
        window._pendingLogMessages.push({ level, formattedMessage, args });
        return;
    }

    const levelName = LOG_LEVEL_NAMES[level] || 'LOG';
    const logEntry = document.createElement('div');
    logEntry.dataset.level = levelName.toLowerCase();
    logEntry.dataset.timestamp = Date.now();

    // Simple serialization for args for now
    const argsString = args.map(arg => {
        try {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        } catch (e) {
            return '[Unserializable Object]';
        }
    }).join(' ');

    logEntry.textContent = `[${levelName}] ${formattedMessage} ${argsString}`.trim();
    container.appendChild(logEntry);

    // Limit the number of log entries in the DOM to prevent memory issues
    const maxEntries = 30; // Further reduced to improve performance
    if (container.children.length > maxEntries) {
        // Always use the more efficient batch removal method
        const toKeep = Array.from(container.children).slice(-maxEntries);
        container.innerHTML = '';
        toKeep.forEach(entry => container.appendChild(entry));
    }
}

/**
 * A configurable logger for consistent logging across the application
 */
class Logger {
    /**
     * Creates a new logger instance
     * @param {string} [moduleName=''] - Name of the module using this logger
     * @param {LogLevel} [minLevel=LogLevel.INFO] - Minimum level to log
     */
    constructor(moduleName = '', minLevel = LogLevel.INFO) { // Default level set to INFO to reduce verbosity
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
            // Use console directly here to avoid recursion if logger itself fails
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
        const formatted = this._formatMessage(message);
        console.debug(formatted, ...args);
        _appendToDom(LogLevel.DEBUG, formatted, ...args);
    }

    /**
     * Logs an info message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    info(message, ...args) {
        if (!this.enabled || this.minLevel > LogLevel.INFO) return;
        const formatted = this._formatMessage(message);
        console.info(formatted, ...args);
        _appendToDom(LogLevel.INFO, formatted, ...args);
    }

    /**
     * Logs a warning message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    warn(message, ...args) {
        if (!this.enabled || this.minLevel > LogLevel.WARN) return;
        const formatted = this._formatMessage(message);
        console.warn(formatted, ...args);
        _appendToDom(LogLevel.WARN, formatted, ...args);
    }

    /**
     * Logs an error message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    error(message, ...args) {
        if (!this.enabled || this.minLevel > LogLevel.ERROR) return;
        const formatted = this._formatMessage(message);
        console.error(formatted, ...args);
        _appendToDom(LogLevel.ERROR, formatted, ...args);
    }

    /**
     * Logs a message with a custom level
     * @param {LogLevel} level - The log level
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    log(level, message, ...args) {
        // This method now directly calls the specific level methods which handle DOM appending
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
        subLogger.setEnabled(this.enabled); // Inherit enabled state
        return subLogger;
    }

    /**
     * Logs the start of a performance measurement
     * @param {string} label - Label for the measurement
     */
    timeStart(label) {
        if (!this.enabled || this.minLevel > LogLevel.DEBUG) return;
        // DOM logging for timeStart/End might be noisy, skipping for now.
        console.time(this._formatMessage(label));
    }

    /**
     * Logs the end of a performance measurement
     * @param {string} label - Label for the measurement (must match timeStart)
     */
    timeEnd(label) {
        if (!this.enabled || this.minLevel > LogLevel.DEBUG) return;
        // DOM logging for timeStart/End might be noisy, skipping for now.
        console.timeEnd(this._formatMessage(label));
    }
}

// --- Global Logger Management ---

const defaultLogger = new Logger('App', LogLevel.ERROR); // Set to ERROR to reduce verbosity based on user preference

// --- Check for URL override ---
// Allows enabling verbose logging via URL parameter, e.g., ?logLevel=DEBUG
try {
    if (typeof window !== 'undefined' && window.location && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlLogLevel = urlParams.get('logLevel');
        if (urlLogLevel) {
            const requestedLevel = urlLogLevel.toUpperCase();
            if (LogLevel.hasOwnProperty(requestedLevel)) {
                const levelValue = LogLevel[requestedLevel];
                console.log(`[Logger] Overriding log level from URL: ${requestedLevel} (${levelValue})`);
                defaultLogger.setLevel(levelValue); // Set level for the default logger instance
            } else {
                console.warn(`[Logger] Invalid log level specified in URL: ${urlLogLevel}`);
            }
        }
    }
} catch (e) {
    console.error("[Logger] Error processing URL log level override:", e);
}
// --- End URL override check ---

/**
 * Creates a new logger for a specific module
 * @param {string} moduleName - Name of the module
 * @param {LogLevel} [level] - Optional minimum log level
 * @returns {Logger} A new logger instance
 */
export function createLogger(moduleName, level) {
    const newLogger = new Logger(moduleName, level !== undefined ? level : defaultLogger.minLevel);
    newLogger.setEnabled(defaultLogger.enabled); // Inherit enabled state from default logger
    return newLogger;
}

/**
 * Sets the global minimum log level for the default logger and new loggers
 * @param {LogLevel} level - The minimum level to log
 */
export function setGlobalLogLevel(level) {
    defaultLogger.setLevel(level);
    // Note: Existing loggers created via createLogger won't be affected unless they
    // are recreated or manually updated. This sets the default for *new* loggers.
}

/**
 * Enables or disables logging globally for the default logger and new loggers
 * @param {boolean} enabled - Whether logging is enabled
 */
export function setLoggingEnabled(enabled) {
    defaultLogger.setEnabled(enabled);
    // Note: Existing loggers created via createLogger won't be affected unless they
    // are manually updated. This sets the default for *new* loggers.
}

/**
 * Sets the ID of the DOM element to use for log output.
 * Must be called before the first log message is generated if using a custom ID.
 * @param {string} id - The ID of the container element.
 */
export function setLogContainerId(id) {
    if (logContainerElement) {
        console.warn("[Logger] Cannot change log container ID after it has been accessed or created.");
        return;
    }
    logContainerId = id;
}

/**
 * Clears all messages from the log container DOM element.
 */
export function clearLogContainer() {
    const container = _getOrCreateLogContainer();
    if (container) {
        container.innerHTML = '';
    }
}

// Export the default logger instance
export default defaultLogger;

// Ensure the container is looked for/created when the module loads in a browser
_getOrCreateLogContainer();

// Process any pending log messages when DOM is ready
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const processPendingLogs = () => {
        if (window._pendingLogMessages && window._pendingLogMessages.length > 0) {
            const container = _getOrCreateLogContainer();
            if (container) {
                // Process all pending messages
                window._pendingLogMessages.forEach(({ level, formattedMessage, args }) => {
                    _appendToDom(level, formattedMessage, ...args);
                });
                // Clear the pending messages
                window._pendingLogMessages = [];
            }
        }
    };

    // Check if DOM is already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processPendingLogs);
    } else {
        // DOM is already loaded, process immediately
        processPendingLogs();
    }
}