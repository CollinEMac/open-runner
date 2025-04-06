// js/entities/enemy.js
import * as THREE from 'three';
import { createLogger } from '../utils/logger.js'; // Import logger
// Import specific constants and the ENEMY_DEFAULTS object
import {
    ENEMY_DEFAULTS, // Contains default properties
    ENEMY_DEFAULT_SPEED, ENEMY_DEFAULT_AGGRO_RADIUS, ENEMY_DEFAULT_DEAGGRO_RADIUS,
    ENEMY_DEFAULT_ROAMING_RADIUS, ENEMY_DEFAULT_ROAMING_SPEED_FACTOR,
    ENEMY_DEFAULT_ROAMING_MIN_WAIT, ENEMY_DEFAULT_ROAMING_MAX_WAIT,
    ENEMY_POSITION_SMOOTHING, ENEMY_ROTATION_SLERP,
    ENEMY_GROUND_CHECK_OFFSET, ENEMY_GROUND_SMOOTHING,
    ENEMY_RETURN_THRESHOLD, ENEMY_MOVE_THRESHOLD, ENEMY_LOOK_THRESHOLD_SQ,
    ENEMY_ANIMATION_SPEED_FACTOR, ENEMY_LEG_SWING_AMPLITUDE, ENEMY_STOPPED_ANIM_SMOOTHING,
    ENEMY_GROUND_OFFSET_SNAKE, ENEMY_GROUND_HEIGHT_SNAKE,
    ENEMY_GROUND_OFFSET_SCORPION, ENEMY_GROUND_HEIGHT_SCORPION
} from '../config/config.js'; // Moved to config
import * as UIManager from '../managers/uiManager.js'; // Updated path
import * as ModelFactory from '../rendering/modelFactory.js'; // Updated path

const logger = createLogger('Enemy'); // Instantiate logger
import { smoothDamp } from '../utils/mathUtils.js'; // Import smoothing function
// Duplicate imports and logger instantiation removed

// --- Enemy States ---
const ENEMY_STATE = {
    IDLE: 'idle',
    ROAMING: 'roaming', // Added state
    CHASING: 'chasing',
    RETURNING: 'returning',
};

// Shared raycaster for grounding
const groundRaycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);
// Reusable objects for calculations within Enemy class methods
const _moveDirection = new THREE.Vector3();
const _lookTargetPos = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
const _lookAtMatrix = new THREE.Matrix4();
const _roamingTargetVec = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();

// --- Base Enemy Class ---
class Enemy {
    constructor(initialData, properties, scene, chunkManager) { // Added properties parameter
        if (!chunkManager) {
            const errorMsg = `[Enemy ${initialData.type}] Constructor missing ChunkManager! Grounding will fail.`;
            UIManager.displayError(new Error(errorMsg));
            logger.error(errorMsg); // Log error
        }
        this.scene = scene;
        this.chunkManager = chunkManager; // Store chunkManager
        this.type = initialData.type || 'unknown';
        this.originalPosition = initialData.position.clone(); // Keep original spawn height
        // Set properties from the passed object, using ENEMY_DEFAULTS as fallbacks
        this.speed = properties.speed ?? ENEMY_DEFAULT_SPEED;
        this.aggroRadius = properties.aggroRadius ?? ENEMY_DEFAULT_AGGRO_RADIUS;
        this.deaggroRadius = properties.deaggroRadius ?? ENEMY_DEFAULT_DEAGGRO_RADIUS;
        // Store roaming properties
        this.roamingRadius = properties.roamingRadius ?? ENEMY_DEFAULT_ROAMING_RADIUS;
        this.roamingSpeedFactor = properties.roamingSpeedFactor ?? ENEMY_DEFAULT_ROAMING_SPEED_FACTOR;
        this.roamingMinWaitTime = properties.roamingMinWaitTime ?? ENEMY_DEFAULT_ROAMING_MIN_WAIT;
        this.roamingMaxWaitTime = properties.roamingMaxWaitTime ?? ENEMY_DEFAULT_ROAMING_MAX_WAIT;
        this.state = ENEMY_STATE.IDLE;
        this.mesh = null; // Initialize mesh as null
        this.groundCheckCounter = Math.floor(Math.random() * 5); // Stagger initial checks
        this.lastGroundY = initialData.position.y; // Initialize with spawn height
        this.currentGroundY = initialData.position.y; // Current smoothed ground Y position
        this.roamingTarget = null; // Target position for roaming (use _roamingTargetVec for calculations)
        this.roamingWaitTimer = 0; // Timer for pausing during roaming
        this.positionSmoothingFactor = ENEMY_POSITION_SMOOTHING; // Use constant
        this.lastPosition = initialData.position.clone(); // Store last position for smoothing

        // Create and position the mesh AFTER super() call allows access to subclass methods
        try {
            this.mesh = this.createMesh(); // Calls subclass specific createMesh
        } catch (error) {
             logger.error(`Error creating mesh for ${this.type}:`, error);
             UIManager.displayError(new Error(`[Enemy] Failed to create mesh for type ${this.type}. See console.`));
             this.mesh = null; // Ensure mesh is null if creation failed
        }

        if (this.mesh) {
            // Initial position might be slightly off due to generator offset,
            // Grounding logic in first update will correct it.
            this.mesh.position.copy(initialData.position);
            this.mesh.rotation.y = initialData.rotationY || 0;
            // Ensure userData exists before adding properties
            if (!this.mesh.userData) this.mesh.userData = {};
            this.mesh.userData.enemyInstance = this; // Link mesh back to instance
            this.mesh.userData.objectType = this.type; // Store type in userData

            // Add mesh to the scene immediately upon creation
            if (this.scene) {
                this.scene.add(this.mesh);
            } else {
                const errorMsg = `[Enemy ${this.type}] Scene not available for adding mesh!`;
                UIManager.displayError(new Error(errorMsg));
                logger.error(errorMsg); // Log error
            }
        } else {
            // Error already logged during creation attempt
        }
    }

