// js/uiManager.js

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

/**
 * Initializes the UI Manager by getting references to DOM elements.
 * Must be called before other UI functions.
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

    // Basic check for essential elements
    if (!loadingScreenElement || !progressBarElement || !progressTextElement ||
        !scoreElement || !gameOverElement || !titleScreenElement || !startButtonElement ||
        !levelSelectScreenElement || !levelListElement) {
        console.error("One or more UI elements not found! Check HTML IDs.");
        return false;
    }

    // Initial state setup (hide game elements, show loading)
    if (scoreElement) scoreElement.style.display = 'none';
    if (gameOverElement) gameOverElement.style.display = 'none';
    if (titleScreenElement) titleScreenElement.style.display = 'none';
    if (loadingScreenElement) loadingScreenElement.style.display = 'flex'; // Show loading initially
    if (levelSelectScreenElement) levelSelectScreenElement.style.display = 'none';
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
        progressTextElement.textContent = `Loading... ${percentage.toFixed(0)}%`;
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
    if (gameOverElement) gameOverElement.style.display = 'none'; // Ensure game over is hidden
}

/**
 * Shows the game over screen with the final score.
 * @param {number} finalScore - The player's final score.
 */
export function showGameOverScreen(finalScore) {
    if (gameOverElement) {
        gameOverElement.innerHTML = `GAME OVER!<br>Final Score: ${finalScore}<br>(Press R to Restart)`;
        gameOverElement.style.display = 'flex';
    }
     if (scoreElement) scoreElement.style.display = 'none'; // Hide score during game over
}

/**
 * Updates the score display.
 * @param {number} newScore - The new score to display.
 */
export function updateScore(newScore) {
    if (scoreElement) {
        scoreElement.textContent = `Score: ${newScore}`;
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
             // Optionally play sound here if AudioManager is imported, or handle in main.js
            startGameCallback();
        });
    } else {
        console.error("Start button or callback missing for setup.");
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
        console.error("Level list element or select callback missing.");
        return;
    }

    // Clear previous list items
    levelListElement.innerHTML = '';

    levels.forEach(level => {
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        button.textContent = level.name;
        button.onclick = () => selectLevelCallback(level.id);
        // Add styling class if needed: button.classList.add('level-select-button');
        listItem.appendChild(button);
        levelListElement.appendChild(listItem);
    });
}

/**
 * Displays an error message overlay on the screen.
 * @param {Error} error - The error object.
 */
export function displayError(error) {
     console.error("Displaying error to user:", error);
     const errorDiv = document.createElement('div');
     errorDiv.style.position = 'absolute';
     errorDiv.style.top = '10px';
     errorDiv.style.left = '10px';
     errorDiv.style.padding = '10px';
     errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
     errorDiv.style.color = 'white';
     errorDiv.style.fontFamily = 'monospace';
     errorDiv.style.zIndex = '1000'; // Ensure it's on top
     errorDiv.textContent = `Error: ${error.message}\nCheck console for details.`;
     document.body.appendChild(errorDiv);
}