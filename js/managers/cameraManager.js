// js/managers/cameraManager.js
import * as THREE from 'three';
import { cameraConfig } from '../config/camera.js'; // Import specific config object
import { GameStates } from '../core/gameStateManager.js'; // Moved to core
import { createLogger, LogLevel } from '../utils/logger.js'; // Stays in utils, import LogLevel
import eventBus from '../core/eventBus.js'; // Moved to core

const logger = createLogger('CameraManager', LogLevel.INFO); // Use logger instance, set level to INFO

// Constants for camera transitions
const TITLE_LOOK_AT_TARGET = new THREE.Vector3(0, 0, 0);

// Reusable vectors for calculations
const _targetPosition = new THREE.Vector3();
const _cameraOffset = new THREE.Vector3();
const _rotatedOffset = new THREE.Vector3();
const _targetQuaternion = new THREE.Quaternion();
const _targetRotationMatrix = new THREE.Matrix4();
const _newPosition = new THREE.Vector3();


class CameraManager {
    constructor() {
        this.camera = null;
        this.renderer = null;
        this.initialCameraPosition = new THREE.Vector3();
        this.clock = new THREE.Clock();

        this.isTransitioning = false;
        this.transitionType = null;
        this.cameraStartPosition = null;
        this.cameraStartQuaternion = null;
        this.transitionTimeElapsed = 0; // Track time elapsed during transition
        this.transitionDuration = 0.6; // Default, can be overridden

        this.titleCameraDrift = null;

        // Store last gameplay camera position to prevent jerking
        this._lastGameplayPosition = null;
        this._lastGameplayLookAt = null;

        // Transition smoothing properties
        this._justCompletedTransition = false;
        this._transitionCompletionTime = 0;
        this._smoothingFramesAfterTransition = 0;
        this._frameCountAfterTransition = 0;

        logger.info("CameraManager instantiated");
    }

    // --- Initialization ---

    setCamera(camera) {
        this.camera = camera;
        this.initialCameraPosition.copy(camera.position);
        this._initializeCameraDrift();
        logger.info("Camera set and initial position stored.");
    }

    setRenderer(renderer) {
        this.renderer = renderer;
        logger.info("Renderer set.");
    }

    // --- Update Loop ---

    update(deltaTime, currentState, player) {
        if (!this.camera) return;

        if (this.isTransitioning) {
            if (this.transitionType === 'toTitle') {
                this._transitionCameraToTitle(deltaTime);
            } else if (this.transitionType === 'toGameplay') {
                this._updateCameraTransition(deltaTime, player);
            }
        } else {
            // Normal state updates
            if (currentState === GameStates.PLAYING && player?.model) {
                this.updateCameraFollow(player, deltaTime);
            } else if (currentState === GameStates.TITLE || currentState === GameStates.LEVEL_SELECT) {
                this._updateTitleCamera(deltaTime);
            }
        }
    }

    // --- Transitions ---

    startTransitionToTitle(currentCameraPosition, currentCameraQuaternion) {
        if (this.isTransitioning) {
            logger.warn("Already transitioning, cannot start new transition to title.");
            return;
        }
        logger.info("Starting camera transition to title.");
        this.isTransitioning = true;
        this.transitionType = 'toTitle';
        this.cameraStartPosition = currentCameraPosition.clone();
        this.cameraStartQuaternion = currentCameraQuaternion.clone();
        this.transitionTimeElapsed = 0; // Reset elapsed time
        this.transitionDuration = 0.5; // Faster transition to title
    }

    startTransitionToGameplay(currentCameraPosition, currentCameraQuaternion) {
        if (this.isTransitioning) {
            logger.warn("Already transitioning, cannot start new transition to gameplay.");
            return;
        }
        logger.info("Starting camera transition to gameplay.");
        this.isTransitioning = true;
        this.transitionType = 'toGameplay';
        this.cameraStartPosition = currentCameraPosition.clone();
        this.cameraStartQuaternion = currentCameraQuaternion.clone();
        this.transitionTimeElapsed = 0; // Reset elapsed time
        this.transitionDuration = 0.4; // Faster transition to gameplay
    }

    getIsTransitioning() {
        return this.isTransitioning;
    }

    // --- Camera Movement Logic ---