    // Placeholder - subclasses MUST override this
    createMesh() {
        const errorMsg = `createMesh() not implemented for subclass type ${this.type}!`;
        UIManager.displayError(new Error(`[Enemy] ${errorMsg}`));
        logger.error(errorMsg); // Log error
        return null; // Return null if not implemented
    }

    update(playerPos, deltaTime, elapsedTime) {
        if (!this.mesh || !this.chunkManager) return;

        // 1. Update Grounding
        this._updateGrounding();

        // 2. Update State Transitions
        this._updateState(playerPos, deltaTime);

        // 3. Update Movement & Orientation based on current state
        const { isMoving, currentSpeed } = this._updateMovement(playerPos, deltaTime);

        // 4. Update Animation based on movement
        this._updateAnimation(elapsedTime, isMoving, currentSpeed);

        // Optional Debug Log
        // const distanceToPlayer = this.mesh.position.distanceTo(playerPos);
    }

    // --- Private Helper Methods for Update Logic ---

    _updateGrounding() {
        // Stagger ground checks slightly for performance
        // this.groundCheckCounter++;
        // if (this.groundCheckCounter % 3 !== 0) return; // Check every 3 frames

        const currentPosition = this.mesh.position;

        // Perform ground check every frame using reusable vector
        _rayOrigin.set(currentPosition.x, currentPosition.y + ENEMY_GROUND_CHECK_OFFSET, currentPosition.z); // Use constant
        groundRaycaster.set(_rayOrigin, downVector);
        const nearbyTerrain = this.chunkManager.getTerrainMeshesNear(currentPosition);
        const intersects = groundRaycaster.intersectObjects(nearbyTerrain);

        if (intersects.length > 0) {
            this.lastGroundY = intersects[0].point.y;

            // Apply lerp using constant
            const smoothFactor = ENEMY_GROUND_SMOOTHING;
            this.currentGroundY = this.currentGroundY * (1.0 - smoothFactor) + this.lastGroundY * smoothFactor;

            // Apply the ground height with appropriate offset
            const legHeight = this.mesh.userData.legHeight || 0.5; // Use stored leg height or default
            this.mesh.position.y = this.currentGroundY + legHeight / 2;
        } else {
            // If no ground found, maybe slowly fall? Or just use last known good Y?
            // For now, maintain current Y or last known ground Y
             this.mesh.position.y = this.currentGroundY + (this.mesh.userData.legHeight || 0.5) / 2;
        }
    }

