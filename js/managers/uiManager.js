// js/managers/uiManager.js
import eventBus from '../core/eventBus.js';
import { updateMobileControlsVisibility, setDeviceClass } from '../utils/deviceUtils.js';
import gameStateManager, { GameStates } from '../core/gameStateManager.js';
import * as ScoreManager from './scoreManager.js';
import * as LevelManager from './levelManager.js';
import { createLogger } from '../utils/logger.js';
// import { uiConfig as C } from '../config/ui.js'; // Removed alias import
import { getConfig } from '../config/config.js'; // Import getConfig

const logger = createLogger('UIManager');
// --- Element References ---
let scoreElement;
let highScoreElement;
let gameOverElement;
let gameOverScoreElement;
let gameOverHighScoreElement;
let gameOverRestartButtonElement;
let gameOverTitleButtonElement;
let titleScreenElement;
let startButtonElement;
let levelSelectButtonElement;
let loadingScreenElement;
let progressBarElement;
let progressTextElement;
let levelSelectScreenElement;
let levelListElement;
let backToTitleButtonElement;
let pauseMenuElement;
let resumeButtonElement;
let restartButtonElement;
let returnToTitleButtonElement;
let notificationElement;

// --- Internal State ---
let currentScore = 0; // Keep track internally for display
let currentHighScore = 0; // Keep track of high score
let notificationTimeout = null; // For clearing notification timeouts

/**
 * Handles game state changes by updating UI visibility.
 * @param {object} eventData - The event object containing newState and oldState.
 * @param {string} eventData.newState - The new game state (from GameStates).
 * @param {string} eventData.oldState - The previous game state.
 */
function handleGameStateChange(eventData) {
    const newState = eventData.newState;
    logger.info(`Handling state change: ${newState}`);
    // Hide all major screen overlays by default, then show the correct one
    if (titleScreenElement) titleScreenElement.style.display = 'none';
    if (gameOverElement) gameOverElement.style.display = 'none';
    if (loadingScreenElement) loadingScreenElement.style.display = 'none';
    if (levelSelectScreenElement) levelSelectScreenElement.style.display = 'none';
    if (pauseMenuElement) pauseMenuElement.style.display = 'none';

    // Hide high score in non-gameplay states
    if (highScoreElement && newState !== GameStates.PLAYING) {
        highScoreElement.style.display = 'none';
    }

    // Keep score display visibility separate (managed below)

    switch (newState) {
        case GameStates.LOADING:
        case GameStates.LOADING_LEVEL:
            showLoadingScreen();
            if (scoreElement) scoreElement.style.display = 'none';
            break;
        case GameStates.TITLE:
        case GameStates.TRANSITIONING_TO_TITLE:
            showTitleScreen();
            if (scoreElement) scoreElement.style.display = 'none';
            break;
        case GameStates.LEVEL_SELECT:
            showLevelSelectScreen();
            if (scoreElement) scoreElement.style.display = 'none';
            break;
        case GameStates.PLAYING:
            const previousState = gameStateManager.getPreviousState();
            if (previousState === GameStates.PAUSED) {
                showGameScreen();
            } else {
                if (titleScreenElement) {
                    const fadeDurationMs = getConfig('ui.FADE_DURATION_MS', 300);
                    titleScreenElement.style.opacity = getConfig('ui.OPACITY_HIDDEN', '0');
                    titleScreenElement.style.transition = `opacity ${fadeDurationMs / 1000}s`;

                    setTimeout(() => {
                        titleScreenElement.style.display = 'none';
                        showGameScreen();
                    }, fadeDurationMs);
                } else {
                    showGameScreen();
                }
            }
            break;
        case GameStates.TRANSITIONING_TO_GAMEPLAY:
            if (scoreElement) scoreElement.style.display = 'none';
            break;
        case GameStates.PAUSED:
            showPauseMenu();
            break;
        case GameStates.GAME_OVER:
            if (scoreElement) scoreElement.style.display = 'none';
            break;
        case GameStates.LEVEL_TRANSITION:
            showLoadingScreen("Level Transition in Progress...");
            if (scoreElement) scoreElement.style.display = 'none';
            break;
        default:
            logger.warn(`Unhandled game state for UI: ${newState}`);
    }
}

