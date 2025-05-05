import * as UIManager from './uiManager.js';
import eventBus from '../core/eventBus.js';
import gameStateManager, { GameStates } from '../core/gameStateManager.js';
import * as LevelManager from './levelManager.js';
import { audioConfig } from '../config/audio.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AudioManager');

// Audio context and nodes
let audioContext = null;
let masterGain = null;
let musicSource = null;
let currentMusicId = null;

// Audio file paths (NO leading slash for relative paths)
const levelAudioMap = {
    'theme': 'assets/audio/openrunnertheme.wav',
    'level1': 'assets/audio/openrunnersong1.wav',
    'level2': 'assets/audio/openrunnersong2.wav',
}

export const effectAudioMap = {
    'buttonclick': 'assets/audio/buttonclick2.wav',
    'collision': 'assets/audio/collisionsound.wav',
    'coin': 'assets/audio/coinsound.wav',
    'gameover': 'assets/audio/gameover.wav',
    'powerup': 'assets/audio/powerupsound.wav',
    'turn': 'assets/audio/turnsound.wav',
}

// Track if user has interacted with the page to help with audio autoplay
// We now use window.audioUnlocked instead of a local variable
// This is set by the Click to Start screen
window.addEventListener('click', () => {
    // Update global audio unlock flag
    window.audioUnlocked = true;
    
    // Try to resume AudioContext if it exists and is suspended
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            logger.info("[AudioManager] AudioContext resumed after user interaction");
        });
    }
}, { once: false });

/**
 * Sets up the event listeners for the AudioManager.
 */
function setupEventListeners() {
    if (!audioContext) return;

    // Sound effects
    eventBus.subscribe('playerDied', () => {
        playWaveFile(effectAudioMap['collision']);
    });

    eventBus.subscribe('scoreChanged', (scoreIncrement) => {
        if (scoreIncrement > 0) {
            playWaveFile(effectAudioMap['coin']);
        }
    });

    eventBus.subscribe('uiButtonClicked', () => {
        playWaveFile(effectAudioMap['buttonclick']);
    });

    // Music based on game state
    eventBus.subscribe('gameStateChanged', async ({ newState, oldState }) => {
        logger.debug(`[AudioManager] Game state changed: ${oldState} -> ${newState}`);
        
        try {
            // First ensure audio can play
            if (audioContext?.state === 'suspended') {
                try {
                    await audioContext.resume();
                    logger.debug("[AudioManager] Resumed AudioContext on state change");
                } catch (e) {
                    logger.warn("[AudioManager] Failed to resume AudioContext:", e);
                }
            }

            // Handle specific transitions
            if (newState === GameStates.TITLE) {
                // Stop any current music before playing title theme
                await stopAllMusic();
                
                // Try to play theme music, but check if we're allowed to play audio yet
                logger.debug("[AudioManager] Starting theme music for title screen");
                
                // If the global audio unlock system is active, register with it
                if (window.userHasInteracted) {
                    // Direct path - user has already interacted
                    logger.debug("[AudioManager] User already interacted, playing theme directly");
                    await playMusic('theme');
                } else {
                    // Indirect path - wait for interaction
                    logger.debug("[AudioManager] Waiting for user interaction before playing theme");
                    // Register with global audio trigger system
                    if (typeof window.triggerAudioPlay === 'function') {
                        window.triggerAudioPlay({playMusic}); 
                    }
                }
            }
            else if (newState === GameStates.PLAYING) {
                // Ensure any previous music is fully stopped
                await stopAllMusic();
                
                // Add a short delay to ensure audio processing completes
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Force a complete reset of the audio state
                await forceResetMusicState();
                
                // Verify that music has stopped before starting new music
                if (currentMusicId) {
                    logger.warn(`[AudioManager] Music still playing (${currentMusicId}) after stop, forcing another reset`);
                    await stopAllMusic();
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                // Play level-specific music
                const currentLevelId = LevelManager.getCurrentLevelId();
                if (currentLevelId) {
                    logger.debug(`[AudioManager] Starting music for level: ${currentLevelId}`);
                    await playMusic(currentLevelId);
                }
            }
            else if (newState === GameStates.GAME_OVER) {
                // Stop any music and play game over sound
                await stopAllMusic();
                playWaveFile(effectAudioMap['gameover']);
            }
            else if (newState === GameStates.TRANSITIONING_TO_GAMEPLAY ||
                     newState === GameStates.LOADING_LEVEL) {
                // Just stop any music during transitions
                await stopAllMusic();
            }
        } catch (error) {
            logger.error("[AudioManager] Error handling game state change:", error);
        }
    });
}

/**
 * Initializes the Web Audio API context.
 * @returns {Promise<boolean>} Whether initialization was successful
 */
export async function initAudio() {
    logger.debug("[AudioManager] Initializing audio system");
    
    // Already initialized?
    if (audioContext) {
        logger.debug("[AudioManager] Audio already initialized");
        
        // Try to resume if suspended and user has interacted
        if (audioContext.state === 'suspended' && window.audioUnlocked) {
            try {
                logger.debug("[AudioManager] Attempting to resume existing AudioContext");
                await audioContext.resume();
                logger.debug("[AudioManager] Successfully resumed AudioContext");
            } catch (e) {
                logger.warn("[AudioManager] Could not resume AudioContext:", e);
            }
        }
        
        return true;
    }
    
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        logger.debug(`[AudioManager] AudioContext created with state: ${audioContext.state}`);
        
        // IMPORTANT: Expose the audio context to window for external interaction
        // This helps with the audio unlock system in the HTML
        window.gameAudioContext = audioContext;
        
        // Try to resume immediately if the user has already interacted
        if (window.audioUnlocked && audioContext.state === 'suspended') {
            try {
                logger.debug("[AudioManager] User has already interacted, attempting to resume AudioContext");
                await audioContext.resume();
            } catch (e) {
                logger.warn("[AudioManager] Could not resume AudioContext despite user interaction:", e);
            }
        }
        
        // Create master gain node
        masterGain = audioContext.createGain();
        masterGain.gain.setValueAtTime(audioConfig.INITIAL_MASTER_GAIN, audioContext.currentTime);
        masterGain.connect(audioContext.destination);
        
        // Set up event listeners
        setupEventListeners();
        
        // DO NOT play any music here - wait for state changes
        logger.debug("[AudioManager] Audio system initialization complete");
        return true;
    } catch (e) {
        logger.error('[AudioManager] Audio initialization failed:', e);
        UIManager.displayError(new Error('Audio system failed to initialize. Game audio will be disabled.'));
        audioContext = null;
        return false;
    }
}

