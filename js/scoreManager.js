// js/scoreManager.js
import eventBus from './eventBus.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('ScoreManager');

// Constants
const HIGH_SCORE_KEY = 'openRunner_highScore';
const HIGH_SCORES_BY_LEVEL_KEY = 'openRunner_highScoresByLevel';

// In-memory cache of high scores
let globalHighScore = 0;
let highScoresByLevel = {};

/**
 * Initialize the score manager
 * Loads high scores from localStorage if available
 */
export function init() {
    logger.debug('Initializing ScoreManager');
    loadHighScores();
}

/**
 * Load high scores from localStorage
 */
export function loadHighScores() {
    try {
        // Load global high score
        const storedHighScore = localStorage.getItem(HIGH_SCORE_KEY);
        if (storedHighScore !== null) {
            globalHighScore = parseInt(storedHighScore, 10);
            logger.debug(`Loaded global high score: ${globalHighScore}`);
        }

        // Load level-specific high scores
        const storedLevelScores = localStorage.getItem(HIGH_SCORES_BY_LEVEL_KEY);
        if (storedLevelScores !== null) {
            highScoresByLevel = JSON.parse(storedLevelScores);
            logger.debug('Loaded level-specific high scores', highScoresByLevel);
        }
    } catch (error) {
        logger.error('Error loading high scores from localStorage:', error);
        // If there's an error, we'll just use the default values (0)
    }
}

/**
 * Save high scores to localStorage
 */
export function saveHighScores() {
    try {
        // Save global high score
        localStorage.setItem(HIGH_SCORE_KEY, globalHighScore.toString());
        
        // Save level-specific high scores
        localStorage.setItem(HIGH_SCORES_BY_LEVEL_KEY, JSON.stringify(highScoresByLevel));
        
        logger.debug('High scores saved to localStorage');
    } catch (error) {
        logger.error('Error saving high scores to localStorage:', error);
    }
}

/**
 * Get the global high score
 * @returns {number} The global high score
 */
export function getGlobalHighScore() {
    return globalHighScore;
}

/**
 * Get the high score for a specific level
 * @param {string} levelId - The level ID
 * @returns {number} The high score for the level, or 0 if not set
 */
export function getLevelHighScore(levelId) {
    return highScoresByLevel[levelId] || 0;
}

/**
 * Check if a score is a new high score (globally)
 * @param {number} score - The score to check
 * @returns {boolean} Whether the score is a new high score
 */
export function isNewGlobalHighScore(score) {
    return score > globalHighScore;
}

/**
 * Check if a score is a new high score for a specific level
 * @param {number} score - The score to check
 * @param {string} levelId - The level ID
 * @returns {boolean} Whether the score is a new high score for the level
 */
export function isNewLevelHighScore(score, levelId) {
    const currentHighScore = getLevelHighScore(levelId);
    return score > currentHighScore;
}

/**
 * Update the high score if the current score is higher
 * @param {number} score - The current score
 * @param {string} levelId - The level ID (optional)
 * @returns {boolean} Whether a new high score was set
 */
export function updateHighScore(score, levelId = null) {
    let isNewHighScore = false;
    
    // Update global high score if needed
    if (isNewGlobalHighScore(score)) {
        globalHighScore = score;
        isNewHighScore = true;
        logger.debug(`New global high score set: ${score}`);
    }
    
    // Update level-specific high score if provided
    if (levelId && isNewLevelHighScore(score, levelId)) {
        highScoresByLevel[levelId] = score;
        isNewHighScore = true;
        logger.debug(`New high score for level ${levelId}: ${score}`);
    }
    
    // Save to localStorage if any high score was updated
    if (isNewHighScore) {
        saveHighScores();
        
        // Emit event for new high score
        eventBus.emit('newHighScore', {
            score: score,
            levelId: levelId
        });
    }
    
    return isNewHighScore;
}

// Initialize on module load
init();