/**
 * Displays the game over screen with the final score and high score.
 * Triggered by the 'gameOverInfo' event.
 * @param {Object|number} scoreData - Object containing score information or just the score.
 */
function showGameOverScreenWithScore(scoreData) {
    let finalScore, highScore, levelId, isNewHighScore;

    if (typeof scoreData === 'object') {
        finalScore = scoreData.score;
        highScore = scoreData.highScore;
        levelId = scoreData.levelId;
        isNewHighScore = scoreData.isNewHighScore;
    } else {
        finalScore = scoreData;
        highScore = ScoreManager.getGlobalHighScore();
        isNewHighScore = ScoreManager.isNewGlobalHighScore(finalScore);
    }

    currentScore = finalScore;
    currentHighScore = highScore;

    if (isNewHighScore) {
        showNewHighScoreNotification(highScore);
    }

    if (gameOverElement) {
        const h2 = gameOverElement.querySelector('h2');
        const buttonsDiv = gameOverElement.querySelector('.menu-buttons');
        const scorePrefix = getConfig('ui.SCORE_PREFIX', 'Score: ');
        const highScorePrefix = getConfig('ui.HIGH_SCORE_PREFIX', 'High Score: ');

        if (h2 && buttonsDiv) {
            gameOverElement.innerHTML = '';
            gameOverElement.appendChild(h2);

            const scoreEl = document.createElement('div');
            scoreEl.id = 'gameOverScore';
            scoreEl.className = 'game-over-score';
            scoreEl.textContent = `${scorePrefix}${finalScore}`;
            gameOverElement.appendChild(scoreEl);
            gameOverScoreElement = scoreEl;

            const highScoreEl = document.createElement('div');
            highScoreEl.id = 'gameOverHighScore';
            highScoreEl.className = 'game-over-high-score';
            highScoreEl.textContent = `${highScorePrefix}${highScore}`;
            gameOverElement.appendChild(highScoreEl);
            gameOverHighScoreElement = highScoreEl;

            gameOverElement.appendChild(buttonsDiv);
        } else {
            logger.warn("Game over screen structure not as expected, rebuilding...");
            gameOverElement.innerHTML = '<h2>GAME OVER!</h2>';

            const scoreEl = document.createElement('div');
            scoreEl.id = 'gameOverScore';
            scoreEl.className = 'game-over-score';
            scoreEl.textContent = `${scorePrefix}${finalScore}`;
            gameOverElement.appendChild(scoreEl);
            gameOverScoreElement = scoreEl;

            const highScoreEl = document.createElement('div');
            highScoreEl.id = 'gameOverHighScore';
            highScoreEl.className = 'game-over-high-score';
            highScoreEl.textContent = `${highScorePrefix}${highScore}`;
            gameOverElement.appendChild(highScoreEl);
            gameOverHighScoreElement = highScoreEl;

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'menu-buttons';

            const restartBtn = document.createElement('button');
            restartBtn.id = 'gameOverRestartButton';
            restartBtn.textContent = 'Restart Level';
            buttonsDiv.appendChild(restartBtn);

            const titleBtn = document.createElement('button');
            titleBtn.id = 'gameOverTitleButton';
            titleBtn.textContent = 'Return to Title';
            buttonsDiv.appendChild(titleBtn);

            gameOverElement.appendChild(buttonsDiv);
        }

        gameOverElement.style.display = 'flex';
    }

    if (scoreElement) scoreElement.style.display = 'none';
    if (highScoreElement) highScoreElement.style.display = 'none';
    if (pauseMenuElement) pauseMenuElement.style.display = 'none';
    if (titleScreenElement) titleScreenElement.style.display = 'none';
}


/**
 * Initializes the UI Manager by getting references and setting up event listeners.
 * @returns {boolean} True if all essential elements were found, false otherwise.
 */
