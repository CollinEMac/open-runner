// js/uiManager.js
import eventBus from './eventBus.js';
import { GameStates } from './gameStateManager.js'; // Import states for comparison

// --- Element References ---
let scoreElement;
let highScoreElement;
let gameOverElement;
let gameOverScoreElement;
let gameOverHighScoreElement;
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
 * @param {string} newState - The new game state (from GameStates).
 */
function handleGameStateChange(newState) {
    console.log(`[UIManager] Handling state change: ${newState}`);
    // Hide all major screen overlays by default, then show the correct one
    if (titleScreenElement) titleScreenElement.style.display = 'none';
    if (gameOverElement) gameOverElement.style.display = 'none';
    if (loadingScreenElement) loadingScreenElement.style.display = 'none';
    if (levelSelectScreenElement) levelSelectScreenElement.style.display = 'none';
    if (pauseMenuElement) pauseMenuElement.style.display = 'none';
    // Keep score display visibility separate (managed below)

    switch (newState) {
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
            showGameScreen(); // Shows score, ensures game over is hidden
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
            showLoadingScreen("Transitioning...");
             if (scoreElement) scoreElement.style.display = 'none'; // Hide score
            break;
        default:
            console.warn(`[UIManager] Unhandled game state for UI: ${newState}`);
    }
}

/**
 * Displays the game over screen with the final score and high score.
 * Triggered by the 'gameOverInfo' event.
 * @param {Object|number} scoreData - Object containing score information or just the score.
 */
function showGameOverScreenWithScore(scoreData) {
    // Handle both old and new formats
    let finalScore, highScore, levelId;

    if (typeof scoreData === 'object') {
        finalScore = scoreData.score;
        highScore = scoreData.highScore;
        levelId = scoreData.levelId;
    } else {
        // Legacy support for when finalScore was passed directly
        finalScore = scoreData;
        highScore = currentHighScore;
    }

    // Update internal score
    currentScore = finalScore;
    currentHighScore = highScore;

    // Update game over screen
    if (gameOverElement) {
        // Clear previous content
        gameOverElement.innerHTML = '<h2>GAME OVER!</h2>';

        // Add score elements if they don't exist
        if (gameOverScoreElement) {
            gameOverScoreElement.textContent = `Score: ${finalScore}`;
        } else {
            const scoreEl = document.createElement('div');
            scoreEl.id = 'gameOverScore';
            scoreEl.className = 'game-over-score';
            scoreEl.textContent = `Score: ${finalScore}`;
            gameOverElement.appendChild(scoreEl);
        }

        if (gameOverHighScoreElement) {
            gameOverHighScoreElement.textContent = `High Score: ${highScore}`;
        } else {
            const highScoreEl = document.createElement('div');
            highScoreEl.id = 'gameOverHighScore';
            highScoreEl.className = 'game-over-high-score';
            highScoreEl.textContent = `High Score: ${highScore}`;
            gameOverElement.appendChild(highScoreEl);
        }

        // Add restart instruction
        const restartInstr = document.createElement('div');
        restartInstr.className = 'game-over-instruction';
        restartInstr.textContent = 'Press R to Restart';
        gameOverElement.appendChild(restartInstr);

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
    // Get existing UI elements
    scoreElement = document.getElementById('scoreDisplay');
    gameOverElement = document.getElementById('gameOverDisplay');
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
        highScoreElement.innerHTML = 'High Score: 0';
        document.body.appendChild(highScoreElement);
    }

    // Get or create game over score elements
    gameOverScoreElement = document.getElementById('gameOverScore');
    if (!gameOverScoreElement && gameOverElement) {
        gameOverScoreElement = document.createElement('div');
        gameOverScoreElement.id = 'gameOverScore';
        gameOverScoreElement.className = 'game-over-score';
        gameOverScoreElement.innerHTML = 'Score: 0';
        gameOverElement.appendChild(gameOverScoreElement);
    }

    gameOverHighScoreElement = document.getElementById('gameOverHighScore');
    if (!gameOverHighScoreElement && gameOverElement) {
        gameOverHighScoreElement = document.createElement('div');
        gameOverHighScoreElement.id = 'gameOverHighScore';
        gameOverHighScoreElement.className = 'game-over-high-score';
        gameOverHighScoreElement.innerHTML = 'High Score: 0';
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
        eventBus.subscribe('levelUnlockSaved', (levelId) => {
            showLevelUnlockedNotification(`Level ${levelId} Unlocked!`);
        });
        console.log("[UIManager] Subscribed to events");
    } catch (e) {
         console.error("[UIManager] Failed to subscribe to eventBus events:", e);
         displayError(new Error("Failed to set up UI event listeners."));
         return false; // Critical failure
    }

    // Add CSS for new UI elements
    addCustomStyles();

    // Initial state setup (handled by gameStateChanged event emission later)
    // We can set a default safe state here before the first gameStateChanged event fires
    handleGameStateChange(GameStates.LOADING); // Assume initial state is LOADING
    updateScore(0); // Initialize score display to 0
    updateHighScoreDisplay(0); // Initialize high score display to 0

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
             progressTextElement.textContent = `Loading... ${percentage.toFixed(0)}%`;
        }
    }
}

/** Hides the loading screen overlay. */
export function hideLoadingScreen() {
    if (loadingScreenElement) loadingScreenElement.style.display = 'none';
}

/**
 * Shows the loading screen overlay.
 * @param {string} [message='Loading...'] - Optional message to display.
 */
