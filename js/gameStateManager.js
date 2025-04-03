// js/gameStateManager.js

import eventBus from './eventBus.js'; // Import the event bus

// Define possible game states
export const GameStates = Object.freeze({
    LOADING: 'loading',             // Initial asset loading
    TITLE: 'title',                 // Title screen is visible
    LEVEL_SELECT: 'levelSelect',    // Level selection screen is visible
    PLAYING: 'playing',             // Game is active
    PAUSED: 'paused',               // Game is paused with menu visible
    GAME_OVER: 'gameOver',          // Game over screen is visible
    LEVEL_TRANSITION: 'levelTransition', // Preparing to load next level (may show loading)
    LOADING_LEVEL: 'loadingLevel',   // Actively loading next level assets/chunks
    TRANSITIONING_TO_TITLE: 'transitioningToTitle' // Added: Smooth camera transition back to title
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
 * Sets the current game state and emits an event if it changes.
 * @param {string} newState - The new state to set (should be one of GameStates).
 */
export function setGameState(newState) {
    // Optional: Add validation to ensure newState is a valid state
    if (Object.values(GameStates).includes(newState)) {
        if (currentState !== newState) {
            console.log(`Game state changing from ${currentState} to ${newState}`);
            currentState = newState;
            eventBus.emit('gameStateChanged', newState); // Emit event on state change
        }
    } else {
        console.warn(`Attempted to set invalid game state: ${newState}`);
    }
}

// Initialize with the loading state
// (No explicit initialization needed here, default `currentState` handles it)