export function initUIManager() {
    setDeviceClass();

    scoreElement = document.getElementById('scoreDisplay');
    gameOverElement = document.getElementById('gameOverDisplay');
    gameOverRestartButtonElement = document.getElementById('gameOverRestartButton');
    gameOverTitleButtonElement = document.getElementById('gameOverTitleButton');
    titleScreenElement = document.getElementById('titleScreen');
    startButtonElement = document.getElementById('startButton');
    levelSelectButtonElement = document.getElementById('levelSelectButton');
    loadingScreenElement = document.getElementById('loadingScreen');
    progressBarElement = document.getElementById('progressBar');
    progressTextElement = document.getElementById('progressText');
    levelSelectScreenElement = document.getElementById('levelSelectScreen');
    levelListElement = document.getElementById('levelList');
    pauseMenuElement = document.getElementById('pauseMenu');
    resumeButtonElement = document.getElementById('resumeButton');
    restartButtonElement = document.getElementById('restartButton');
    returnToTitleButtonElement = document.getElementById('returnToTitleButton');

    highScoreElement = document.getElementById('highScoreDisplay');
    if (!highScoreElement) {
        highScoreElement = document.createElement('div');
        highScoreElement.id = 'highScoreDisplay';
        highScoreElement.className = 'game-ui high-score';
        // Use getConfig here as well for consistency during creation
        highScoreElement.innerHTML = `${getConfig('ui.HIGH_SCORE_PREFIX', 'High Score: ')}0`;
        document.body.appendChild(highScoreElement);
    }

    gameOverScoreElement = document.getElementById('gameOverScore');
    if (!gameOverScoreElement && gameOverElement) {
        gameOverScoreElement = document.createElement('div');
        gameOverScoreElement.id = 'gameOverScore';
        gameOverScoreElement.className = 'game-over-score';
        gameOverScoreElement.innerHTML = `${getConfig('ui.SCORE_PREFIX', 'Score: ')}0`;
        gameOverElement.appendChild(gameOverScoreElement);
    }

    gameOverHighScoreElement = document.getElementById('gameOverHighScore');
    if (!gameOverHighScoreElement && gameOverElement) {
        gameOverHighScoreElement = document.createElement('div');
        gameOverHighScoreElement.id = 'gameOverHighScore';
        gameOverHighScoreElement.className = 'game-over-high-score';
        gameOverHighScoreElement.innerHTML = `${getConfig('ui.HIGH_SCORE_PREFIX', 'High Score: ')}0`;
        gameOverElement.appendChild(gameOverHighScoreElement);
    }

    notificationElement = document.getElementById('notification');
    if (!notificationElement) {
        notificationElement = document.createElement('div');
        notificationElement.id = 'notification';
        notificationElement.className = 'notification';
        notificationElement.style.display = 'none';
        document.body.appendChild(notificationElement);
    }

    if (!loadingScreenElement || !progressBarElement || !progressTextElement ||
        !scoreElement || !gameOverElement || !titleScreenElement || !startButtonElement ||
        !levelSelectScreenElement || !levelListElement || !pauseMenuElement ||
        !resumeButtonElement || !restartButtonElement || !returnToTitleButtonElement) {
        displayError(new Error("One or more essential UI elements not found! Check HTML IDs."));
        return false;
    }

    try {
        eventBus.subscribe('scoreChanged', updateScore);
        eventBus.subscribe('gameStateChanged', handleGameStateChange);
        eventBus.subscribe('gameOverInfo', showGameOverScreenWithScore);
        eventBus.subscribe('newHighScore', showNewHighScoreNotification);
        eventBus.subscribe('currentScoreUpdated', checkForLiveHighScore);
        eventBus.subscribe('levelUnlockSaved', (levelId) => {
            showLevelUnlockedNotification(`Level ${levelId} Unlocked!`);
        });
        logger.info("Subscribed to events");
    } catch (e) {
         logger.error("Failed to subscribe to eventBus events:", e);
         displayError(new Error("Failed to set up UI event listeners."));
         return false;
    }

    handleGameStateChange({ newState: GameStates.LOADING, oldState: null });
    // Initial score/high score updates moved to gameInitializer.js

    if (scoreElement) scoreElement.style.display = 'none';

    return true;
}

/**
 * Updates the loading progress bar and text.
 * @param {number} loadedCount - Number of items loaded.
 * @param {number} totalCount - Total number of items to load.
 */
export function updateLoadingProgress(loadedCount, totalCount) {
    const percentage = totalCount > 0 ? (loadedCount / totalCount) * 100 : 0;
    if (progressBarElement) {
        progressBarElement.style.width = `${percentage}%`;
    }
    if (progressTextElement) {
        if (percentage > 0 || loadedCount === totalCount) {
             progressTextElement.textContent = `${getConfig('ui.LOADING_TEXT_PREFIX', 'Loading... ')}${percentage.toFixed(0)}${getConfig('ui.LOADING_TEXT_SUFFIX', '%')}`;
        }
    }
}