export function showLoadingScreen(message = 'Loading...') {
    if (loadingScreenElement) {
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
    if (titleScreenElement) titleScreenElement.style.display = 'flex';
}

/** Hides the title screen overlay. */
export function hideTitleScreen() {
     if (titleScreenElement) titleScreenElement.style.display = 'none';
}

/** Shows the main game UI elements (like score). */
export function showGameScreen() {
    if (scoreElement) scoreElement.style.display = 'block';
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
        scoreElement.textContent = `Score: ${currentScore}`;
    }
}

/**
 * Updates the score display with a specific value
 * @param {number} score - The score value to display
 */
export function updateScoreDisplay(score) {
    currentScore = score;
    if (scoreElement) {
        scoreElement.textContent = `Score: ${currentScore}`;
    }
}

/**
 * Updates the high score display
 * @param {number} highScore - The high score value to display
 */
export function updateHighScoreDisplay(highScore) {
    currentHighScore = highScore;
    if (highScoreElement) {
        highScoreElement.textContent = `High Score: ${currentHighScore}`;
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
        console.warn("Level select button or callback missing for setup.");
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
        console.log("[UIManager] Back to title button setup complete");
    } else {
        console.warn("Back to title button or callback missing for setup.");
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
    console.log("UI Manager: Showing pause menu");
    if (pauseMenuElement) {
        pauseMenuElement.style.display = 'flex';
        console.log("Pause menu element display set to flex");
    } else {
        displayError(new Error("Pause menu element not found when trying to show it."));
    }
    if (scoreElement) scoreElement.style.display = 'none'; // Hide score during pause
}

/** Hides the pause menu overlay. */
export function hidePauseMenu() {
    console.log("UI Manager: Hiding pause menu");
    if (pauseMenuElement) {
        pauseMenuElement.style.display = 'none';
        console.log("Pause menu element display set to none");
    } else {
        displayError(new Error("Pause menu element not found when trying to hide it."));
    }
    // Score visibility is handled by the gameStateChanged handler when returning to PLAYING state
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
 * Shows a notification for a new high score
 * @param {Object|number} data - Either the high score value or an object with score property
 */
export function showNewHighScoreNotification(data) {
    let highScore;

    if (typeof data === 'object') {
        highScore = data.score;
    } else {
        highScore = data;
    }

    // Update high score display
    updateHighScoreDisplay(highScore);

    // Show notification
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
 * @param {number} [duration=3000] - How long to show the notification in ms
 */
function showNotification(message, className = '', duration = 3000) {
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

    // Animate in
    notificationElement.style.opacity = '0';
    notificationElement.style.transform = 'translateY(20px)';

    // Force reflow
    void notificationElement.offsetWidth;

    // Animate in
    notificationElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    notificationElement.style.opacity = '1';
    notificationElement.style.transform = 'translateY(0)';

    // Set timeout to hide notification
    notificationTimeout = setTimeout(() => {
        // Animate out
        notificationElement.style.opacity = '0';
        notificationElement.style.transform = 'translateY(-20px)';

        // Hide after animation
        setTimeout(() => {
            notificationElement.style.display = 'none';
        }, 300);
    }, duration);
}

/**
 * Displays an error message overlay on the screen.
 * @param {Error} error - The error object.
 */
export function displayError(error) {
     console.error("Displaying error to user:", error);
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

    // Level data with display names and descriptions
    const levelData = {
        'level1': {
            name: 'Forest',
            description: 'Run through the lush forest landscape',
            unlocked: true // Always unlocked
        },
        'level2': {
            name: 'Desert',
            description: 'Navigate the scorching desert terrain',
            unlocked: unlockedLevels.includes('level2')
        }
        // Add more levels as needed
    };

    // Create level selection buttons
    Object.entries(levelData).forEach(([levelId, data]) => {
        const levelButton = document.createElement('div');
        levelButton.className = 'level-button';
        if (!data.unlocked) {
            levelButton.classList.add('locked');
        }

        const levelName = document.createElement('h3');
        levelName.textContent = data.name;

        const levelDesc = document.createElement('p');
        levelDesc.textContent = data.unlocked ? data.description : 'Locked - Complete previous levels to unlock';

        levelButton.appendChild(levelName);
        levelButton.appendChild(levelDesc);

        if (data.unlocked) {
            levelButton.addEventListener('click', () => {
                eventBus.emit('uiButtonClicked');
                eventBus.emit('requestLevelTransition', levelId);
            });
        }

        levelListElement.appendChild(levelButton);
    });
}

/**
 * Adds custom CSS styles for new UI elements
 */
function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .high-score {
            position: fixed;
            top: 50px;
            right: 20px;
            color: gold;
            font-size: 24px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }

        .notification {
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            font-size: 20px;
            z-index: 1000;
            text-align: center;
        }

        .high-score-notification {
            color: gold;
            font-weight: bold;
        }

        .level-unlock-notification {
            color: #7cfc00;
            font-weight: bold;
        }

        .game-over-score, .game-over-high-score {
            font-size: 24px;
            margin: 10px 0;
        }

        .game-over-high-score {
            color: gold;
        }

        .game-over-instruction {
            margin-top: 20px;
            font-size: 18px;
            opacity: 0.8;
        }

        .level-button {
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            padding: 15px;
            margin: 10px 0;
            cursor: pointer;
            transition: background-color 0.3s;
        }

        .level-button:hover {
            background-color: rgba(255, 255, 255, 0.3);
        }

        .level-button.locked {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .level-button h3 {
            margin: 0 0 10px 0;
        }

        .level-button p {
            margin: 0;
            font-size: 14px;
            opacity: 0.8;
        }
    `;
    document.head.appendChild(style);
}