// js/gameStateManager.js

import eventBus from './eventBus.js';

/**
 * Enum for all possible game states
 * @readonly
 * @enum {string}
 */
export const GameStates = Object.freeze({
    /** Initial asset loading */
    LOADING: 'loading',
    /** Title screen is visible */
    TITLE: 'title',
    /** Level selection screen is visible */
    LEVEL_SELECT: 'levelSelect',
    /** Game is active and being played */
    PLAYING: 'playing',
    /** Game is paused with menu visible */
    PAUSED: 'paused',
    /** Game over screen is visible */
    GAME_OVER: 'gameOver',
    /** Preparing to load next level (may show loading) */
    LEVEL_TRANSITION: 'levelTransition',
    /** Actively loading next level assets/chunks */
    LOADING_LEVEL: 'loadingLevel',
    /** Smooth camera transition back to title */
    TRANSITIONING_TO_TITLE: 'transitioningToTitle',
    /** Smooth camera transition to player before gameplay */
    TRANSITIONING_TO_GAMEPLAY: 'transitioningToGameplay'
});

/**
 * GameStateManager class handles state transitions and notifications
 */
class GameStateManager {
    constructor() {
        /** @private */
        this.currentState = GameStates.LOADING;

        /** @private */
        this.stateHistory = [GameStates.LOADING];

        /** @private */
        this.maxHistoryLength = 10;

        /** @private */
        this.stateChangeTime = Date.now();
    }

    /**
     * Gets the current game state
     * @returns {string} The current game state
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * Gets the previous game state
     * @returns {string|null} The previous state or null if no history
     */
    getPreviousState() {
        if (this.stateHistory.length < 2) {
            return null;
        }
        return this.stateHistory[this.stateHistory.length - 2];
    }

    /**
     * Gets the time (in ms) spent in the current state
     * @returns {number} Milliseconds in current state
     */
    getTimeInCurrentState() {
        return Date.now() - this.stateChangeTime;
    }

    /**
     * Sets the current game state and emits an event if it changes
     * @param {string} newState - The new state to set (should be one of GameStates)
     * @returns {boolean} Whether the state was changed
     */
    setGameState(newState) {
        // Validate the new state
        if (!Object.values(GameStates).includes(newState)) {
            console.warn(`[GameStateManager] Attempted to set invalid game state: ${newState}`);
            return false;
        }

        // Check if state is actually changing
        if (this.currentState === newState) {
            return false;
        }

        // Log the state change
        console.log(`[GameStateManager] State changing from ${this.currentState} to ${newState}`);

        // Update state and history
        this.currentState = newState;
        this.stateChangeTime = Date.now();

        // Add to history and trim if needed
        this.stateHistory.push(newState);
        if (this.stateHistory.length > this.maxHistoryLength) {
            this.stateHistory.shift();
        }

        // Notify listeners
        eventBus.emit('gameStateChanged', newState, this.getPreviousState());

        return true;
    }

    /**
     * Checks if the current state is one of the provided states
     * @param {...string} states - States to check against
     * @returns {boolean} Whether current state matches any of the provided states
     */
    isInState(...states) {
        return states.includes(this.currentState);
    }

    /**
     * Revert to the previous state if available
     * @returns {boolean} Whether the state was reverted
     */
    revertToPreviousState() {
        const previousState = this.getPreviousState();
        if (!previousState) {
            return false;
        }

        return this.setGameState(previousState);
    }
}

// Create and export a singleton instance
const gameStateManager = new GameStateManager();

// Export the instance methods as standalone functions for backward compatibility
export const getCurrentState = () => gameStateManager.getCurrentState();
export const setGameState = (newState) => gameStateManager.setGameState(newState);
export const getPreviousState = () => gameStateManager.getPreviousState();
export const isInState = (...states) => gameStateManager.isInState(...states);
export const getTimeInCurrentState = () => gameStateManager.getTimeInCurrentState();
export const revertToPreviousState = () => gameStateManager.revertToPreviousState();

// Export the manager instance itself for advanced usage
export default gameStateManager;