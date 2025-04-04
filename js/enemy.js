import * as THREE from 'three';
// import * as Config from './config.js'; // No longer needed for enemy properties
import * as GlobalConfig from './config.js'; // Keep for global settings if any are used later
import * as AssetManager from './assetManager.js'; // Import AssetManager
import * as UIManager from './uiManager.js'; // Import UI Manager for error display
import { smoothDamp } from './utils/mathUtils.js'; // Import smoothing function

// Model Creation Functions moved to assetManager.js

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

// --- Base Enemy Class ---
class Enemy {
    constructor(initialData, properties, scene, chunkManager) { // Added properties parameter
        if (!chunkManager) {
            // Display error if ChunkManager is missing, as it's critical
            UIManager.displayError(new Error(`[Enemy ${initialData.type}] Constructor missing ChunkManager! Grounding will fail.`));
        }
        this.scene = scene;
        this.chunkManager = chunkManager; // Store chunkManager
        this.type = initialData.type || 'unknown';
        this.originalPosition = initialData.position.clone(); // Keep original spawn height
        // Set properties from the passed object (originating from levelConfig)
        this.speed = properties.speed || 5.0; // Default fallback speed
        this.aggroRadius = properties.aggroRadius || 30.0;
        this.deaggroRadius = properties.deaggroRadius || 30.0;
        // Store roaming properties
        this.roamingRadius = properties.roamingRadius || 15.0;
        this.roamingSpeedFactor = properties.roamingSpeedFactor || 0.5;
        this.roamingMinWaitTime = properties.roamingMinWaitTime || 2.0;
        this.roamingMaxWaitTime = properties.roamingMaxWaitTime || 5.0;
        this.state = ENEMY_STATE.IDLE;
        this.mesh = null; // Initialize mesh as null
        this.groundCheckCounter = Math.floor(Math.random() * 5); // Stagger initial checks
        this.lastGroundY = initialData.position.y; // Initialize with spawn height
        this.currentGroundY = initialData.position.y; // Current smoothed ground Y position
        this.roamingTarget = null; // Target position for roaming
        this.roamingWaitTimer = 0; // Timer for pausing during roaming
        this.positionSmoothingFactor = 0.3; // Default position smoothing factor (0-1, lower = smoother)
        this.lastPosition = initialData.position.clone(); // Store last position for smoothing

        // Create and position the mesh AFTER super() call allows access to subclass methods
        this.mesh = this.createMesh(); // Calls subclass specific createMesh
        if (this.mesh) {
            // Initial position might be slightly off due to generator offset,
            // Grounding logic in first update will correct it.
            this.mesh.position.copy(initialData.position);
            this.mesh.rotation.y = initialData.rotationY || 0;
            // Ensure userData exists before adding properties
            if (!this.mesh.userData) this.mesh.userData = {};
            this.mesh.userData.enemyInstance = this; // Link mesh back to instance

            // Add mesh to the scene immediately upon creation
            if (this.scene) {
                this.scene.add(this.mesh);
                // console.log(`[Enemy] Added ${this.type} mesh to scene at`, this.mesh.position);
            } else {
                // Display error if scene is missing
                UIManager.displayError(new Error(`[Enemy ${this.type}] Scene not available for adding mesh!`));
            }
        } else {
            // Display error if mesh creation fails
            UIManager.displayError(new Error(`[Enemy] Failed to create mesh for type ${this.type}`));
        }
    }

    // Placeholder - subclasses MUST override this
    createMesh() {
        // Display error if subclass doesn't implement createMesh
        UIManager.displayError(new Error(`[Enemy] createMesh() not implemented for subclass type ${this.type}!`));
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
        // console.log(`[Enemy ${this.type}] Pos: ${this.mesh.position.x.toFixed(1)},${this.mesh.position.y.toFixed(1)},${this.mesh.position.z.toFixed(1)} State: ${this.state} DistP: ${distanceToPlayer.toFixed(1)}`);
    }

    // --- Private Helper Methods for Update Logic ---