    _updateState(playerPos, deltaTime) {
        const distanceToPlayer = this.mesh.position.distanceTo(playerPos);
        const distanceToOrigin = this.mesh.position.distanceTo(this.originalPosition);

        switch (this.state) {
            case ENEMY_STATE.IDLE:
                this.state = ENEMY_STATE.ROAMING;
                this.pickNewRoamingTarget();
                // Fall through intended
            case ENEMY_STATE.ROAMING:
                 if (distanceToPlayer < this.aggroRadius) {
                    this.state = ENEMY_STATE.CHASING;
                    this.roamingTarget = null;
                    this.roamingWaitTimer = 0;
                 } else if (this.roamingWaitTimer > 0) {
                    this.roamingWaitTimer -= deltaTime;
                    if (this.roamingWaitTimer <= 0) {
                        this.pickNewRoamingTarget();
                    }
                 }
                break;
            case ENEMY_STATE.CHASING:
                if (distanceToPlayer > this.deaggroRadius) {
                    this.state = ENEMY_STATE.RETURNING;
                }
                break;
            case ENEMY_STATE.RETURNING:
                if (distanceToOrigin < ENEMY_RETURN_THRESHOLD) { // Use constant
                    this.state = ENEMY_STATE.ROAMING;
                    // Snap position to origin for stability? Or let movement handle it?
                    // this.mesh.position.copy(this.originalPosition);
                    this.roamingTarget = null;
                    this.setRoamingWaitTimer();
                } else if (distanceToPlayer < this.aggroRadius) { // Re-aggro if player comes back
                    this.state = ENEMY_STATE.CHASING;
                    this.roamingTarget = null;
                    this.roamingWaitTimer = 0;
                }
                break;
        }
    }

    _updateMovement(playerPos, deltaTime) {
        // Use reusable _moveDirection vector
        let targetPosition = null;
        let isMoving = false;
        let currentSpeed = this.speed;

        // Determine target based on state
        if (this.state === ENEMY_STATE.CHASING) {
            targetPosition = playerPos;
        } else if (this.state === ENEMY_STATE.RETURNING) {
            targetPosition = this.originalPosition;
        } else if (this.state === ENEMY_STATE.ROAMING && this.roamingTarget && this.roamingWaitTimer <= 0) {
            targetPosition = this.roamingTarget;
            currentSpeed = this.speed * this.roamingSpeedFactor;
        }

        isMoving = !!targetPosition && this.roamingWaitTimer <= 0;

        if (isMoving && targetPosition) {
            _moveDirection.subVectors(targetPosition, this.mesh.position);
            _moveDirection.y = 0; // Keep movement on the horizontal plane
            const distanceToTarget = _moveDirection.length();

            if (distanceToTarget > ENEMY_MOVE_THRESHOLD) { // Use constant threshold
                _moveDirection.normalize();
                const moveDistance = currentSpeed * deltaTime;

                if (moveDistance >= distanceToTarget) {
                    // Snap to target if overshooting
                    this.mesh.position.x = targetPosition.x;
                    this.mesh.position.z = targetPosition.z;
                    // Y position handled by grounding

                    if (this.state === ENEMY_STATE.ROAMING) {
                        this.roamingTarget = null;
                        this.setRoamingWaitTimer();
                        isMoving = false;
                    } else if (this.state === ENEMY_STATE.RETURNING) {
                        // Reached origin, switch to roaming/idle
                        this.state = ENEMY_STATE.ROAMING;
                        this.roamingTarget = null;
                        this.setRoamingWaitTimer();
                        isMoving = false;
                    }
                } else {
                    // Move toward target
                    this.mesh.position.x += _moveDirection.x * moveDistance;
                    this.mesh.position.z += _moveDirection.z * moveDistance;
                }

                // Update orientation smoothly using reusable objects and constant
                if (_moveDirection.lengthSq() > ENEMY_LOOK_THRESHOLD_SQ) { // Use constant
                    // Ensure lookAt target is not the same as current position
                    _lookTargetPos.copy(this.mesh.position).add(_moveDirection); // Use reusable vector
                    _lookAtMatrix.lookAt(this.mesh.position, _lookTargetPos, this.mesh.up); // Use reusable matrix
                    _targetQuat.setFromRotationMatrix(_lookAtMatrix); // Use reusable quaternion

                    // Use slerp for smooth rotation
                    this.mesh.quaternion.slerp(_targetQuat, ENEMY_ROTATION_SLERP); // Use constant
                }
            } else {
                // Already at target
                if (this.state === ENEMY_STATE.ROAMING) {
                    this.roamingTarget = null;
                    this.setRoamingWaitTimer();
                    isMoving = false;
                } else if (this.state === ENEMY_STATE.RETURNING) {
                     this.state = ENEMY_STATE.ROAMING;
                     this.roamingTarget = null;
                     this.setRoamingWaitTimer();
                     isMoving = false;
                }
            }
        } else {
            isMoving = false;
        }

        return { isMoving, currentSpeed };
    }


