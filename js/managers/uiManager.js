// js/managers/uiManager.js
import eventBus from '../core/eventBus.js'; // Moved to core
import { updateMobileControlsVisibility, setDeviceClass } from '../utils/deviceUtils.js'; // Stays in utils
import { GameStates, getPreviousState } from '../core/gameStateManager.js'; // Moved to core
import * as ScoreManager from './scoreManager.js'; // Stays in managers
import * as LevelManager from './levelManager.js'; // Import LevelManager
import { createLogger } from '../utils/logger.js'; // Stays in utils
import * as C from '../config/config.js'; // Import all config constants

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
    const newState = eventData.newState; // Extract the new state string
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

    switch (newState) { // Use the extracted newState string
        case GameStates.LOADING:
        case GameStates.LOADING_LEVEL:
            showLoadingScreen(); // Show loading screen
            if (scoreElement) scoreElement.style.display = 'none'; // Hide score
            break;
        case GameStates.TITLE:
        case GameStates.TRANSITIONING_TO_TITLE: // Also show title screen during transition
            showTitleScreen();
            if (scoreElement) scoreElement.style.display = 'none'; // Hide score
            break;
        case GameStates.LEVEL_SELECT:
            showLevelSelectScreen();
            if (scoreElement) scoreElement.style.display = 'none'; // Hide score
            break;
        case GameStates.PLAYING:
            // Check if we're coming from the pause state to handle immediate UI display
            const previousState = getPreviousState();
            if (previousState === GameStates.PAUSED) {
                // Coming from pause - show UI immediately
                showGameScreen();
            } else {
                // Normal transition (e.g., from title screen)
                // Fade out title screen and fade in game UI
                if (titleScreenElement) {
                    // First make title screen transparent but still visible
                    // This allows the game to be seen behind it during transition
                    titleScreenElement.style.opacity = C.UI_OPACITY_HIDDEN;
                    titleScreenElement.style.transition = `opacity ${C.UI_FADE_DURATION_MS / 1000}s`; // Use constant

                    // After transition, hide it completely
                    setTimeout(() => {
                        titleScreenElement.style.display = 'none';
                        showGameScreen(); // Shows score after title screen is gone
                    }, C.UI_FADE_DURATION_MS); // Use constant
                } else {
                    showGameScreen();
                }
            }
            break;
        case GameStates.TRANSITIONING_TO_GAMEPLAY:
            // Keep UI clean during camera transition to gameplay
            // Hide all UI elements during the transition
            if (scoreElement) scoreElement.style.display = 'none';
            break;
        case GameStates.PAUSED:
            showPauseMenu();
            // Score is hidden by showPauseMenu
            break;
        case GameStates.GAME_OVER:
            // Game over screen display (including score) is handled by the 'gameOverInfo' event listener
            if (scoreElement) scoreElement.style.display = 'none'; // Hide score display
            break;
        case GameStates.LEVEL_TRANSITION:
            // Often shows loading screen during transition
            showLoadingScreen("Transitioning..."); // Keep specific message for now
             if (scoreElement) scoreElement.style.display = 'none'; // Hide score
            break;
        default:
            logger.warn(`Unhandled game state for UI: ${newState}`); // Log the unhandled state
    }
}

/**
 * Displays the game over screen with the final score and high score.
 * Triggered by the 'gameOverInfo' event.
 * @param {Object|number} scoreData - Object containing score information or just the score.
 */