/**
 * Stops all currently playing music and resets audio state.
 * @returns {Promise<boolean>} Whether the operation was successful
 */
export async function stopAllMusic() {
    logger.debug("[AudioManager] Stopping all music");
    
    if (!audioContext) {
        logger.debug("[AudioManager] No audio context to stop music");
        return true;
    }
    
    try {
        // Stop and disconnect the current music source if it exists
        if (musicSource) {
            try {
                // Create a safety timeout to force reset if stop doesn't complete
                const safetyTimeout = setTimeout(() => {
                    logger.warn("[AudioManager] Safety timeout triggered - forcing music source reset");
                    musicSource = null;
                    currentMusicId = null;
                }, 500);
                
                // Attempt to properly stop and disconnect
                musicSource.stop();
                musicSource.disconnect();
                
                // Clear the safety timeout
                clearTimeout(safetyTimeout);
                
                logger.debug("[AudioManager] Stopped active music source");
            } catch (e) {
                logger.warn("[AudioManager] Error stopping music source:", e);
                // Force reset even after error
                musicSource = null;
            }
        }
        
        // Double-check audio state and explicitly null out to ensure cleanup
        if (musicSource) {
            logger.warn("[AudioManager] Music source still active after stop, forcing null");
            try {
                musicSource.disconnect();
            } catch (e) {
                // Ignore disconnect errors, we're trying to force cleanup
            }
            musicSource = null;
        }
        
        // Reset state
        currentMusicId = null;
        
        return true;
    } catch (e) {
        logger.error("[AudioManager] Error stopping music:", e);
        // Ensure clean state even after error
        musicSource = null;
        currentMusicId = null;
        return false;
    }
}

/**
 * Forces a reset of the music state to help with audio issues.
 * @returns {Promise<boolean>} Whether the operation was successful
 */
export async function forceResetMusicState() {
    logger.debug("[AudioManager] Force resetting music state");
    
    // First stop any current music
    await stopAllMusic();
    
    // Try to resume the audio context if it's suspended
    if (audioContext?.state === 'suspended') {
        try {
            await audioContext.resume();
            logger.debug("[AudioManager] Successfully resumed AudioContext");
        } catch (e) {
            logger.warn("[AudioManager] Could not resume AudioContext:", e);
        }
    }
    
    return true;
}

/**
 * Get the AudioContext for direct access.
 * @returns {AudioContext|null} The current AudioContext or null
 */
export function getAudioContext() {
    return audioContext;
}