    _updateGrounding() {
        this.groundCheckCounter++;
        const currentPosition = this.mesh.position;

        // Perform ground check more frequently (every 2 frames instead of 5)
        if (this.groundCheckCounter % 2 === 0) {
            const rayOrigin = new THREE.Vector3(currentPosition.x, currentPosition.y + 2, currentPosition.z);
            groundRaycaster.set(rayOrigin, downVector);
            const nearbyTerrain = this.chunkManager.getTerrainMeshesNear(currentPosition);
            const intersects = groundRaycaster.intersectObjects(nearbyTerrain);

            if (intersects.length > 0) {
                this.lastGroundY = intersects[0].point.y;
            }
            // else: Keep last known ground Y
        }

        const legHeight = this.mesh.userData.legHeight || 0.5;

        // Smooth the ground height transition using smoothDamp
        // Use a fixed deltaTime and a smaller smoothing factor for ground height
        const groundSmoothingFactor = 0.2; // Lower value = smoother but faster transitions
        this.currentGroundY = smoothDamp(
            this.currentGroundY,
            this.lastGroundY,
            0.016, // Use a fixed deltaTime for consistent smoothing
            groundSmoothingFactor
        );

        // Apply the smoothed ground height
        this.mesh.position.y = this.currentGroundY + legHeight / 2;
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
                if (distanceToOrigin < 1.0) {
                    this.state = ENEMY_STATE.ROAMING;
                    this.mesh.position.copy(this.originalPosition);
                    this.roamingTarget = null;
                    this.setRoamingWaitTimer();
                } else if (distanceToPlayer < this.aggroRadius) {
                    this.state = ENEMY_STATE.CHASING;
                    this.roamingTarget = null;
                    this.roamingWaitTimer = 0;
                }
                break;
        }
    }

    _updateMovement(playerPos, deltaTime) {
        const moveDirection = new THREE.Vector3();
        let targetPosition = null;
        let isMoving = false;
        let currentSpeed = this.speed;

        // Store the previous position for smoothing
        this.lastPosition.copy(this.mesh.position);

        // Determine target based on state
        if (this.state === ENEMY_STATE.CHASING) {
            targetPosition = playerPos;
        } else if (this.state === ENEMY_STATE.RETURNING) {
            targetPosition = this.originalPosition;
        } else if (this.state === ENEMY_STATE.ROAMING && this.roamingTarget && this.roamingWaitTimer <= 0) {
            targetPosition = this.roamingTarget;
            currentSpeed = this.speed * this.roamingSpeedFactor; // Use instance property
        }

        isMoving = !!targetPosition && this.roamingWaitTimer <= 0;

        if (isMoving && targetPosition) {
            moveDirection.subVectors(targetPosition, this.mesh.position);
            moveDirection.y = 0;
            const distanceToTarget = moveDirection.length();

            // Add a small deadzone to prevent tiny jittery movements
            if (distanceToTarget > 0.05) { // Increased from 0.01 to 0.05 to reduce jitter
                 moveDirection.normalize();
                 const moveDistance = currentSpeed * deltaTime;

                 if (moveDistance >= distanceToTarget) {
                     // Don't snap to target immediately, smooth the final approach
                     const newPosition = new THREE.Vector3();
                     newPosition.lerpVectors(this.mesh.position, targetPosition, 0.5);
                     this.mesh.position.copy(newPosition);

                     if (this.state === ENEMY_STATE.ROAMING && distanceToTarget < 0.5) {
                         this.roamingTarget = null;
                         this.setRoamingWaitTimer();
                         isMoving = false; // Stop moving this frame
                     }
                 } else {
                     // Calculate the new position with movement
                     const newPosition = new THREE.Vector3();
                     newPosition.copy(this.mesh.position).addScaledVector(moveDirection, moveDistance);

                     // Apply limited smoothing to the horizontal movement (x and z)
                     // Use a much smaller smoothing factor to ensure movement happens
                     const smoothedPosition = new THREE.Vector3();
                     // Move at least 70% of the way to the target position each frame
                     const moveFactor = Math.min(0.7, 1.0 - Math.pow(this.positionSmoothingFactor, deltaTime));
                     smoothedPosition.x = this.mesh.position.x + (newPosition.x - this.mesh.position.x) * moveFactor;
                     smoothedPosition.z = this.mesh.position.z + (newPosition.z - this.mesh.position.z) * moveFactor;
                     smoothedPosition.y = this.mesh.position.y; // Keep current Y (handled by grounding)

                     // Apply the smoothed position
                     this.mesh.position.copy(smoothedPosition);

                     // Orientation - smooth the rotation as well
                     const lookAwayPos = this.mesh.position.clone().sub(moveDirection);
                     // Create a temporary object to calculate the target rotation
                     const tempObj = new THREE.Object3D();
                     tempObj.position.copy(this.mesh.position);
                     tempObj.lookAt(lookAwayPos);

                     // Smoothly interpolate the rotation
                     this.mesh.quaternion.slerp(tempObj.quaternion, 0.1);
                 }
            } else {
                 // Already at target (or very close)
                 if (this.state === ENEMY_STATE.ROAMING) {
                     this.roamingTarget = null;
                     this.setRoamingWaitTimer();
                     isMoving = false;
                 }
            }

        } else {
             isMoving = false;
        }
        return { isMoving, currentSpeed }; // Return movement status for animation
    }

    _updateAnimation(elapsedTime, isMoving, currentSpeed) {
        if (this.mesh.userData.legs) {
            const legs = this.mesh.userData.legs;
            const animationSpeed = currentSpeed * 0.8 * (isMoving ? 1 : 0);
            const legSwingAmplitude = Math.PI / 6;

            if (isMoving && animationSpeed > 0) { // Check animationSpeed > 0
                const phase = elapsedTime * animationSpeed;
                legs.frontLeftLeg.rotation.x = Math.sin(phase) * legSwingAmplitude;
                legs.backRightLeg.rotation.x = Math.sin(phase) * legSwingAmplitude;
                legs.frontRightLeg.rotation.x = Math.sin(phase + Math.PI) * legSwingAmplitude;
                legs.backLeftLeg.rotation.x = Math.sin(phase + Math.PI) * legSwingAmplitude;
            } else {
                legs.frontLeftLeg.rotation.x = 0;
                legs.backRightLeg.rotation.x = 0;
                legs.frontRightLeg.rotation.x = 0;
                legs.backLeftLeg.rotation.x = 0;
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
            // Resource disposal (geometry, material) is handled by AssetManager
            // as enemy models are created via AssetManager and likely use shared assets.
            // console.log(`[Enemy] Removed ${this.type} mesh from scene.`);
            this.mesh = null; // Clear reference
        }
    }

    // --- Roaming Helpers ---
    pickNewRoamingTarget() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.roamingRadius; // Use instance property
        const targetX = this.originalPosition.x + Math.cos(angle) * radius;
        const targetZ = this.originalPosition.z + Math.sin(angle) * radius;

        // Keep the Y the same as the original position for simplicity,
        // grounding logic will adjust it anyway.
        this.roamingTarget = new THREE.Vector3(targetX, this.originalPosition.y, targetZ);
        // console.log(`[Enemy ${this.type}] New roam target:`, this.roamingTarget);
    }

    setRoamingWaitTimer() {
        this.roamingWaitTimer = this.roamingMinWaitTime + Math.random() * (this.roamingMaxWaitTime - this.roamingMinWaitTime); // Use instance properties
        // console.log(`[Enemy ${this.type}] Waiting for ${this.roamingWaitTimer.toFixed(1)}s`);
    }
}