function showGameOverScreenWithScore(scoreData) {
    // Handle both old and new formats
    let finalScore, highScore, levelId, isNewHighScore;

    if (typeof scoreData === 'object') {
        finalScore = scoreData.score;
        highScore = scoreData.highScore;
        levelId = scoreData.levelId;
        isNewHighScore = scoreData.isNewHighScore;
    } else {
        // Legacy support for when finalScore was passed directly
        finalScore = scoreData;
        highScore = ScoreManager.getGlobalHighScore();
        isNewHighScore = ScoreManager.isNewGlobalHighScore(finalScore);
    }

    // Update internal score
    currentScore = finalScore;
    currentHighScore = highScore;

    // If this is a new high score, show the notification
    if (isNewHighScore) {
        showNewHighScoreNotification(highScore);
    }

    // Update game over screen
    if (gameOverElement) {
        // Keep the h2 and buttons, but clear any dynamically added score elements
        const h2 = gameOverElement.querySelector('h2');
        const buttonsDiv = gameOverElement.querySelector('.menu-buttons');

        if (h2 && buttonsDiv) {
            // Clear everything except the h2 and buttons
            gameOverElement.innerHTML = '';
            gameOverElement.appendChild(h2);

            // Add score elements
            const scoreEl = document.createElement('div');
            scoreEl.id = 'gameOverScore';
            scoreEl.className = 'game-over-score';
            scoreEl.textContent = `${C.UI_SCORE_PREFIX}${finalScore}`; // Use constant
            gameOverElement.appendChild(scoreEl);
            gameOverScoreElement = scoreEl;

            const highScoreEl = document.createElement('div');
            highScoreEl.id = 'gameOverHighScore';
            highScoreEl.className = 'game-over-high-score';
            highScoreEl.textContent = `${C.UI_HIGH_SCORE_PREFIX}${highScore}`; // Use constant
            gameOverElement.appendChild(highScoreEl);
            gameOverHighScoreElement = highScoreEl;

            // Re-add the buttons
            gameOverElement.appendChild(buttonsDiv);
        } else {
            // Fallback if structure is not as expected
            logger.warn("Game over screen structure not as expected, rebuilding...");
            gameOverElement.innerHTML = '<h2>GAME OVER!</h2>';

            const scoreEl = document.createElement('div');
            scoreEl.id = 'gameOverScore';
            scoreEl.className = 'game-over-score';
            scoreEl.textContent = `${C.UI_SCORE_PREFIX}${finalScore}`; // Use constant
            gameOverElement.appendChild(scoreEl);
            gameOverScoreElement = scoreEl;

            const highScoreEl = document.createElement('div');
            highScoreEl.id = 'gameOverHighScore';
            highScoreEl.className = 'game-over-high-score';
            highScoreEl.textContent = `${C.UI_HIGH_SCORE_PREFIX}${highScore}`; // Use constant
            gameOverElement.appendChild(highScoreEl);
            gameOverHighScoreElement = highScoreEl;

            // Create buttons container
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'menu-buttons';

            // Create restart button
            const restartBtn = document.createElement('button');
            restartBtn.id = 'gameOverRestartButton';
            restartBtn.textContent = 'Restart Level';
            buttonsDiv.appendChild(restartBtn);

            // Create return to title button
            const titleBtn = document.createElement('button');
            titleBtn.id = 'gameOverTitleButton';
            titleBtn.textContent = 'Return to Title';
            buttonsDiv.appendChild(titleBtn);

            gameOverElement.appendChild(buttonsDiv);
        }

        // Show the game over screen
        gameOverElement.style.display = 'flex';
    }

    // Ensure other conflicting elements are hidden
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
    // Set device class first
    setDeviceClass();

    // Get existing UI elements
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

    // Get or create high score element
    highScoreElement = document.getElementById('highScoreDisplay');
    if (!highScoreElement) {
        highScoreElement = document.createElement('div');
        highScoreElement.id = 'highScoreDisplay';
        highScoreElement.className = 'game-ui high-score';
        highScoreElement.innerHTML = `${C.UI_HIGH_SCORE_PREFIX}0`; // Use constant
        document.body.appendChild(highScoreElement);
    }

    // Get or create game over score elements
    gameOverScoreElement = document.getElementById('gameOverScore');
    if (!gameOverScoreElement && gameOverElement) {
        gameOverScoreElement = document.createElement('div');
        gameOverScoreElement.id = 'gameOverScore';
        gameOverScoreElement.className = 'game-over-score';
        gameOverScoreElement.innerHTML = `${C.UI_SCORE_PREFIX}0`; // Use constant
        gameOverElement.appendChild(gameOverScoreElement);
    }

    gameOverHighScoreElement = document.getElementById('gameOverHighScore');
    if (!gameOverHighScoreElement && gameOverElement) {
        gameOverHighScoreElement = document.createElement('div');
        gameOverHighScoreElement.id = 'gameOverHighScore';
        gameOverHighScoreElement.className = 'game-over-high-score';
        gameOverHighScoreElement.innerHTML = `${C.UI_HIGH_SCORE_PREFIX}0`; // Use constant
        gameOverElement.appendChild(gameOverHighScoreElement);
    }

    // Create notification element
    notificationElement = document.getElementById('notification');
    if (!notificationElement) {
        notificationElement = document.createElement('div');
        notificationElement.id = 'notification';
        notificationElement.className = 'notification';
        notificationElement.style.display = 'none';
        document.body.appendChild(notificationElement);
    }

    // Basic check for essential elements
    if (!loadingScreenElement || !progressBarElement || !progressTextElement ||
        !scoreElement || !gameOverElement || !titleScreenElement || !startButtonElement ||
        !levelSelectScreenElement || !levelListElement || !pauseMenuElement ||
        !resumeButtonElement || !restartButtonElement || !returnToTitleButtonElement) {
        displayError(new Error("One or more essential UI elements not found! Check HTML IDs."));
        return false;
    }

    // --- Setup Event Listeners ---
    try {
        eventBus.subscribe('scoreChanged', updateScore);
        eventBus.subscribe('gameStateChanged', handleGameStateChange);
        eventBus.subscribe('gameOverInfo', showGameOverScreenWithScore); // Listen for score info
        eventBus.subscribe('newHighScore', showNewHighScoreNotification); // Listen for new high scores
        eventBus.subscribe('currentScoreUpdated', checkForLiveHighScore); // Listen for live score updates
        eventBus.subscribe('levelUnlockSaved', (levelId) => {
            showLevelUnlockedNotification(`Level ${levelId} Unlocked!`);
        });
        logger.info("Subscribed to events");
    } catch (e) {
         logger.error("Failed to subscribe to eventBus events:", e);
         displayError(new Error("Failed to set up UI event listeners."));
         return false; // Critical failure
    }

    // Add CSS for new UI elements
    // addCustomStyles(); // Removed - Styles moved to style.css

    // Initial state setup (handled by gameStateChanged event emission later)
    // We can set a default safe state here before the first gameStateChanged event fires
    // Pass the expected eventData object structure
    handleGameStateChange({ newState: GameStates.LOADING, oldState: null }); // Assume initial state is LOADING
    updateScore(0); // Initialize score display to 0

    // Make sure score is hidden during loading
    if (scoreElement) scoreElement.style.display = 'none';

    // Load high score from ScoreManager
    const highScore = ScoreManager.getGlobalHighScore();
    updateHighScoreDisplay(highScore); // Initialize high score display with saved value

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
        // Avoid overwriting specific loading messages if percentage is 0
        if (percentage > 0 || loadedCount === totalCount) {
             progressTextElement.textContent = `${C.UI_LOADING_TEXT_PREFIX}${percentage.toFixed(0)}${C.UI_LOADING_TEXT_SUFFIX}`; // Use constants
        }
    }
}