    /**
     * Calculates the target position and lookAt point for the gameplay camera.
     * @param {THREE.Object3D} playerModel - The player's 3D model.
     * @returns {{position: THREE.Vector3, lookAt: THREE.Vector3}} The target position and lookAt point.
     * @private
     */
    _calculateGameplayCameraTarget(playerModel) {
        playerModel.getWorldPosition(_targetPosition);

        _cameraOffset.set(
            cameraConfig.FOLLOW_OFFSET_X,
            cameraConfig.FOLLOW_OFFSET_Y,
            cameraConfig.FOLLOW_OFFSET_Z
        );

        _rotatedOffset.copy(_cameraOffset).applyQuaternion(playerModel.quaternion);
        const targetCameraPosition = _targetPosition.clone().add(_rotatedOffset);

        const lookAtPosition = _targetPosition.clone();
        lookAtPosition.y += cameraConfig.LOOK_AT_OFFSET_Y;

        return { position: targetCameraPosition, lookAt: lookAtPosition };
    }


    updateCameraFollow(playerObj, deltaTime) {
        if (!this.camera || !playerObj || !playerObj.model) return;

        const { position: targetCameraPosition, lookAt: lookAtPosition } = this._calculateGameplayCameraTarget(playerObj.model);

        // If we have a last gameplay position and this is the first frame after transition (deltaTime === 0),
        // use the exact last position from the transition to prevent jerking
        if (deltaTime === 0 && this._lastGameplayPosition && this._lastGameplayLookAt) {
            logger.debug("Using last gameplay position from transition");
            this.camera.position.copy(this._lastGameplayPosition);
            this.camera.lookAt(this._lastGameplayLookAt);

            // Don't clear the stored positions yet - keep using them for a few frames
            // to ensure smooth transition
            return;
        }

        // Apply extra smoothing for a few frames after transition
        let smoothFactor;
        if (this._justCompletedTransition && this._frameCountAfterTransition < this._smoothingFramesAfterTransition) {
            // Use a much smaller smoothing factor for the first few frames after transition
            // This creates a more gradual transition to normal camera following
            const transitionProgress = this._frameCountAfterTransition / this._smoothingFramesAfterTransition;
            const baseSmoothFactor = 1.0 - Math.pow(cameraConfig.SMOOTHING_FACTOR, deltaTime);

            // Start with a very small smoothing factor and gradually increase it
            smoothFactor = baseSmoothFactor * transitionProgress * 0.5;

            // Increment the frame counter
            this._frameCountAfterTransition++;

            // If we've reached the end of the extra smoothing period, reset the flags
            if (this._frameCountAfterTransition >= this._smoothingFramesAfterTransition) {
                this._justCompletedTransition = false;
                this._frameCountAfterTransition = 0;
                this._lastGameplayPosition = null;
                this._lastGameplayLookAt = null;
                logger.debug("Extra smoothing period complete, returning to normal camera follow");
            }
        } else {
            // Normal smoothing factor
            smoothFactor = 1.0 - Math.pow(cameraConfig.SMOOTHING_FACTOR, deltaTime);

            // Clear any remaining transition data
            if (this._lastGameplayPosition) {
                this._lastGameplayPosition = null;
                this._lastGameplayLookAt = null;
            }
        }

        // Apply the smoothing
        this.camera.position.lerp(targetCameraPosition, smoothFactor);
        this.camera.lookAt(lookAtPosition);
    }

    // --- Title Screen Camera Drift Logic ---

    _createCameraDrift(options = {}) {
        const config = {
            amplitude: options.amplitude || new THREE.Vector3(2, 1, 2),
            period: options.period || new THREE.Vector3(10, 15, 8),
            center: options.center || this.camera.position.clone(),
            smoothingFactor: options.smoothingFactor || 0.95
        };
        const originalPosition = config.center.clone();
        let driftElapsedTime = 0;
        const targetPosition = new THREE.Vector3(); // Reusable vector for drift target

        return (deltaTime) => {
            if (isNaN(deltaTime) || !isFinite(deltaTime) || deltaTime <= 0) {
                return;
            }

            driftElapsedTime += deltaTime;
            targetPosition.copy(originalPosition).add(
                new THREE.Vector3(
                    Math.sin(driftElapsedTime * (Math.PI * 2) / config.period.x) * config.amplitude.x,
                    Math.sin(driftElapsedTime * (Math.PI * 2) / config.period.y) * config.amplitude.y,
                    Math.sin(driftElapsedTime * (Math.PI * 2) / config.period.z) * config.amplitude.z
                )
            );

            if (isNaN(targetPosition.x) || isNaN(targetPosition.y) || isNaN(targetPosition.z)) {
                 logger.error(`NaN detected in camera drift targetPosition: ${targetPosition.toArray()}`);
                 return;
            }

            const lerpFactor = 0.02;
            this.camera.position.lerp(targetPosition, lerpFactor);
        };
    }


    _initializeCameraDrift() {
        if (this.camera) {
            this.titleCameraDrift = this._createCameraDrift({
                amplitude: new THREE.Vector3(15, 7.5, 10),
                period: new THREE.Vector3(45, 30, 60),
                center: this.initialCameraPosition.clone()
            });
            logger.info("Title camera drift initialized.");
        } else {
            logger.warn("Camera not set when trying to initialize drift.");
        }
    }