// --- Specific Enemy Subclasses ---

export class Bear extends Enemy {
    constructor(initialData, properties, scene, chunkManager) { // Add properties
        super(initialData, properties, scene, chunkManager); // Pass properties up
        // Properties like speed, aggroRadius are now set in the base class constructor
    }

    createMesh() {
        return AssetManager.createBearModel();
    }
}

export class Squirrel extends Enemy {
    constructor(initialData, properties, scene, chunkManager) { // Add properties
        super(initialData, properties, scene, chunkManager); // Pass properties up
        // Properties like speed, aggroRadius are now set in the base class constructor
    }

    createMesh() {
        return AssetManager.createSquirrelModel();
    }
}

export class Deer extends Enemy {
    constructor(initialData, properties, scene, chunkManager) { // Add properties
        super(initialData, properties, scene, chunkManager); // Pass properties up
        // Properties like speed, aggroRadius are now set in the base class constructor
    }

    createMesh() {
        return AssetManager.createDeerModel();
    }
}


// --- Desert Enemy Subclasses ---

export class Coyote extends Enemy {
    constructor(initialData, properties, scene, chunkManager) {
        super(initialData, properties, scene, chunkManager);
        // Specific Coyote behavior could be added here later
    }

    createMesh() {
        // Pass properties (like color) to the model factory
        return AssetManager.createCoyoteModel(this);
    }
}

