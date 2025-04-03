// js/uiManager.js
import eventBus from './eventBus.js';
import { GameStates } from './gameStateManager.js'; // Import states for comparison

// --- Element References ---
let scoreElement;
let gameOverElement;
let titleScreenElement;
let startButtonElement;
let loadingScreenElement;
let progressBarElement;
let progressTextElement;
let levelSelectScreenElement;
let levelListElement;
let pauseMenuElement;
let resumeButtonElement;
let restartButtonElement;
let returnToTitleButtonElement;

// --- Internal State ---
let currentScore = 0; // Keep track internally for display

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
 * Displays the game over screen with the final score.
 * Triggered by the 'gameOverInfo' event.
 * @param {number} finalScore - The player's final score.
 */
function showGameOverScreenWithScore(finalScore) {
    // Update internal score just in case, though Game class is the source of truth
    currentScore = finalScore;
    if (gameOverElement) {
        gameOverElement.innerHTML = `GAME OVER!<br>Final Score: ${finalScore}<br>(Press R to Restart)`;
        gameOverElement.style.display = 'flex';
    }
    // Ensure other conflicting elements are hidden
    if (scoreElement) scoreElement.style.display = 'none';
    if (pauseMenuElement) pauseMenuElement.style.display = 'none';
    if (titleScreenElement) titleScreenElement.style.display = 'none';
}


/**
 * Initializes the UI Manager by getting references and setting up event listeners.
 * @returns {boolean} True if all essential elements were found, false otherwise.
 */
export function initUIManager() {
    scoreElement = document.getElementById('scoreDisplay');
    gameOverElement = document.getElementById('gameOverDisplay');
    titleScreenElement = document.getElementById('titleScreen');
    startButtonElement = document.getElementById('startButton');
    loadingScreenElement = document.getElementById('loadingScreen');
    progressBarElement = document.getElementById('progressBar');
    progressTextElement = document.getElementById('progressText');
    levelSelectScreenElement = document.getElementById('levelSelectScreen');
    levelListElement = document.getElementById('levelList');
    pauseMenuElement = document.getElementById('pauseMenu');
    resumeButtonElement = document.getElementById('resumeButton');
    restartButtonElement = document.getElementById('restartButton');
    returnToTitleButtonElement = document.getElementById('returnToTitleButton');

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
        console.log("[UIManager] Subscribed to events: scoreChanged, gameStateChanged, gameOverInfo");
    } catch (e) {
         console.error("[UIManager] Failed to subscribe to eventBus events:", e);
         displayError(new Error("Failed to set up UI event listeners."));
         return false; // Critical failure
    }


    // Initial state setup (handled by gameStateChanged event emission later)
    // We can set a default safe state here before the first gameStateChanged event fires
    handleGameStateChange(GameStates.LOADING); // Assume initial state is LOADING
    updateScore(0); // Initialize score display to 0

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