/** Hides the loading screen overlay with a smooth fade out. */
export function hideLoadingScreen() {
    if (loadingScreenElement) {
        // First fade out
        loadingScreenElement.style.opacity = C.UI_OPACITY_HIDDEN; // Use constant

        // Then hide after transition completes
        setTimeout(() => {
            loadingScreenElement.style.display = 'none';
            // Reset opacity for next time
            loadingScreenElement.style.opacity = C.UI_OPACITY_VISIBLE; // Use constant
        }, C.UI_LOADING_HIDE_DELAY_MS); // Use constant
    }
}

/**
 * Shows the loading screen overlay.
 * @param {string} [message='Loading...'] - Optional message to display.
 */
export function showLoadingScreen(message = 'Loading...') {
    if (loadingScreenElement) {
        // Ensure opacity is set to 1 before displaying
        loadingScreenElement.style.opacity = C.UI_OPACITY_VISIBLE; // Use constant
        loadingScreenElement.style.display = 'flex';
    }
    if (progressTextElement) {
        progressTextElement.textContent = message; // Update text
    }
    // Reset progress bar when showing the screen initially
    if (progressBarElement) {
        progressBarElement.style.width = '0%';
    }
}


/** Shows the title screen overlay. */
export function showTitleScreen() {
    if (titleScreenElement) {
        titleScreenElement.style.display = 'flex';
        titleScreenElement.style.opacity = C.UI_OPACITY_VISIBLE; // Use constant
        titleScreenElement.style.transition = `opacity ${C.UI_FADE_DURATION_MS / 1000}s`; // Use constant (adjust if different duration needed)
    }
    // Always hide high score on title screen
    if (highScoreElement) highScoreElement.style.display = 'none';
    // Also hide score display
    if (scoreElement) scoreElement.style.display = 'none';
}

/** Hides the title screen overlay. */
export function hideTitleScreen() {
     if (titleScreenElement) titleScreenElement.style.display = 'none';
}

