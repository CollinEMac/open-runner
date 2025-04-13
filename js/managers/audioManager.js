// js/managers/audioManager.js
import * as UIManager from './uiManager.js';
import eventBus from '../core/eventBus.js';
import { GameStates } from '../core/gameStateManager.js';
import { audioConfig } from '../config/audio.js'; // Import specific audio config
import { createLogger } from '../utils/logger.js'; // Import logger

const logger = createLogger('AudioManager'); // Instantiate logger

let audioContext = null;
let masterGain = null; // Master gain node for overall volume control
let musicSource = null;
let currentMusicId = null; // Track which music is currently playing

const levelAudioMap = {
    'theme': '/assets/audio/openrunnertheme.wav',
    'level1': '/assets/audio/openrunnersong1.wav',
    'level2': '/assets/audio/openrunnersong2.wav',
}

export const effectAudioMap = {
    'buttonclick': '/assets/audio/buttonclick2.wav',
    'collision': '/assets/audio/collisionsound.wav',
    'coin': '/assets/audio/coinsound.wav',
    'gameover': '/assets/audio/gameover.wav',
    'turn': '/assets/audio/turnsound.wav',
}

/**
 * Sets up the event listeners for the AudioManager.
 * Assumes audioContext is initialized.
 */
function setupEventListeners() {
    if (!audioContext) return;

    // Listen for player death (collision)
    eventBus.subscribe('playerDied', () => {
       playWaveFile(effectAudioMap['collision']); 
    });

    // Listen for game state changes (specifically for Game Over and Title)
    eventBus.subscribe('gameStateChanged', ({ newState, previousState }) => { // Destructure newState and previousState
        logger.info(`Audio handling game state change: ${previousState} -> ${newState}`);
        
        if (newState === GameStates.GAME_OVER) {
            // For game over, we play the sound but don't change music
            playWaveFile(effectAudioMap['gameover']);
        } else if (newState === GameStates.TITLE) {
            // Only play theme music when returning to title if we're not already playing it
            // This prevents theme music from restarting unnecessarily
            if (currentMusicId !== 'theme') {
                stopMusic(); // Explicitly stop any current music first
                setTimeout(() => {
                    playMusic('theme');
                    logger.info("Playing theme music when returning to title screen");
                }, 50); // Small delay to ensure proper audio thread synchronization
            } else {
                logger.info("Theme music already playing, not restarting");
            }
        }
    });

    // Listen for score changes (coin collection)
    eventBus.subscribe('scoreChanged', (scoreIncrement) => {
        // Only play sound for positive score changes (collections)
        if (scoreIncrement > 0) {
            playWaveFile(effectAudioMap['coin']);
        }
    });

    // Listen for generic UI button clicks
    eventBus.subscribe('uiButtonClicked', () => {
        playWaveFile(effectAudioMap['buttonclick']);
    });
}

/**
 * Initializes the Web Audio API AudioContext and sets up event listeners.
 * Must be called after a user interaction (e.g., button click).
 */
export function initAudio() {
    if (audioContext) {
        return; // Already initialized
    }
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Create and connect a master gain node
        masterGain = audioContext.createGain();
        masterGain.gain.setValueAtTime(audioConfig.INITIAL_MASTER_GAIN, audioContext.currentTime); // Use audioConfig
        masterGain.connect(audioContext.destination);

        // Resume context if it starts suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                 setupEventListeners(); // Setup listeners after context is ready
            }).catch(e => {
                 logger.error("Failed to resume AudioContext:", e);
                 UIManager.displayError(new Error('Failed to resume audio context. Audio might not work.'));
            });
        } else {
             setupEventListeners(); // Setup listeners immediately if context is running
        }

        // start the game with the theme music playing
        playMusic('theme');

    } catch (e) {
        // Display error to user if Web Audio fails
        UIManager.displayError(new Error('Web Audio API is not supported or failed to initialize. Game audio will be disabled.'));
        logger.error('Web Audio API initialization failed:', e); // Use logger for consistency
        audioContext = null; // Ensure it's null if failed
    }
}