/** Hides the loading screen overlay with a smooth fade out. */
export function hideLoadingScreen() {
    if (loadingScreenElement) {
        const fadeDurationMs = getConfig('ui.LOADING_HIDE_DELAY_MS', 400);
        loadingScreenElement.style.opacity = getConfig('ui.OPACITY_HIDDEN', '0');
        setTimeout(() => {
            loadingScreenElement.style.display = 'none';
            loadingScreenElement.style.opacity = getConfig('ui.OPACITY_VISIBLE', '1');
        }, fadeDurationMs);
    }
}

/**
 * Shows the loading screen overlay.
 * @param {string} [message='Loading...'] - Optional message to display.
 */
export function showLoadingScreen(message = 'Loading...') {
    if (loadingScreenElement) {
        loadingScreenElement.style.opacity = getConfig('ui.OPACITY_VISIBLE', '1');
        loadingScreenElement.style.display = 'flex';
    }

    if (progressTextElement) {
        progressTextElement.textContent = message;
    }

    if (progressBarElement) {
        progressBarElement.style.width = '0%';
    }
}


/** Shows the title screen overlay. */
export function showTitleScreen() {
    if (titleScreenElement) {
        titleScreenElement.style.display = 'flex';
        titleScreenElement.style.opacity = getConfig('ui.OPACITY_VISIBLE', '1');
        titleScreenElement.style.transition = `opacity ${getConfig('ui.FADE_DURATION_MS', 300) / 1000}s`;
    }
    if (highScoreElement) highScoreElement.style.display = 'none';
    if (scoreElement) scoreElement.style.display = 'none';
}

/** Hides the title screen overlay. */
export function hideTitleScreen() {
     if (titleScreenElement) titleScreenElement.style.display = 'none';
}

/** Shows the main game UI elements (like score and high score). */
export function showGameScreen() {
    const fadeDurationMs = getConfig('ui.FADE_DURATION_MS', 300);
    const opacityVisible = getConfig('ui.OPACITY_VISIBLE', '1');

    if (scoreElement) {
        scoreElement.style.display = 'block';
        scoreElement.style.opacity = opacityVisible;
        scoreElement.style.transition = `opacity ${fadeDurationMs / 1000}s`;
    }

    if (highScoreElement) {
        const highScore = ScoreManager.getGlobalHighScore();
        if (highScore > 0) {
            highScoreElement.style.display = 'block';
            highScoreElement.style.opacity = opacityVisible;
            highScoreElement.style.transition = `opacity ${fadeDurationMs / 1000}s`;
            updateHighScoreDisplay(highScore);
        } else {
            highScoreElement.style.display = 'none';
        }
    }

    updateMobileControlsVisibility();
}

/**
 * Updates the score display based on increments or resets.
 * Triggered by 'scoreChanged' event.
 * @param {number} scoreIncrement - The value change (positive for increment, negative for reset signal).
 */
export function updateScore(scoreIncrement) {
    if (scoreIncrement < 0) {
        currentScore = 0;
    } else {
        currentScore += scoreIncrement;
    }

    if (scoreElement) {
        const prefix = getConfig('ui.SCORE_PREFIX', 'Score: ');
        logger.debug(`[updateScore] Prefix: ${prefix}`); // Log prefix
        scoreElement.textContent = `${prefix}${currentScore}`;
    }
}

/**
 * Checks if the current score exceeds the high score and updates the display in real-time.
 * Triggered by 'currentScoreUpdated' event.
 * @param {Object} data - Object containing score and levelId.
 */
function checkForLiveHighScore(data) {
    const { score, levelId } = data;

    let currentHighScoreValue;
    if (levelId) {
        currentHighScoreValue = ScoreManager.getLevelHighScore(levelId);
    } else {
        currentHighScoreValue = ScoreManager.getGlobalHighScore();
    }

    if (score > currentHighScoreValue) {
        updateHighScoreDisplay(score);

        if (highScoreElement) {
            highScoreElement.style.display = 'block';
            highScoreElement.classList.add('high-score-pulse');
            setTimeout(() => {
                highScoreElement.classList.remove('high-score-pulse');
            }, getConfig('ui.PULSE_ANIMATION_DURATION_MS', 1000));
        }

        if (levelId) {
            ScoreManager.updateHighScore(score, levelId);
        } else {
            ScoreManager.updateHighScore(score);
        }
    }
}