/** Shows the main game UI elements (like score and high score). */
export function showGameScreen() {
    // Show score with smooth transition
    if (scoreElement) {
        scoreElement.style.display = 'block';
        scoreElement.style.opacity = C.UI_OPACITY_VISIBLE; // Use constant
        scoreElement.style.transition = `opacity ${C.UI_FADE_DURATION_MS / 1000}s`; // Use constant
    }

    // Show high score only if it's greater than 0
    if (highScoreElement) {
        const highScore = ScoreManager.getGlobalHighScore();
        if (highScore > 0) {
            highScoreElement.style.display = 'block';
            highScoreElement.style.opacity = C.UI_OPACITY_VISIBLE; // Use constant
            highScoreElement.style.transition = `opacity ${C.UI_FADE_DURATION_MS / 1000}s`; // Use constant
            // Make sure the display is up to date
            updateHighScoreDisplay(highScore);
        } else {
            // Hide high score if it's 0
            highScoreElement.style.display = 'none';
        }
    }

    // Show mobile controls only on mobile devices
    updateMobileControlsVisibility();

    // Ensure conflicting overlays are hidden (handled by gameStateChanged)
}

/**
 * Updates the score display based on increments or resets.
 * Triggered by 'scoreChanged' event.
 * @param {number} scoreIncrement - The value change (positive for increment, negative for reset signal).
 */
export function updateScore(scoreIncrement) {
    if (scoreIncrement < 0) {
        // Treat negative value as a signal to reset the score to 0
        currentScore = 0;
    } else {
        // Otherwise, add the increment to the current score
        currentScore += scoreIncrement;
    }

    // Update the display element
    if (scoreElement) {
        scoreElement.textContent = `${C.UI_SCORE_PREFIX}${currentScore}`; // Use constant
    }
}

/**
 * Checks if the current score exceeds the high score and updates the display in real-time.
 * Triggered by 'currentScoreUpdated' event.
 * @param {Object} data - Object containing score and levelId.
 */
function checkForLiveHighScore(data) {
    const { score, levelId } = data;

    // Get the appropriate high score based on level
    let currentHighScoreValue;
    if (levelId) {
        currentHighScoreValue = ScoreManager.getLevelHighScore(levelId);
    } else {
        currentHighScoreValue = ScoreManager.getGlobalHighScore();
    }

    // Check if current score exceeds high score
    if (score > currentHighScoreValue) {
        // Update the high score display in real-time
        updateHighScoreDisplay(score);

        // Make sure high score is visible during gameplay
        if (highScoreElement) {
            highScoreElement.style.display = 'block';

            // Add a pulse animation class
            highScoreElement.classList.add('high-score-pulse');

            // Remove the class after animation completes
            setTimeout(() => {
                highScoreElement.classList.remove('high-score-pulse');
            }, C.UI_PULSE_ANIMATION_DURATION_MS); // Use constant
        }

        // Update the ScoreManager's in-memory high score (but don't save to localStorage yet)
        // This ensures consistent high score state across the application
        if (levelId) {
            ScoreManager.updateHighScore(score, levelId);
        } else {
            ScoreManager.updateHighScore(score);
        }

        // Note: The actual save to localStorage happens in ScoreManager.updateHighScore
    }
}

/**
 * Updates the score display with a specific value
 * @param {number} score - The score value to display
 */
export function updateScoreDisplay(score) {
    currentScore = score;
    if (scoreElement) {
        scoreElement.textContent = `${C.UI_SCORE_PREFIX}${currentScore}`; // Use constant
    }
}

/**
 * Updates the high score display
 * @param {number} highScore - The high score value to display
 */
export function updateHighScoreDisplay(highScore) {
    currentHighScore = highScore;
    if (highScoreElement) {
        highScoreElement.textContent = `${C.UI_HIGH_SCORE_PREFIX}${currentHighScore}`; // Use constant
    }

    // Also update the game over high score element if it exists
    if (gameOverHighScoreElement) {
        gameOverHighScoreElement.textContent = `${C.UI_HIGH_SCORE_PREFIX}${currentHighScore}`; // Use constant
    }
}

/**
 * Adds the click listener to the start button.
 * @param {function} startGameCallback - The function to call when the button is clicked.
 */
export function setupStartButton(startGameCallback) {
    if (startButtonElement && startGameCallback) {
        // Ensure listener isn't added multiple times if called again
        startButtonElement.replaceWith(startButtonElement.cloneNode(true));
        startButtonElement = document.getElementById('startButton'); // Re-fetch the cloned element

        startButtonElement.addEventListener('click', () => {
            // Sound etc. should be handled by the callback (e.g., in Game class)
            startGameCallback();
        });
    } else {
        displayError(new Error("Start button or callback missing for setup."));
    }
}