    _updateAnimation(elapsedTime, isMoving, currentSpeed) {
        if (this.mesh?.userData?.legs) { // Check if mesh and legs exist
            const legs = this.mesh.userData.legs;
            const animationSpeed = currentSpeed * ENEMY_ANIMATION_SPEED_FACTOR * (isMoving ? 1 : 0); // Use constant
            const legSwingAmplitude = ENEMY_LEG_SWING_AMPLITUDE; // Use constant

            if (isMoving && animationSpeed > 0) {
                const phase = elapsedTime * animationSpeed;
                legs.frontLeftLeg.rotation.x = Math.sin(phase) * legSwingAmplitude;
                legs.backRightLeg.rotation.x = Math.sin(phase) * legSwingAmplitude;
                legs.frontRightLeg.rotation.x = Math.sin(phase + Math.PI) * legSwingAmplitude;
                legs.backLeftLeg.rotation.x = Math.sin(phase + Math.PI) * legSwingAmplitude;
            } else {
                // Smoothly return legs to 0 rotation when stopping using constant
                const smoothTime = ENEMY_STOPPED_ANIM_SMOOTHING;
                legs.frontLeftLeg.rotation.x = smoothDamp(legs.frontLeftLeg.rotation.x, 0, smoothTime, smoothTime);
                legs.backRightLeg.rotation.x = smoothDamp(legs.backRightLeg.rotation.x, 0, smoothTime, smoothTime);
                legs.frontRightLeg.rotation.x = smoothDamp(legs.frontRightLeg.rotation.x, 0, smoothTime, smoothTime);
                legs.backLeftLeg.rotation.x = smoothDamp(legs.backLeftLeg.rotation.x, 0, smoothTime, smoothTime);
            }
        }
    }

    getMesh() {
        return this.mesh;
    }

    // Called when the enemy's chunk is unloaded
    removeFromScene() {
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
            // Resource disposal (geometry, material) should be handled carefully.
            // If models use shared assets from AssetManager, don't dispose here.
            // If models are unique instances, dispose geometry/material here.
            // Assuming models might use shared assets for now.
            // Don't nullify mesh here if pooling, just hide/remove from scene
            // this.mesh = null; // Clear reference
        }
    }

    // --- Roaming Helpers ---
    pickNewRoamingTarget() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.roamingRadius;
        const targetX = this.originalPosition.x + Math.cos(angle) * radius;
        const targetZ = this.originalPosition.z + Math.sin(angle) * radius;
        // Use reusable vector for the target position
        this.roamingTarget = _roamingTargetVec.set(targetX, this.originalPosition.y, targetZ);
    }

    setRoamingWaitTimer() {
        this.roamingWaitTimer = this.roamingMinWaitTime + Math.random() * (this.roamingMaxWaitTime - this.roamingMinWaitTime);
    }

    /**
     * Resets the enemy's state for reuse from an object pool.
     * @param {object} initialData - Data containing position, rotation, etc.
     * @param {object} properties - Enemy-specific properties from level config.
     */
    reset(initialData, properties) {
        // Reset state
        this.state = ENEMY_STATE.IDLE;
        this.originalPosition.copy(initialData.position);
        this.lastPosition.copy(initialData.position);
        this.currentGroundY = initialData.position.y;
        this.lastGroundY = initialData.position.y;
        this.roamingTarget = null;
        this.roamingWaitTimer = 0;
        this.groundCheckCounter = Math.floor(Math.random() * 5);

        // Reset properties from config/defaults
        this.speed = properties.speed ?? ENEMY_DEFAULT_SPEED;
        this.aggroRadius = properties.aggroRadius ?? ENEMY_DEFAULT_AGGRO_RADIUS;
        this.deaggroRadius = properties.deaggroRadius ?? ENEMY_DEFAULT_DEAGGRO_RADIUS;
        this.roamingRadius = properties.roamingRadius ?? ENEMY_DEFAULT_ROAMING_RADIUS;
        this.roamingSpeedFactor = properties.roamingSpeedFactor ?? ENEMY_DEFAULT_ROAMING_SPEED_FACTOR;
        this.roamingMinWaitTime = properties.roamingMinWaitTime ?? ENEMY_DEFAULT_ROAMING_MIN_WAIT;
        this.roamingMaxWaitTime = properties.roamingMaxWaitTime ?? ENEMY_DEFAULT_ROAMING_MAX_WAIT;

        // Reset mesh properties
        if (this.mesh) {
            this.mesh.position.copy(initialData.position);
            this.mesh.rotation.set(0, initialData.rotationY || 0, 0);
            this.mesh.visible = true;
            // Reset leg rotations if applicable
            if (this.mesh.userData?.legs) {
                Object.values(this.mesh.userData.legs).forEach(leg => leg.rotation.set(0, 0, 0));
            }
        } else {
            logger.error(`[Enemy ${this.type}] Cannot reset mesh properties, mesh is null!`);
        }
    }
}

// --- Specific Enemy Subclasses ---

