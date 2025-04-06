// js/managers/cameraManager.js
import * as THREE from 'three';
import * as GlobalConfig from '../config/config.js'; // Moved to config
import { GameStates } from '../core/gameStateManager.js'; // Moved to core
import { createLogger } from '../utils/logger.js'; // Stays in utils
import eventBus from '../core/eventBus.js'; // Moved to core

const logger = createLogger('CameraManager'); // Use logger instance

// Constants for camera transitions
// const TITLE_TRANSITION_SPEED = 10.0; // Not directly used in current lerp/slerp logic
// const TITLE_TRANSITION_THRESHOLD_SQ = 0.01; // Not directly used
const TITLE_LOOK_AT_TARGET = new THREE.Vector3(0, 0, 0);

// const GAMEPLAY_TRANSITION_SPEED = 12.0; // Not directly used
// const GAMEPLAY_TRANSITION_THRESHOLD_SQ = 0.05; // Not directly used

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
        this.transitionStartTime = 0;
        this.transitionDuration = 0.6;

        this.titleCameraDrift = null;

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

    update(deltaTime, elapsedTime, currentState, player) {
        if (!this.camera) return;

        if (this.isTransitioning) {
            if (this.transitionType === 'toTitle') {
                this._transitionCameraToTitle(deltaTime);
            } else if (this.transitionType === 'toGameplay') {
                this._updateCameraTransition(deltaTime, elapsedTime, player);
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
        this.transitionStartTime = this.clock.getElapsedTime();
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
        this.transitionStartTime = this.clock.getElapsedTime();
        this.transitionDuration = 0.4; // Faster transition to gameplay
    }

    getIsTransitioning() {
        return this.isTransitioning;
    }

    // --- Camera Movement Logic ---

    updateCameraFollow(playerObj, deltaTime) {
        if (!this.camera || !playerObj || !playerObj.model) return;

        const playerModel = playerObj.model;
        const targetPosition = new THREE.Vector3();
        playerModel.getWorldPosition(targetPosition);

        const cameraOffset = new THREE.Vector3(
            GlobalConfig.CAMERA_FOLLOW_OFFSET_X,
            GlobalConfig.CAMERA_FOLLOW_OFFSET_Y,
            GlobalConfig.CAMERA_FOLLOW_OFFSET_Z
        );

        const rotatedOffset = cameraOffset.clone();
        rotatedOffset.applyQuaternion(playerModel.quaternion);

        const targetCameraPosition = targetPosition.clone().add(rotatedOffset);

        const smoothFactor = 1.0 - Math.pow(GlobalConfig.CAMERA_SMOOTHING_FACTOR, deltaTime);
        this.camera.position.lerp(targetCameraPosition, smoothFactor);

        const lookAtPosition = targetPosition.clone();
        lookAtPosition.y += GlobalConfig.CAMERA_LOOK_AT_OFFSET_Y;
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
        const targetPosition = new THREE.Vector3();

        return (deltaTime) => {
            // Add validation for deltaTime
            if (isNaN(deltaTime) || !isFinite(deltaTime) || deltaTime <= 0) {
                // logger.warn(`Invalid deltaTime in camera drift: ${deltaTime}`);
                return; // Skip update if deltaTime is invalid
            }

            driftElapsedTime += deltaTime;
            targetPosition.copy(originalPosition).add(
                new THREE.Vector3(
                    Math.sin(driftElapsedTime * (Math.PI * 2) / config.period.x) * config.amplitude.x,
                    Math.sin(driftElapsedTime * (Math.PI * 2) / config.period.y) * config.amplitude.y,
                    Math.sin(driftElapsedTime * (Math.PI * 2) / config.period.z) * config.amplitude.z
                )
            );

            // Add validation for targetPosition before lerping
            if (isNaN(targetPosition.x) || isNaN(targetPosition.y) || isNaN(targetPosition.z)) {
                 logger.error(`NaN detected in camera drift targetPosition: ${targetPosition.toArray()}`);
                 // Optionally reset drift or camera position here if needed
                 return; // Do not lerp if target is NaN
            }

            const lerpFactor = 0.02; // Consider making this configurable or deltaTime dependent
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

        const elapsedTime = this.clock.getElapsedTime();
        const timeElapsed = elapsedTime - this.transitionStartTime;
        const progress = Math.min(timeElapsed / this.transitionDuration, 1.0);

        if (progress < 1.0) {
            const easedProgress = this._easeInOutCubic(progress);
            const targetPosition = this.initialCameraPosition;
            const startPos = this.cameraStartPosition || this.camera.position;
            const newPosition = new THREE.Vector3().lerpVectors(startPos, targetPosition, easedProgress);
            this.camera.position.copy(newPosition);

            const targetRotationMatrix = new THREE.Matrix4();
            targetRotationMatrix.lookAt(newPosition, TITLE_LOOK_AT_TARGET, this.camera.up);
            const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(targetRotationMatrix);
            const startQuat = this.cameraStartQuaternion || this.camera.quaternion;

             if (startQuat && targetQuaternion) {
                // Corrected: Use slerp instance method. Assumes startQuat is the initial state for the transition.
                // If startQuat is meant to be the *current* quaternion each frame, this logic might need review,
                // but slerp from the starting quaternion is the standard way to handle this transition.
                this.camera.quaternion.copy(startQuat).slerp(targetQuaternion, easedProgress);
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
            this._initializeCameraDrift();
            eventBus.emit('cameraTransitionComplete', 'toTitle');
        }
    }

    _updateCameraTransition(deltaTime, elapsedTime, player) {
         if (!this.camera || !player || !player.model) {
            logger.warn("Missing camera or player model during gameplay camera transition.");
            this.isTransitioning = false;
            this.transitionType = null;
            return;
        }

        const playerModel = player.model;
        const playerPosition = new THREE.Vector3();
        playerModel.getWorldPosition(playerPosition);

        const cameraOffset = new THREE.Vector3(
            GlobalConfig.CAMERA_FOLLOW_OFFSET_X,
            GlobalConfig.CAMERA_FOLLOW_OFFSET_Y,
            GlobalConfig.CAMERA_FOLLOW_OFFSET_Z
        );
        const rotatedOffset = cameraOffset.clone().applyQuaternion(playerModel.quaternion);
        const targetCameraPosition = playerPosition.clone().add(rotatedOffset);
        const lookAtPosition = playerPosition.clone();
        lookAtPosition.y += GlobalConfig.CAMERA_LOOK_AT_OFFSET_Y;

        const timeElapsed = elapsedTime - this.transitionStartTime;
        const progress = Math.min(timeElapsed / this.transitionDuration, 1.0);

        if (progress < 1.0) {
            const easedProgress = this._easeInOutCubic(progress);
            const startPos = this.cameraStartPosition || this.camera.position;
            const newPosition = new THREE.Vector3().lerpVectors(startPos, targetCameraPosition, easedProgress);
            this.camera.position.copy(newPosition);

            const targetRotationMatrix = new THREE.Matrix4();
            targetRotationMatrix.lookAt(newPosition, lookAtPosition, this.camera.up);
            const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(targetRotationMatrix);
            const startQuat = this.cameraStartQuaternion || this.camera.quaternion;

            if (startQuat && targetQuaternion) {
                // Corrected: Use slerp instance method.
                this.camera.quaternion.copy(startQuat).slerp(targetQuaternion, easedProgress);
            } else {
                 logger.warn("Missing start or target quaternion for slerp during gameplay transition.");
                 this.camera.lookAt(lookAtPosition);
            }
        } else {
            logger.info("Camera transition to player complete.");
            this.isTransitioning = false;
            this.transitionType = null;
            this.camera.position.copy(targetCameraPosition);
            this.camera.lookAt(lookAtPosition);
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