/**
 * Stops the currently playing background music.
 * Uses a robust approach to ensure music actually stops.
 * @returns {Promise<boolean>} Promise that resolves to true if music was stopped
 */
export async function stopMusic() {
    logger.info("[AudioManager] Stopping music");
    
    try {
        // Standard stop approach
        if (musicSource) {
            // Reset the master gain as a fallback if needed
            if (masterGain) {
                masterGain.disconnect();
                masterGain = audioContext.createGain();
                masterGain.gain.setValueAtTime(audioConfig.INITIAL_MASTER_GAIN, audioContext.currentTime);
                masterGain.connect(audioContext.destination);
            }
        }
        
        // Reset tracking variables
        musicSource = null;
        currentMusicId = null;
        
        return true;
    } catch (e) {
        logger.error("[AudioManager] Error stopping music:", e);
        musicSource = null;
        currentMusicId = null;
        return false;
    }
}

/**
 * Plays background music with reliable stopping of any previous music.
 * @param {string} levelId - the level music to play (e.g., 'level1', 'level2', 'theme')
 * @param {number} volume - Volume level from 0 to 1 (default: 0.3)
 * @returns {Promise<AudioBufferSourceNode|null>} The audio source node or null if playback failed
 */
export async function playMusic(levelId = 'theme', volume = 0.3) {
    // Skip if this exact music is already playing
    if (currentMusicId === levelId && musicSource) {
        logger.info(`[AudioManager] ${levelId} music already playing`);
        return musicSource;
    }
    
    try {
        // Stop any current music
        await stopMusic();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Get file path
        const filePath = levelAudioMap[levelId];
        if (!filePath) {
            logger.error(`[AudioManager] No audio file defined for level: ${levelId}`);
            return null;
        }
        
        // Ensure audio context is running
        if (audioContext.state !== 'running') {
            await audioContext.resume();
        }
        
        // Load and play audio
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio file: ${response.status}`);
        }
        
        const audioData = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(audioData);
        
        // Create and connect nodes
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume;
        
        source.connect(gainNode);
        gainNode.connect(masterGain);
        
        // Start playback
        source.start(0);
        
        // Update tracking variables
        musicSource = source;
        currentMusicId = levelId;
        
        // Clean up when music ends
        source.onended = () => {
            if (musicSource === source) {
                musicSource = null;
                currentMusicId = null;
            }
        };
        
        logger.info(`[AudioManager] Playing ${levelId} music`);
        return source;
        
    } catch (error) {
        logger.error(`[AudioManager] Error playing music for ${levelId}:`, error);
        musicSource = null;
        currentMusicId = null;
        return null;
    }
}

/**
 * Checks if music is currently playing.
 * @returns {boolean} True if music is playing, false otherwise
 */
export function isMusicActive() {
    return currentMusicId !== null && musicSource !== null;
}

/**
 * Gets the ID of the currently playing music.
 * @returns {string|null} The ID of the current music, or null if no music is playing
 */
export function getCurrentMusicId() {
    return currentMusicId;
}

/**
 * Plays a wave file from the specified path.
 * @param {string} filePath - Path to the wave file
 * @param {number} volume - Volume level from 0 to 1 (default: 0.5)
 * @param {boolean} loop - Whether to loop the audio (default: false)
 * @returns {Promise<AudioBufferSourceNode|null>} The audio source node or null if playback failed
 */
export async function playWaveFile(filePath, volume = 0.5, loop = false) {
    if (!audioContext || !masterGain) {
        console.error("[AudioManager] Cannot play wave file: Audio context not initialized");
        return null;
    }

    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
        }

        // Get the audio data as ArrayBuffer
        const audioData = await response.arrayBuffer();

        // Decode the audio data
        const audioBuffer = await audioContext.decodeAudioData(audioData);

        // Create a buffer source node
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = loop;

        // Create a gain node for volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume;

        // Connect nodes: source -> gain -> masterGain -> destination
        source.connect(gainNode);
        gainNode.connect(masterGain);

        // Start playback
        source.start(0);

        // Return the source node so it can be stopped if needed
        return source;

    } catch (e) {
        logger.error("[AudioManager] Error playing wave file:", e);
        return null;
    }
}
