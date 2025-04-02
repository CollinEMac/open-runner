// js/gameStateManager.js

// Define possible game states
export const GameStates = Object.freeze({
    LOADING: 'loading',             // Initial asset loading
    TITLE: 'title',                 // Title screen is visible
    LEVEL_SELECT: 'levelSelect',    // Level selection screen is visible
    PLAYING: 'playing',             // Game is active
    PAUSED: 'paused',               // Game is paused with menu visible
    GAME_OVER: 'gameOver',          // Game over screen is visible
    LEVEL_TRANSITION: 'levelTransition', // Preparing to load next level (may show loading)
    LOADING_LEVEL: 'loadingLevel'   // Actively loading next level assets/chunks
});

let currentState = GameStates.LOADING; // Initial state

/**
 * Gets the current game state.
 * @returns {string} The current game state.
 */
export function getCurrentState() {
    return currentState;
}

/**
 * Sets the current game state.
 * @param {string} newState - The new state to set (should be one of GameStates).
 */
export function setGameState(newState) {
    // Optional: Add validation to ensure newState is a valid state
    if (Object.values(GameStates).includes(newState)) {
        if (currentState !== newState) {
            console.log(`Game state changing from ${currentState} to ${newState}`);
            currentState = newState;
            // Optional: Dispatch an event or trigger callbacks on state change here
        }
    } else {
        console.warn(`Attempted to set invalid game state: ${newState}`);
    }
}

// Initialize with the loading state