/**
 * Updates the score display with a specific value
 * @param {number} score - The score value to display
 */
export function updateScoreDisplay(score) {
    currentScore = score;
    if (scoreElement) {
        const prefix = getConfig('ui.SCORE_PREFIX', 'Score: ');
        logger.debug(`[updateScoreDisplay] Prefix: ${prefix}`); // Log prefix
        scoreElement.textContent = `${prefix}${currentScore}`;
    }
}

/**
 * Updates the high score display
 * @param {number} highScore - The high score value to display
 */
export function updateHighScoreDisplay(highScore) {
    currentHighScore = highScore;
    const prefix = getConfig('ui.HIGH_SCORE_PREFIX', 'High Score: ');
    logger.debug(`[updateHighScoreDisplay] Prefix: ${prefix}`); // Log prefix
    if (highScoreElement) {
        highScoreElement.textContent = `${prefix}${currentHighScore}`;
    }
    if (gameOverHighScoreElement) {
        gameOverHighScoreElement.textContent = `${prefix}${currentHighScore}`;
    }
}

/**
 * Adds the click listener to the start button.
 * @param {function} startGameCallback - The function to call when the button is clicked.
 */
export function setupStartButton(startGameCallback) {
    logger.debug("Setting up start button listener..."); // Log setup attempt
    if (startButtonElement && startGameCallback) {
        startButtonElement.replaceWith(startButtonElement.cloneNode(true));
        startButtonElement = document.getElementById('startButton');
        if (startButtonElement) { // Check if element exists after replace
            startButtonElement.addEventListener('click', () => {
                logger.debug("Start button clicked!"); // Log click event
                startGameCallback();
            });
            logger.debug("Start button listener attached."); // Log success
        } else {
            displayError(new Error("Start button element not found after replaceWith."));
        }
    } else {
        displayError(new Error("Start button element or callback missing for setup."));
    }
}

/**
 * Adds the click listener to the level select button.
 * @param {function} showLevelSelectCallback - The function to call when the button is clicked.
 */
export function setupLevelSelectButton(showLevelSelectCallback) {
    if (levelSelectButtonElement && showLevelSelectCallback) {
        levelSelectButtonElement.replaceWith(levelSelectButtonElement.cloneNode(true));
        levelSelectButtonElement = document.getElementById('levelSelectButton');
        levelSelectButtonElement.addEventListener('click', () => {
            eventBus.emit('uiButtonClicked');
            showLevelSelectCallback();
        });
    } else {
        logger.warn("Level select button or callback missing for setup.");
    }
}

/**
 * Adds the click listener to the back to title button in the level select screen.
 * @param {function} returnToTitleCallback - The function to call when the button is clicked.
 */
export function setupBackToTitleButton(returnToTitleCallback) {
    backToTitleButtonElement = document.getElementById('backToTitleButton');
    if (backToTitleButtonElement && returnToTitleCallback) {
        backToTitleButtonElement.replaceWith(backToTitleButtonElement.cloneNode(true));
        backToTitleButtonElement = document.getElementById('backToTitleButton');
        backToTitleButtonElement.addEventListener('click', () => {
            eventBus.emit('uiButtonClicked');
            returnToTitleCallback();
        });
        logger.info("Back to title button setup complete");
    } else {
        logger.warn("Back to title button or callback missing for setup.");
    }
}


/** Shows the level select screen overlay. */
export function showLevelSelectScreen() {
    if (levelSelectScreenElement) levelSelectScreenElement.style.display = 'flex';
}

/** Hides the level select screen overlay. */
export function hideLevelSelectScreen() {
    if (levelSelectScreenElement) levelSelectScreenElement.style.display = 'none';
}

/**
 * Populates the level select list with buttons.
 * @param {Array<Object>} levels - An array of level objects (e.g., { name: 'Forest', id: 'level1' }).
 * @param {function} selectLevelCallback - Function to call when a level button is clicked, passing the level id.
 */