    _updateTitleCamera(deltaTime) {
        if (this.titleCameraDrift) {
            this.titleCameraDrift(deltaTime);
            this.camera.lookAt(TITLE_LOOK_AT_TARGET);
        }
    }

    // --- Camera Transition Implementation ---

    _transitionCameraToTitle(deltaTime) {
        if (!this.camera) return;

        this.transitionTimeElapsed += deltaTime;
        const progress = Math.min(this.transitionTimeElapsed / this.transitionDuration, 1.0);

        if (progress < 1.0) {
            const easedProgress = this._easeInOutCubic(progress);
            const targetPosition = this.initialCameraPosition;
            const startPos = this.cameraStartPosition || this.camera.position;
            _newPosition.lerpVectors(startPos, targetPosition, easedProgress);
            this.camera.position.copy(_newPosition);

            _targetRotationMatrix.lookAt(_newPosition, TITLE_LOOK_AT_TARGET, this.camera.up);
            _targetQuaternion.setFromRotationMatrix(_targetRotationMatrix);
            const startQuat = this.cameraStartQuaternion || this.camera.quaternion;

             if (startQuat && _targetQuaternion) {
                this.camera.quaternion.copy(startQuat).slerp(_targetQuaternion, easedProgress);
            } else {
                logger.warn("Missing start or target quaternion for slerp during title transition.");
                this.camera.lookAt(TITLE_LOOK_AT_TARGET);
            }
        } else {
            logger.info("Camera transition to title complete.");
            this.camera.position.copy(this.initialCameraPosition);
            this.camera.lookAt(TITLE_LOOK_AT_TARGET);
            this.isTransitioning = false;
            this.transitionType = null;
            this._initializeCameraDrift(); // Re-initialize drift for when we return
            eventBus.emit('cameraTransitionComplete', 'toTitle');
        }
    }

    _updateCameraTransition(deltaTime, player) {
         if (!this.camera || !player || !player.model) {
            logger.warn("Missing camera or player model during gameplay camera transition.");
            this.isTransitioning = false;
            this.transitionType = null;
            return;
        }

        // Calculate the *final* target state using the helper
        const { position: targetCameraPosition, lookAt: lookAtPosition } = this._calculateGameplayCameraTarget(player.model);

        // Increment elapsed time and calculate progress based on deltaTime
        this.transitionTimeElapsed += deltaTime;
        const progress = Math.min(this.transitionTimeElapsed / this.transitionDuration, 1.0);

        if (progress < 1.0) {
            const easedProgress = this._easeInOutCubic(progress);
            const startPos = this.cameraStartPosition || this.camera.position; // Use stored start position
            _newPosition.lerpVectors(startPos, targetCameraPosition, easedProgress);
            this.camera.position.copy(_newPosition);

            // Instead of using quaternion slerp which can cause the camera to angle down momentarily,
            // directly set the lookAt for consistent orientation throughout the transition
            this.camera.lookAt(lookAtPosition);

            // Store the current target position for the next frame
            // This ensures we always have the most up-to-date target
            this._lastGameplayPosition = targetCameraPosition.clone();
            this._lastGameplayLookAt = lookAtPosition.clone();
        } else {
            logger.info("Camera transition to player complete.");
            // Explicitly set the final position and orientation
            this.camera.position.copy(targetCameraPosition);
            this.camera.lookAt(lookAtPosition);

            // Store the final position and lookAt for the first frame of normal gameplay
            this._lastGameplayPosition = targetCameraPosition.clone();
            this._lastGameplayLookAt = lookAtPosition.clone();

            // Now transition is complete
            this.isTransitioning = false;
            this.transitionType = null;

            // Set a flag to indicate we just completed a transition
            // This will be used to ensure smooth camera movement in the next few frames
            this._justCompletedTransition = true;
            this._transitionCompletionTime = Date.now();
            this._smoothingFramesAfterTransition = 10; // Apply extra smoothing for 10 frames

            eventBus.emit('cameraTransitionComplete', 'toGameplay');
        }
    }


    // --- Utility ---

    _easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    handleResize() {
        if (this.camera && this.renderer) {
            const width = window.innerWidth;
            const height = window.innerHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
            logger.info(`Resized camera and renderer to ${width}x${height}`);
        } else {
            logger.warn("Cannot handle resize: Camera or renderer not set.");
        }
    }

    getCamera() {
        return this.camera;
    }

    getInitialPosition() {
        return this.initialCameraPosition.clone();
    }
}

// Singleton instance
const cameraManager = new CameraManager();

export default cameraManager;