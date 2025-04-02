// js/playerController.js
import * as THREE from 'three';
import * as Config from './config.js';
import * as AudioManager from './audioManager.js';
import { animatePlayerCharacter } from './playerCharacter.js';
import { keyLeftPressed, keyRightPressed, mouseLeftPressed, mouseRightPressed } from './controlsSetup.js';

// Helper vectors (consider making these local if not needed elsewhere)
const forwardVector = new THREE.Vector3(0, 0, -1);
const playerDirection = new THREE.Vector3();
const playerQuaternion = new THREE.Quaternion();
const downVector = new THREE.Vector3(0, -1, 0); // For terrain raycasting

// Raycaster instance (passed in for efficiency)
let _raycaster;

/**
 * Initializes the player controller with necessary dependencies.
 * @param {THREE.Raycaster} raycasterInstance - The shared raycaster instance.
 */
export function initPlayerController(raycasterInstance) {
    _raycaster = raycasterInstance;
}

/**
 * Updates the player's state, including position, rotation, animation, and terrain following.
 * @param {object} playerObj - The player object containing model, modelParts, currentSpeed.
 * @param {number} deltaTime - Time elapsed since the last frame.
 * @param {number} elapsedTime - Total time elapsed.
 * @param {ChunkManager} chunkManager - For terrain height checks.
 * @param {function} updateCameraFollowFunc - Function to update camera position based on player.
 */
export function updatePlayer(playerObj, deltaTime, elapsedTime, chunkManager, updateCameraFollowFunc) {
    if (!playerObj || !playerObj.model || !_raycaster) {
        console.warn("Player object or raycaster not properly initialized for updatePlayer.");
        return;
    }

    const playerModel = playerObj.model; // Convenience reference to the THREE.Group
    const playerParts = playerObj.modelParts; // Convenience reference to animatable parts

    // --- Update Speed (Uncapped) ---
    playerObj.currentSpeed += Config.PLAYER_SPEED_INCREASE_RATE * deltaTime;

    // 1. Calculate Rotation Deltas based on combined keyboard and mouse input
    let rotationInput = 0; // -1 for right, 0 for none, 1 for left
    if (keyLeftPressed) {
        rotationInput += 1;
    } else if (mouseLeftPressed) {
        // console.log("Steering Left (Mouse)"); // Debug log removed
        rotationInput += 1;
    }

    if (keyRightPressed) {
        rotationInput -= 1;
    } else if (mouseRightPressed) {
        // console.log("Steering Right (Mouse)"); // Debug log removed
        rotationInput -= 1;
    }

    // Calculate total rotation applied this frame
    const totalRotationDelta = rotationInput * Config.PLAYER_KEY_TURN_SPEED * deltaTime;

    // Apply total rotation
    if (Math.abs(totalRotationDelta) > 0.001) { // Only play sound if turning significantly
        playerModel.rotation.y += totalRotationDelta;
        AudioManager.playTurnSound();
    } else {
        playerModel.rotation.y += totalRotationDelta; // Apply small adjustments without sound
    }

    // 2. Handle Tilting (Roll) based on TOTAL rotation speed
    const totalRotationRate = (deltaTime > 0) ? totalRotationDelta / deltaTime : 0;
    const targetTilt = -totalRotationRate * Config.PLAYER_TILT_FACTOR;
    const tiltSmoothingFactor = 1.0 - Math.pow(Config.PLAYER_TILT_SMOOTHING, deltaTime);
    playerModel.rotation.z = THREE.MathUtils.lerp(playerModel.rotation.z, targetTilt, tiltSmoothingFactor);

    // 3. Animate Limbs
    const speedRatio = playerObj.currentSpeed / Config.PLAYER_SPEED;
    const cappedSpeedFactor = Math.min(speedRatio, Config.PLAYER_MAX_ANIMATION_SPEED_FACTOR);
    const dynamicAnimSpeed = Config.PLAYER_ANIMATION_BASE_SPEED * cappedSpeedFactor;
    animatePlayerCharacter(playerParts, elapsedTime, dynamicAnimSpeed);

    // 4. Move Forward (in the direction the player is facing)
    const moveDistance = playerObj.currentSpeed * deltaTime;
    playerModel.getWorldQuaternion(playerQuaternion);
    playerDirection.copy(forwardVector).applyQuaternion(playerQuaternion).normalize();
    playerModel.position.addScaledVector(playerDirection, moveDistance);

    // 5. Terrain Following (using two rays)
    if (chunkManager) {
        const currentPosition = playerModel.position;
        const nearbyMeshes = chunkManager.getTerrainMeshesNear(currentPosition);
        let highestGroundY = -Infinity;
        let groundFound = false;

        // Ray 1: Front
        const rayOriginFront = new THREE.Vector3(
            currentPosition.x,
            currentPosition.y + Config.PLAYER_RAYCAST_ORIGIN_OFFSET,
            currentPosition.z - Config.PLAYER_RAYCAST_STRIDE_OFFSET
        );
        _raycaster.set(rayOriginFront, downVector);
        const intersectsFront = _raycaster.intersectObjects(nearbyMeshes);
        if (intersectsFront.length > 0) {
            highestGroundY = Math.max(highestGroundY, intersectsFront[0].point.y);
            groundFound = true;
        }

        // Ray 2: Back
        const rayOriginBack = new THREE.Vector3(
            currentPosition.x,
            currentPosition.y + Config.PLAYER_RAYCAST_ORIGIN_OFFSET,
            currentPosition.z + Config.PLAYER_RAYCAST_STRIDE_OFFSET
        );
        _raycaster.set(rayOriginBack, downVector);
        const intersectsBack = _raycaster.intersectObjects(nearbyMeshes);
        if (intersectsBack.length > 0) {
            highestGroundY = Math.max(highestGroundY, intersectsBack[0].point.y);
            groundFound = true;
        }

        // Set player Y position based on highest ground found
        if (groundFound) {
            playerModel.position.y = highestGroundY + Config.PLAYER_HEIGHT_OFFSET;
        } else {
            // Optional: Implement falling physics or handle edge cases
            // console.warn(`No ground intersection found below player stride`);
        }
    }

    // 6. Camera Following (Call the passed-in function)
    if (updateCameraFollowFunc) {
        updateCameraFollowFunc(playerObj, deltaTime);
    } else {
        console.warn("updateCameraFollowFunc not provided to updatePlayer.");
    }
}