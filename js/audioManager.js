// js/audioManager.js
import * as UIManager from './uiManager.js'; // Import UI Manager for error display

let audioContext = null;
let masterGain = null; // Master gain node for overall volume control

/**
 * Initializes the Web Audio API AudioContext.
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
        masterGain.gain.setValueAtTime(0.7, audioContext.currentTime); // Set initial volume (e.g., 70%)
        masterGain.connect(audioContext.destination);

        // Resume context if it starts suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    } catch (e) {
        // Display error to user if Web Audio fails
        UIManager.displayError(new Error('Web Audio API is not supported or failed to initialize. Game audio will be disabled.'));
        console.error('Web Audio API initialization failed:', e); // Keep console error for details
        audioContext = null; // Ensure it's null if failed
    }
}

/**
 * Plays a retro/8-bit style coin collection sound.
 */
export function playCoinSound() {
    if (!audioContext || !masterGain) return;
    const now = audioContext.currentTime;
    const duration = 0.1; // Short duration
    const frequency = 1800; // High pitch
    const volume = 0.4;

    // Oscillator (Square Wave)
    const osc = audioContext.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, now);

    // Gain node for volume envelope (Fast Attack, Sharp Decay)
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.005); // Very fast attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Sharp decay

    // Optional: Second oscillator for harmony (Perfect Fifth)
    const osc2 = audioContext.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(frequency * 1.5, now); // Perfect fifth
    const gainNode2 = audioContext.createGain();
    gainNode2.gain.setValueAtTime(0, now);
    gainNode2.gain.linearRampToValueAtTime(volume * 0.5, now + 0.005); // Lower volume
    gainNode2.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Connect nodes
    osc.connect(gainNode);
    gainNode.connect(masterGain);
    osc2.connect(gainNode2);
    gainNode2.connect(masterGain);

    // Start and stop
    osc.start(now);
    osc.stop(now + duration);
    osc2.start(now);
    osc2.stop(now + duration);
}

/**
 * Plays a retro/8-bit style collision sound (noise burst).
 */
export function playCollisionSound() {
    if (!audioContext || !masterGain) return;
    const now = audioContext.currentTime;
    const duration = 0.18; // Slightly longer noise burst
    const volume = 0.6;

    // Create buffer for white noise
    const bufferSize = Math.floor(audioContext.sampleRate * duration);
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1; // White noise
    }

    // Create buffer source
    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Optional: Low square wave for thump
    const lowOsc = audioContext.createOscillator();
    lowOsc.type = 'square';
    lowOsc.frequency.setValueAtTime(70, now); // Low frequency
    const lowGain = audioContext.createGain();
    lowGain.gain.setValueAtTime(volume * 0.3, now); // Quiet thump
    lowGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8); // Decay slightly faster

    // Gain node for main noise volume envelope
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01); // Sharp attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Fast decay

    // Connect nodes
    noiseSource.connect(gainNode);
    gainNode.connect(masterGain);
    lowOsc.connect(lowGain);
    lowGain.connect(masterGain);

    // Start the sources
    noiseSource.start(now);
    lowOsc.start(now);
    lowOsc.stop(now + duration * 0.8);
    // BufferSource stops automatically
}

/**
 * Plays a retro/8-bit style UI button click sound.
 */
export function playButtonClickSound() {
    if (!audioContext || !masterGain) return;
    const now = audioContext.currentTime;
    const duration = 0.03; // Extremely short
    const frequency = 1000; // Mid-range pitch
    const volume = 0.3;

    // Oscillator
    const osc = audioContext.createOscillator();
    osc.type = 'square'; // Square or triangle
    osc.frequency.setValueAtTime(frequency, now);

    // Gain node (very fast envelope)
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.002); // Extremely fast attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Very fast decay

    // Connect
    osc.connect(gainNode);
    gainNode.connect(masterGain);

    // Start/Stop
    osc.start(now);
    osc.stop(now + duration);
}

/**
 * Plays a retro/8-bit style descending arpeggio for game over.
 */
export function playGameOverSound() {
    if (!audioContext || !masterGain) return;
    const now = audioContext.currentTime;
    const noteDuration = 0.15;
    const gap = 0.08;
    const startVolume = 0.4;
    const frequencies = [392.00, 329.63, 261.63, 261.63 * 0.8]; // G4, E4, C4, ~G#3 (Lower)
    const vibratoRate = 10; // Hz
    const vibratoDepth = 5; // Hz

    frequencies.forEach((freq, index) => {
        const startTime = now + index * (noteDuration + gap);

        // Main Oscillator (Square Wave)
        const osc = audioContext.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, startTime);

        // Optional: LFO for Vibrato
        const lfo = audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(vibratoRate, startTime);
        const lfoGain = audioContext.createGain();
        lfoGain.gain.setValueAtTime(vibratoDepth, startTime);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency); // Modulate frequency

        // Gain node for envelope per note
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(startVolume, startTime + 0.01); // Quick attack
        gainNode.gain.setValueAtTime(startVolume, startTime + noteDuration * 0.7); // Hold briefly
        gainNode.gain.linearRampToValueAtTime(0.001, startTime + noteDuration); // Decay

        // Connect
        osc.connect(gainNode);
        gainNode.connect(masterGain);

        // Schedule start/stop
        lfo.start(startTime);
        lfo.stop(startTime + noteDuration);
        osc.start(startTime);
        osc.stop(startTime + noteDuration);
    });
}

/**
 * Plays a retro/8-bit style turn sound (short low blip).
 */
export function playTurnSound() {
    if (!audioContext || !masterGain) return;
    const now = audioContext.currentTime;
    const duration = 0.05; // Very short
    const frequency = 300; // Low-ish pitch
    const volume = 0.15; // Quiet

    // Oscillator
    const osc = audioContext.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, now);

    // Gain node
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.005); // Fast attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Fast decay

    // Connect
    osc.connect(gainNode);
    gainNode.connect(masterGain);

    // Start/Stop
    osc.start(now);
    osc.stop(now + duration);
}

console.log('audioManager.js loaded');
