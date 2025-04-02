import * as THREE from 'three';
// import * as Config from './config.js'; // No longer needed for enemy properties
import * as GlobalConfig from './config.js'; // Keep for global settings if any are used later
import * as AssetManager from './assetManager.js'; // Import AssetManager
import * as UIManager from './uiManager.js'; // Import UI Manager for error display

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
        this.roamingTarget = null; // Target position for roaming
        this.roamingWaitTimer = 0; // Timer for pausing during roaming

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

        if (this.groundCheckCounter % 5 === 0) {
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
        this.mesh.position.y = this.lastGroundY + legHeight / 2;
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

            if (distanceToTarget > 0.01) { // Avoid normalizing zero vector
                 moveDirection.normalize();
                 const moveDistance = currentSpeed * deltaTime;

                 if (moveDistance >= distanceToTarget) {
                     this.mesh.position.copy(targetPosition); // Snap to target
                     if (this.state === ENEMY_STATE.ROAMING) {
                         this.roamingTarget = null;
                         this.setRoamingWaitTimer();
                         isMoving = false; // Stop moving this frame
                     }
                 } else {
                     this.mesh.position.addScaledVector(moveDirection, moveDistance);
                     // Orientation
                     const lookAwayPos = this.mesh.position.clone().sub(moveDirection);
                     this.mesh.lookAt(lookAwayPos);
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
            // Dispose unique geometry and material for each part
            this.mesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        // Check if material is an array (though unlikely for these simple parts)
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            // console.log(`[Enemy] Removed ${this.type} mesh from scene and disposed resources.`);
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

        if (this.groundCheckCounter % 5 === 0) {
            const rayOrigin = new THREE.Vector3(currentPosition.x, currentPosition.y + 0.5, currentPosition.z); // Lower origin
            groundRaycaster.set(rayOrigin, downVector);
            const nearbyTerrain = this.chunkManager.getTerrainMeshesNear(currentPosition);
            const intersects = groundRaycaster.intersectObjects(nearbyTerrain);

            if (intersects.length > 0) {
                this.lastGroundY = intersects[0].point.y;
            }
        }
        // Offset based on model height (very small for snake)
        const modelHeight = 0.3; // Approximate height of the snake model
        this.mesh.position.y = this.lastGroundY + modelHeight / 2;
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

        if (this.groundCheckCounter % 5 === 0) {
            const rayOrigin = new THREE.Vector3(currentPosition.x, currentPosition.y + 0.5, currentPosition.z); // Lower origin
            groundRaycaster.set(rayOrigin, downVector);
            const nearbyTerrain = this.chunkManager.getTerrainMeshesNear(currentPosition);
            const intersects = groundRaycaster.intersectObjects(nearbyTerrain);

            if (intersects.length > 0) {
                this.lastGroundY = intersects[0].point.y;
            }
        }
         // Offset based on model height (very small for scorpion)
        const modelHeight = 0.3; // Approximate height of the scorpion model
        this.mesh.position.y = this.lastGroundY + modelHeight / 2;
    }
}