/**
 * Adds the click listener to the level select button.
 * @param {function} showLevelSelectCallback - The function to call when the button is clicked.
 */
export function setupLevelSelectButton(showLevelSelectCallback) {
    if (levelSelectButtonElement && showLevelSelectCallback) {
        // Ensure listener isn't added multiple times if called again
        levelSelectButtonElement.replaceWith(levelSelectButtonElement.cloneNode(true));
        levelSelectButtonElement = document.getElementById('levelSelectButton'); // Re-fetch the cloned element

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
        // Ensure listener isn't added multiple times if called again
        backToTitleButtonElement.replaceWith(backToTitleButtonElement.cloneNode(true));
        backToTitleButtonElement = document.getElementById('backToTitleButton'); // Re-fetch the cloned element

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

    // Clear previous list items
    levelListElement.innerHTML = '';

    levels.forEach(level => {
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        button.textContent = level.name;
        button.onclick = () => selectLevelCallback(level.id);
        button.classList.add('level-select-button'); // Add class for styling
        listItem.appendChild(button);
        levelListElement.appendChild(listItem);
    });
}

/** Shows the pause menu overlay. */
export function showPauseMenu() {
    logger.info("Showing pause menu");
    if (pauseMenuElement) {
        pauseMenuElement.style.display = 'flex';
        logger.debug("Pause menu element display set to flex"); // Changed to debug level
    } else {
        displayError(new Error("Pause menu element not found when trying to show it."));
    }
    // Hide score and high score during pause
    if (scoreElement) scoreElement.style.display = 'none';
    if (highScoreElement) highScoreElement.style.display = 'none';
}

/** Hides the pause menu overlay. */
export function hidePauseMenu() {
    logger.info("Hiding pause menu");
    if (pauseMenuElement) {
        pauseMenuElement.style.display = 'none';
        logger.debug("Pause menu element display set to none"); // Changed to debug level
    } else {
        displayError(new Error("Pause menu element not found when trying to hide it."));
    }

    // Immediately show score UI when hiding pause menu - no delay
    if (scoreElement) {
        scoreElement.style.display = 'block';
        scoreElement.style.opacity = C.UI_OPACITY_VISIBLE; // Use constant
    }

    // Only show high score if it's greater than 0
    if (highScoreElement) {
        const highScore = ScoreManager.getGlobalHighScore();
        if (highScore > 0) {
            highScoreElement.style.display = 'block';
            highScoreElement.style.opacity = C.UI_OPACITY_VISIBLE; // Use constant
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
    // Use helper to avoid repetition
    const setupButton = (buttonElement, id, callback) => {
        let element = buttonElement; // Use local variable
        if (element && callback) {
            element.replaceWith(element.cloneNode(true));
            element = document.getElementById(id); // Re-fetch by ID
            if (element) {
                 element.addEventListener('click', callback);
            } else {
                 displayError(new Error(`Pause menu button #${id} not found after clone.`));
            }
            return element; // Return the potentially new element reference
        }
        return buttonElement; // Return original if no setup happened
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
    // Use helper to avoid repetition
    const setupButton = (buttonElement, id, callback) => {
        let element = buttonElement; // Use local variable
        if (element && callback) {
            element.replaceWith(element.cloneNode(true));
            element = document.getElementById(id); // Re-fetch by ID
            if (element) {
                 element.addEventListener('click', callback);
            } else {
                 displayError(new Error(`Game over button #${id} not found after clone.`));
            }
            return element; // Return the potentially new element reference
        }
        return buttonElement; // Return original if no setup happened
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
        levelId = data.levelId; // Get levelId if provided
    } else {
        highScore = data;
    }

    // Update high score display
    updateHighScoreDisplay(highScore);

    // Make sure high score element is visible
    if (highScoreElement) {
        highScoreElement.style.display = 'block';
        highScoreElement.style.opacity = '1';
    }

    // Save the high score to localStorage via ScoreManager
    // This is a safety measure in case the score wasn't already saved
    ScoreManager.updateHighScore(highScore, levelId);

    // Show notification with improved positioning
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
 * @param {number} [duration=C.UI_NOTIFICATION_DURATION_MS] - How long to show the notification in ms
 */
function showNotification(message, className = '', duration = C.UI_NOTIFICATION_DURATION_MS) { // Use constant default
    if (!notificationElement) return;

    // Clear any existing timeout
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    // Set notification content and show it
    notificationElement.textContent = message;
    notificationElement.className = 'notification';
    if (className) {
        notificationElement.classList.add(className);
    }
    notificationElement.style.display = 'block';

    // Let the CSS animation handle the appearance
    // Reset animation by removing and re-adding the class
    notificationElement.style.animation = 'none';
    void notificationElement.offsetWidth; // Force reflow
    notificationElement.style.animation = 'fadeIn 0.3s ease-out';

    // Set timeout to hide notification
    notificationTimeout = setTimeout(() => {
        // Fade out using constants
        notificationElement.style.opacity = C.UI_OPACITY_HIDDEN;
        notificationElement.style.transform = 'translateY(-20px)'; // Keep transform for now
        notificationElement.style.transition = `opacity ${C.UI_NOTIFICATION_FADE_DURATION_MS / 1000}s ease, transform ${C.UI_NOTIFICATION_FADE_DURATION_MS / 1000}s ease`;

        // Hide after animation
        setTimeout(() => {
            notificationElement.style.display = 'none';
            // Reset for next time
            notificationElement.style.opacity = '';
            notificationElement.style.transform = '';
            notificationElement.style.transition = '';
        }, C.UI_NOTIFICATION_FADE_DURATION_MS); // Use constant
    }, duration);
}

/**
 * Displays an error message overlay on the screen.
 * @param {Error} error - The error object.
 */
export function displayError(error) {
     logger.error("Displaying error to user:", error);
     // Avoid creating multiple error divs if called repeatedly
     let errorDiv = document.getElementById('runtimeErrorDisplay');
     if (!errorDiv) {
         errorDiv = document.createElement('div');
         errorDiv.id = 'runtimeErrorDisplay'; // Give it an ID
         errorDiv.style.position = 'fixed'; // Use fixed to stay in view
         errorDiv.style.bottom = '10px';
         errorDiv.style.left = '10px';
         errorDiv.style.padding = '15px';
         errorDiv.style.backgroundColor = 'rgba(200, 0, 0, 0.85)';
         errorDiv.style.color = 'white';
         errorDiv.style.fontFamily = 'monospace';
         errorDiv.style.fontSize = '14px';
         errorDiv.style.border = '1px solid darkred';
         errorDiv.style.borderRadius = '5px';
         errorDiv.style.zIndex = '1000'; // Ensure it's on top
         errorDiv.style.maxWidth = '80%';
         errorDiv.style.whiteSpace = 'pre-wrap'; // Allow wrapping
         document.body.appendChild(errorDiv);
     }
     // Append new error message or replace content
     errorDiv.textContent = `Error: ${error.message}\n(Check console for more details)`;
     errorDiv.style.display = 'block'; // Ensure it's visible
}

/**
 * Updates the level selection screen with unlocked levels
 * @param {Array<string>} unlockedLevels - Array of unlocked level IDs
 */
export function updateUnlockedLevels(unlockedLevels) {
    if (!levelListElement) return;

    // Clear existing level list
    levelListElement.innerHTML = '';

    // Get level data from LevelManager
    const levelData = LevelManager.getAvailableLevels(); // Assumes this returns an array like [{id: 'level1', name: 'Forest', description: '...', unlocked: true}, ...]
    if (!levelData) {
        logger.error("Could not retrieve level data from LevelManager.");
        return;
    }

    // Create level selection buttons from LevelManager data
    levelData.forEach(data => {
        const levelButton = document.createElement('div');
        levelButton.className = 'level-button'; // Keep class for styling
        const isUnlocked = ScoreManager.isLevelUnlocked(data.id); // Check unlock status via ScoreManager
        if (!isUnlocked) {
            levelButton.classList.add('locked'); // Keep class for styling
        }

        const levelName = document.createElement('h3');
        levelName.textContent = data.name;

        const levelDesc = document.createElement('p');
        // Use description from level data if available, otherwise use constant for locked text
        levelDesc.textContent = isUnlocked ? (data.description || '') : C.UI_LOCKED_LEVEL_TEXT;

        levelButton.appendChild(levelName);
        levelButton.appendChild(levelDesc);

        if (isUnlocked) {
            levelButton.addEventListener('click', () => {
                eventBus.emit('uiButtonClicked');
                eventBus.emit('requestLevelTransition', data.id); // Use data.id
            });
        }

        levelListElement.appendChild(levelButton);
    });
}

// Removed function addCustomStyles() - Styles moved to style.css