export function populateLevelSelect(levels, selectLevelCallback) {
    if (!levelListElement || !selectLevelCallback) {
        displayError(new Error("Level list element or select callback missing."));
        return;
    }

    levelListElement.innerHTML = '';

    levels.forEach(level => {
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        button.textContent = level.name;
        button.onclick = () => selectLevelCallback(level.id);
        button.classList.add('level-select-button');
        listItem.appendChild(button);
        levelListElement.appendChild(listItem);
    });
}

/** Shows the pause menu overlay. */
export function showPauseMenu() {
    logger.info("Showing pause menu");
    if (pauseMenuElement) {
        pauseMenuElement.style.display = 'flex';
        logger.debug("Pause menu element display set to flex");
    } else {
        displayError(new Error("Pause menu element not found when trying to show it."));
    }
    if (scoreElement) scoreElement.style.display = 'none';
    if (highScoreElement) highScoreElement.style.display = 'none';
}

/** Hides the pause menu overlay. */
export function hidePauseMenu() {
    logger.info("Hiding pause menu");
    if (pauseMenuElement) {
        pauseMenuElement.style.display = 'none';
        logger.debug("Pause menu element display set to none");
    } else {
        displayError(new Error("Pause menu element not found when trying to hide it."));
    }

    if (scoreElement) {
        scoreElement.style.display = 'block';
        scoreElement.style.opacity = getConfig('ui.OPACITY_VISIBLE', '1');
    }

    if (highScoreElement) {
        const highScore = ScoreManager.getGlobalHighScore();
        if (highScore > 0) {
            highScoreElement.style.display = 'block';
            highScoreElement.style.opacity = getConfig('ui.OPACITY_VISIBLE', '1');
        } else {
            highScoreElement.style.display = 'none';
        }
    }
}

/**
 * Sets up the pause menu button event handlers.
 * @param {function} onResume - Function to call when Resume button is clicked.
 * @param {function} onRestart - Function to call when Restart button is clicked.
 * @param {function} onReturnToTitle - Function to call when Return to Title button is clicked.
 */
export function setupPauseMenuButtons(onResume, onRestart, onReturnToTitle) {
    const setupButton = (buttonElement, id, callback) => {
        let element = buttonElement;
        if (element && callback) {
            element.replaceWith(element.cloneNode(true));
            element = document.getElementById(id);
            if (element) {
                 element.addEventListener('click', callback);
            } else {
                 displayError(new Error(`Pause menu button #${id} not found after clone.`));
            }
            return element;
        }
        return buttonElement;
    };

    resumeButtonElement = setupButton(resumeButtonElement, 'resumeButton', onResume);
    restartButtonElement = setupButton(restartButtonElement, 'restartButton', onRestart);
    returnToTitleButtonElement = setupButton(returnToTitleButtonElement, 'returnToTitleButton', onReturnToTitle);
}

/**
 * Sets up the game over screen button event handlers.
 * @param {function} onRestart - Function to call when Restart button is clicked.
 * @param {function} onReturnToTitle - Function to call when Return to Title button is clicked.
 */
export function setupGameOverButtons(onRestart, onReturnToTitle) {
    const setupButton = (buttonElement, id, callback) => {
        let element = buttonElement;
        if (element && callback) {
            element.replaceWith(element.cloneNode(true));
            element = document.getElementById(id);
            if (element) {
                 element.addEventListener('click', callback);
            } else {
                 displayError(new Error(`Game over button #${id} not found after clone.`));
            }
            return element;
        }
        return buttonElement;
    };

    gameOverRestartButtonElement = setupButton(gameOverRestartButtonElement, 'gameOverRestartButton', onRestart);
    gameOverTitleButtonElement = setupButton(gameOverTitleButtonElement, 'gameOverTitleButton', onReturnToTitle);
}

/**
 * Shows a notification for a new high score
 * @param {Object|number} data - Either the high score value or an object with score property
 */
export function showNewHighScoreNotification(data) {
    let highScore;
    let levelId = null;

    if (typeof data === 'object') {
        highScore = data.score;
        levelId = data.levelId;
    } else {
        highScore = data;
    }

    updateHighScoreDisplay(highScore);

    if (highScoreElement) {
        highScoreElement.style.display = 'block';
        highScoreElement.style.opacity = '1';
    }

    ScoreManager.updateHighScore(highScore, levelId);

    showNotification(`New High Score: ${highScore}!`, 'high-score-notification');
}