export class Rattlesnake extends Enemy {
    constructor(initialData, properties, scene, chunkManager) {
        super(initialData, properties, scene, chunkManager);
        // Specific Rattlesnake behavior (e.g., less roaming, coiling/striking state)
        // could be added by overriding update methods or adding new state logic.
    }

    createMesh() {
        return AssetManager.createRattlesnakeModel(this);
    }

    // Example override for different animation (if needed)
    _updateAnimation(elapsedTime, isMoving, currentSpeed) {
        // Snakes don't have legs, maybe add a slithering animation later
        // For now, do nothing or add a subtle body wave
    }
     // Override grounding to be closer to the ground
     _updateGrounding() {
        this.groundCheckCounter++;
        const currentPosition = this.mesh.position;

        if (this.groundCheckCounter % 2 === 0) { // More frequent checks (every 2 frames)
            const rayOrigin = new THREE.Vector3(currentPosition.x, currentPosition.y + 0.5, currentPosition.z); // Lower origin
            groundRaycaster.set(rayOrigin, downVector);
            const nearbyTerrain = this.chunkManager.getTerrainMeshesNear(currentPosition);
            const intersects = groundRaycaster.intersectObjects(nearbyTerrain);

            if (intersects.length > 0) {
                this.lastGroundY = intersects[0].point.y;
            }
        }

        // Smooth the ground height transition
        // Use a fixed deltaTime and a smaller smoothing factor for ground height
        const groundSmoothingFactor = 0.2; // Lower value = smoother but faster transitions
        this.currentGroundY = smoothDamp(
            this.currentGroundY,
            this.lastGroundY,
            0.016, // Use a fixed deltaTime for consistent smoothing
            groundSmoothingFactor
        );

        // Offset based on model height (very small for snake)
        const modelHeight = 0.3; // Approximate height of the snake model
        this.mesh.position.y = this.currentGroundY + modelHeight / 2;
    }
}

export class Scorpion extends Enemy {
    constructor(initialData, properties, scene, chunkManager) {
        super(initialData, properties, scene, chunkManager);
        // Specific Scorpion behavior
    }

    createMesh() {
        return AssetManager.createScorpionModel(this);
    }

    // Example override for different animation (if needed)
    _updateAnimation(elapsedTime, isMoving, currentSpeed) {
        // Scorpions don't have legs in the same way, maybe animate claws/tail later
    }

     // Override grounding to be closer to the ground
     _updateGrounding() {
        this.groundCheckCounter++;
        const currentPosition = this.mesh.position;

        if (this.groundCheckCounter % 2 === 0) { // More frequent checks (every 2 frames)
            const rayOrigin = new THREE.Vector3(currentPosition.x, currentPosition.y + 0.5, currentPosition.z); // Lower origin
            groundRaycaster.set(rayOrigin, downVector);
            const nearbyTerrain = this.chunkManager.getTerrainMeshesNear(currentPosition);
            const intersects = groundRaycaster.intersectObjects(nearbyTerrain);

            if (intersects.length > 0) {
                this.lastGroundY = intersects[0].point.y;
            }
        }

        // Smooth the ground height transition
        // Use a fixed deltaTime and a smaller smoothing factor for ground height
        const groundSmoothingFactor = 0.2; // Lower value = smoother but faster transitions
        this.currentGroundY = smoothDamp(
            this.currentGroundY,
            this.lastGroundY,
            0.016, // Use a fixed deltaTime for consistent smoothing
            groundSmoothingFactor
        );

        // Offset based on model height (very small for scorpion)
        const modelHeight = 0.3; // Approximate height of the scorpion model
        this.mesh.position.y = this.currentGroundY + modelHeight / 2;
    }
}