export class Bear extends Enemy {
    constructor(initialData, properties, scene, chunkManager) {
        super(initialData, properties, scene, chunkManager);
    }

    createMesh() {
        // Call ModelFactory instead of AssetManager
        return ModelFactory.createBearModel(this); // Pass 'this' or specific properties if needed
    }
}

export class Squirrel extends Enemy {
    constructor(initialData, properties, scene, chunkManager) {
        super(initialData, properties, scene, chunkManager);
    }

    createMesh() {
        // Call ModelFactory instead of AssetManager
        return ModelFactory.createSquirrelModel(this);
    }
}

export class Deer extends Enemy {
    constructor(initialData, properties, scene, chunkManager) {
        super(initialData, properties, scene, chunkManager);
    }

    createMesh() {
        // Call ModelFactory instead of AssetManager
        return ModelFactory.createDeerModel(this);
    }
}


// --- Desert Enemy Subclasses ---

export class Coyote extends Enemy {
    constructor(initialData, properties, scene, chunkManager) {
        super(initialData, properties, scene, chunkManager);
    }

    createMesh() {
        // Call ModelFactory instead of AssetManager
        return ModelFactory.createCoyoteModel(this);
    }
}

export class Rattlesnake extends Enemy {
    constructor(initialData, properties, scene, chunkManager) {
        super(initialData, properties, scene, chunkManager);
    }

    createMesh() {
        // Call ModelFactory instead of AssetManager
        return ModelFactory.createRattlesnakeModel(this);
    }

    _updateAnimation(elapsedTime, isMoving, currentSpeed) {
        // No leg animation
    }
     // Override grounding to be closer to the ground
     _updateGrounding() {
        if (!this.mesh || !this.chunkManager) return; // Add safety check
        const currentPosition = this.mesh.position;
        _rayOrigin.set(currentPosition.x, currentPosition.y + ENEMY_GROUND_OFFSET_SNAKE, currentPosition.z); // Use constant & reusable vector
        groundRaycaster.set(_rayOrigin, downVector);
        const nearbyTerrain = this.chunkManager.getTerrainMeshesNear(currentPosition);
        const intersects = groundRaycaster.intersectObjects(nearbyTerrain);

        if (intersects.length > 0) {
            this.lastGroundY = intersects[0].point.y;
            const smoothFactor = ENEMY_GROUND_SMOOTHING;
            this.currentGroundY = this.currentGroundY * (1.0 - smoothFactor) + this.lastGroundY * smoothFactor; // Use constant
            const modelHeight = ENEMY_GROUND_HEIGHT_SNAKE; // Use constant
            this.mesh.position.y = this.currentGroundY + modelHeight / 2;
        } else {
             // Maintain last known good height if no ground found
             const modelHeight = ENEMY_GROUND_HEIGHT_SNAKE; // Use constant
             this.mesh.position.y = this.currentGroundY + modelHeight / 2;
        }
    }
}

export class Scorpion extends Enemy {
    constructor(initialData, properties, scene, chunkManager) {
        super(initialData, properties, scene, chunkManager);
    }

    createMesh() {
        // Call ModelFactory instead of AssetManager
        return ModelFactory.createScorpionModel(this);
    }

    _updateAnimation(elapsedTime, isMoving, currentSpeed) {
        // No leg animation
    }

     // Override grounding to be closer to the ground
     _updateGrounding() {
        if (!this.mesh || !this.chunkManager) return; // Add safety check
        const currentPosition = this.mesh.position;
        _rayOrigin.set(currentPosition.x, currentPosition.y + ENEMY_GROUND_OFFSET_SCORPION, currentPosition.z); // Use constant & reusable vector
        groundRaycaster.set(_rayOrigin, downVector);
        const nearbyTerrain = this.chunkManager.getTerrainMeshesNear(currentPosition);
        const intersects = groundRaycaster.intersectObjects(nearbyTerrain);

        if (intersects.length > 0) {
            this.lastGroundY = intersects[0].point.y;
            const smoothFactor = ENEMY_GROUND_SMOOTHING;
            this.currentGroundY = this.currentGroundY * (1.0 - smoothFactor) + this.lastGroundY * smoothFactor; // Use constant
            const modelHeight = ENEMY_GROUND_HEIGHT_SCORPION; // Use constant
            this.mesh.position.y = this.currentGroundY + modelHeight / 2;
        } else {
             // Maintain last known good height if no ground found
             const modelHeight = ENEMY_GROUND_HEIGHT_SCORPION; // Use constant
             this.mesh.position.y = this.currentGroundY + modelHeight / 2;
        }
    }
}