/**
 * Shows a notification for a level unlock
 * @param {string} levelName - The name of the unlocked level
 */
export function showLevelUnlockedNotification(levelName) {
    showNotification(`${levelName} Unlocked!`, 'level-unlock-notification');
}

/**
 * Shows a notification with the given message
 * @param {string} message - The notification message
 * @param {string} [className] - Optional CSS class for styling
 * @param {number} [duration] - How long to show the notification in ms (uses config default if omitted)
 */
function showNotification(message, className = '', duration) {
    if (!notificationElement) return;

    const effectiveDuration = duration ?? getConfig('ui.UI_NOTIFICATION_DURATION_MS', 3000);
    const fadeDurationMs = getConfig('ui.UI_NOTIFICATION_FADE_DURATION_MS', 300);
    const opacityHidden = getConfig('ui.OPACITY_HIDDEN', '0');

    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    notificationElement.textContent = message;
    notificationElement.className = 'notification';
    if (className) {
        notificationElement.classList.add(className);
    }
    notificationElement.style.display = 'block';

    notificationElement.style.animation = 'none';
    void notificationElement.offsetWidth;
    notificationElement.style.animation = 'fadeIn 0.3s ease-out';

    notificationTimeout = setTimeout(() => {
        notificationElement.style.opacity = opacityHidden;
        notificationElement.style.transform = 'translateY(-20px)';
        notificationElement.style.transition = `opacity ${fadeDurationMs / 1000}s ease, transform ${fadeDurationMs / 1000}s ease`;

        setTimeout(() => {
            notificationElement.style.display = 'none';
            notificationElement.style.opacity = '';
            notificationElement.style.transform = '';
            notificationElement.style.transition = '';
        }, fadeDurationMs);
    }, effectiveDuration);
}

/**
 * Displays an error message overlay on the screen.
 * @param {Error} error - The error object.
 */
export function displayError(error) {
     logger.error("Displaying error to user:", error);
     let errorDiv = document.getElementById('runtimeErrorDisplay');
     if (!errorDiv) {
         errorDiv = document.createElement('div');
         errorDiv.id = 'runtimeErrorDisplay';
         errorDiv.style.position = 'fixed';
         errorDiv.style.bottom = '10px';
         errorDiv.style.left = '10px';
         errorDiv.style.padding = '15px';
         errorDiv.style.backgroundColor = 'rgba(200, 0, 0, 0.85)';
         errorDiv.style.color = 'white';
         errorDiv.style.fontFamily = 'monospace';
         errorDiv.style.fontSize = '14px';
         errorDiv.style.border = '1px solid darkred';
         errorDiv.style.borderRadius = '5px';
         errorDiv.style.zIndex = '1000';
         errorDiv.style.maxWidth = '80%';
         errorDiv.style.whiteSpace = 'pre-wrap';
         document.body.appendChild(errorDiv);
     }
     errorDiv.textContent = `Error: ${error.message}\n(Check console for more details)`;
     errorDiv.style.display = 'block';
}

/**
 * Updates the level selection screen with unlocked levels
 * @param {Array<string>} unlockedLevels - Array of unlocked level IDs
 */
export function updateUnlockedLevels(unlockedLevels) {
    if (!levelListElement) return;

    levelListElement.innerHTML = '';

    const levelData = LevelManager.getAvailableLevels();
    if (!levelData) {
        logger.error("Could not retrieve level data from LevelManager.");
        return;
    }

    levelData.forEach(data => {
        const levelButton = document.createElement('div');
        levelButton.className = 'level-button';
        const isUnlocked = ScoreManager.isLevelUnlocked(data.id);
        if (!isUnlocked) {
            levelButton.classList.add('locked');
        }

        const levelName = document.createElement('h3');
        levelName.textContent = data.name;

        const levelDesc = document.createElement('p');
        levelDesc.textContent = isUnlocked ? (data.description || '') : getConfig('ui.LOCKED_LEVEL_TEXT', 'Locked');

        levelButton.appendChild(levelName);
        levelButton.appendChild(levelDesc);

        if (isUnlocked) {
            levelButton.addEventListener('click', () => {
                eventBus.emit('uiButtonClicked');
                eventBus.emit('requestLevelTransition', data.id);
            });
        }

        levelListElement.appendChild(levelButton);
    });
}