/**
 * Plays background music for a specific level.
 * @param {string} levelId - 'theme', 'level1', or 'level2'
 * @param {number} volume - Volume level from 0 to 1 (default: 0.3)
 * @returns {Promise<boolean>} Whether playback started successfully
 */
export async function playMusic(levelId = 'theme', volume = 0.3) {
    logger.debug(`[AudioManager] Request to play ${levelId} music`);
    
    // Verify audio context exists
    if (!audioContext) {
        logger.error(`[AudioManager] Cannot play ${levelId} music: No AudioContext`);
        return false;
    }
    
    // Check if this music is already playing
    if (currentMusicId === levelId && musicSource) {
        logger.debug(`[AudioManager] ${levelId} music already playing`);
        return true;
    }
    
    try {
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            logger.debug("[AudioManager] Attempting to resume AudioContext");
            try {
                await audioContext.resume();
            } catch (e) {
                logger.warn("[AudioManager] Failed to resume AudioContext:", e);
                // If user hasn't interacted, we may not be able to play audio yet
                if (!window.audioUnlocked) {
                    logger.warn("[AudioManager] Cannot play audio until user interacts with the page");
                    return false;
                }
            }
        }
        
        // Make sure any previous music is completely stopped
        await stopAllMusic();
        
        // Double-check to ensure no music is playing from previous state
        if (currentMusicId || musicSource) {
            logger.warn(`[AudioManager] Music still active after stopAllMusic. Forcing reset before playing ${levelId}`);
            await forceResetMusicState();
            // Add a short delay to ensure audio processing completes
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Verify the game state to ensure we're not playing inappropriate music
        const currentState = gameStateManager.getCurrentState();
        if (levelId === 'theme' && currentState !== GameStates.TITLE) {
            logger.warn(`[AudioManager] Attempted to play theme music in ${currentState} state, aborting`);
            return false;
        }
        
        // Get the audio file path
        const filePath = levelAudioMap[levelId];
        if (!filePath) {
            logger.error(`[AudioManager] No audio file defined for level: ${levelId}`);
            return false;
        }
        
        // Load and decode the audio file
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio file: ${response.status}`);
        }
        
        const audioData = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(audioData);
        
        // Create and configure the source
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;
        
        // Create and configure the gain node
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume;
        
        // Connect the audio nodes
        source.connect(gainNode);
        gainNode.connect(masterGain);
        
        // Start playback
        source.start(0);
        
        // Update state
        musicSource = source;
        currentMusicId = levelId;
        
        // Handle when source ends (unlikely with loop=true)
        source.onended = () => {
            if (musicSource === source) {
                musicSource = null;
                currentMusicId = null;
                logger.debug(`[AudioManager] ${levelId} music ended`);
            }
        };
        
        logger.debug(`[AudioManager] Successfully started ${levelId} music`);
        return true;
    } catch (error) {
        logger.error(`[AudioManager] Error playing ${levelId} music:`, error);
        musicSource = null;
        currentMusicId = null;
        return false;
    }
}

/**
 * Checks if music is currently playing.
 * @returns {boolean} True if music is playing
 */
export function isMusicActive() {
    return musicSource !== null && currentMusicId !== null;
}

/**
 * Gets the ID of the currently playing music.
 * @returns {string|null} The level ID of current music
 */
export function getCurrentMusicId() {
    return currentMusicId;
}

/**
 * Plays a sound effect once.
 * @param {string} filePath - Path to the audio file
 * @param {number} volume - Volume level from 0 to 1 (default: 0.5)
 * @param {boolean} loop - Whether to loop the sound (default: false)
 * @returns {Promise<boolean>} Whether playback started successfully
 */
export async function playWaveFile(filePath, volume = 0.5, loop = false) {
    if (!audioContext || !masterGain) {
        logger.warn("[AudioManager] Cannot play sound effect: Audio not initialized");
        return false;
    }
    
    try {
        // Load and decode the audio file
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio file: ${response.status}`);
        }
        
        const audioData = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(audioData);
        
        // Create and configure the source
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = loop;
        
        // Create and configure the gain node
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume;
        
        // Connect the audio nodes
        source.connect(gainNode);
        gainNode.connect(masterGain);
        
        // Start playback
        source.start(0);
        
        return true;
    } catch (e) {
        logger.error("[AudioManager] Error playing sound effect:", e);
        return false;
    }
}

// For backward compatibility
export async function stopMusic() {
    logger.info("[AudioManager] stopMusic called (deprecated, use stopAllMusic)");
    return stopAllMusic();
}