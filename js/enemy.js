import * as THREE from 'three';
import * as Config from './config.js';

console.log('enemy.js loading');

// --- Helper Function for Creating Body Parts ---
function createBoxPart(width, height, depth, color) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ color: color });
    const part = new THREE.Mesh(geometry, material);
    part.castShadow = true;
    // part.receiveShadow = true; // Optional, might impact performance
    return part;
}

// --- Model Creation Functions ---

function createBearModel() {
    const group = new THREE.Group();
    const color = Config.ENEMY_BEAR_COLOR;

    // --- Grizzly Bear Dimensions ---
    const torsoWidth = 3.5;
    const torsoHeight = 2.5;
    const torsoDepth = 5.0;
    const headWidth = 1.8;
    const headHeight = 1.5;
    const headDepth = 1.5;
    const legWidth = 0.8;
    const legHeight = 2.0; // Increased height
    const legDepth = 0.8;

    // Torso
    const torso = createBoxPart(torsoWidth, torsoHeight, torsoDepth, color);
    // Position torso center based on new leg height
    const torsoY = legHeight / 2 + torsoHeight / 2 - 0.2; // Adjust slightly down
    torso.position.y = torsoY;
    group.add(torso);

    // Head
    const head = createBoxPart(headWidth, headHeight, headDepth, color);
    // Position head relative to the front-top of the torso
    head.position.set(0, torsoY + torsoHeight * 0.4, -torsoDepth / 2 - headDepth * 0.3);
    group.add(head);

    // Legs (simple boxes for now)
    const legY = legHeight / 2; // Center leg geometry at half its height, base will be at 0

    // Calculate leg positions based on torso dimensions
    const legXOffset = torsoWidth / 2 - legWidth * 0.4; // Place legs slightly inwards
    const frontLegZ = -torsoDepth / 2 + legDepth * 0.6; // Place front legs forward
    const backLegZ = torsoDepth / 2 - legDepth * 0.6; // Place back legs backward

    const frontLeftLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    frontLeftLeg.position.set(-legXOffset, legY, frontLegZ);
    group.add(frontLeftLeg);

    const frontRightLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    frontRightLeg.position.set(legXOffset, legY, frontLegZ);
    group.add(frontRightLeg);

    const backLeftLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    backLeftLeg.position.set(-legXOffset, legY, backLegZ);
    group.add(backLeftLeg);

    const backRightLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    backRightLeg.position.set(legXOffset, legY, backLegZ);
    group.add(backRightLeg);

    // Store leg references for animation
    group.userData.legs = { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg };
    group.userData.legHeight = legHeight; // Store height for grounding offset

    // Set group origin roughly at the base between the legs
    // group.position.y = legHeight / 2; // We'll handle offset in Enemy class now

    return group;
}

function createSquirrelModel() {
    const group = new THREE.Group();
    const color = Config.ENEMY_SQUIRREL_COLOR;

    // Torso (Dog-sized - larger than before)
    const torsoWidth = 0.8;
    const torsoHeight = 0.7;
    const torsoDepth = 1.5;
    const torso = createBoxPart(torsoWidth, torsoHeight, torsoDepth, color);
    torso.position.y = 0.5; // Center torso above origin
    group.add(torso);

    // Head
    const head = createBoxPart(0.6, 0.5, 0.5, color);
    head.position.set(0, torso.position.y + 0.2, -0.8); // Front of torso
    group.add(head);

    // Legs (shorter)
    const legWidth = 0.25;
    const legHeight = 0.6;
    const legDepth = 0.25;
    const legY = 0;

    const frontLeftLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    frontLeftLeg.position.set(-torsoWidth / 2 + 0.1, legY, -torsoDepth / 2 + 0.2);
    group.add(frontLeftLeg);

    const frontRightLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    frontRightLeg.position.set(torsoWidth / 2 - 0.1, legY, -torsoDepth / 2 + 0.2);
    group.add(frontRightLeg);

    const backLeftLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    backLeftLeg.position.set(-torsoWidth / 2 + 0.1, legY, torsoDepth / 2 - 0.2);
    group.add(backLeftLeg);

    const backRightLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    backRightLeg.position.set(torsoWidth / 2 - 0.1, legY, torsoDepth / 2 - 0.2);
    group.add(backRightLeg);

    // Tail (Bushy - represented by a larger box)
    const tail = createBoxPart(0.4, 1.2, 0.4, color);
    tail.position.set(0, torso.position.y + 0.3, torsoDepth / 2 + 0.2);
    tail.rotation.x = -Math.PI / 6; // Angle tail up slightly
    group.add(tail);

    // Store leg references for animation
    group.userData.legs = { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg };
    group.userData.legHeight = legHeight; // Store height for grounding offset

    // Set group origin roughly at the base between the legs
    // group.position.y = legHeight / 2; // We'll handle offset in Enemy class now

    return group;
}


function createDeerModel() {
    const group = new THREE.Group();
    const color = Config.ENEMY_DEER_COLOR;

    // Torso (Longer and thinner than bear)
    const torso = createBoxPart(1.2, 1.3, 2.8, color);
    torso.position.y = 1.0; // Higher off ground
    group.add(torso);

    // Head (Smaller)
    const head = createBoxPart(0.8, 0.8, 0.9, color);
    head.position.set(0, torso.position.y + 0.5, -1.6); // Front of torso
    group.add(head);

    // Neck (Simple box connecting head and torso)
    const neck = createBoxPart(0.5, 0.5, 0.8, color);
    neck.position.set(0, torso.position.y + 0.3, -1.1);
    neck.rotation.x = Math.PI / 6; // Angle neck slightly
    group.add(neck);

    // Legs (Longer and thinner)
    const legWidth = 0.3;
    const legHeight = 1.5;
    const legDepth = 0.3;
    const legY = 0;

    const frontLeftLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    frontLeftLeg.position.set(-0.4, legY, -1.0);
    group.add(frontLeftLeg);

    const frontRightLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    frontRightLeg.position.set(0.4, legY, -1.0);
    group.add(frontRightLeg);

    const backLeftLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    backLeftLeg.position.set(-0.4, legY, 1.0);
    group.add(backLeftLeg);

    const backRightLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    backRightLeg.position.set(0.4, legY, 1.0);
    group.add(backRightLeg);

    // Antlers (Optional simple representation)
    const antlerColor = 0x654321; // Darker brown
    const antlerBranch = createBoxPart(0.1, 0.6, 0.1, antlerColor);
    antlerBranch.position.set(0.3, head.position.y + 0.4, head.position.z);
    antlerBranch.rotation.z = -Math.PI / 6;
    group.add(antlerBranch); // Add the first antler

    // Create, position, rotate, and add the second antler separately
    const mirroredAntler = antlerBranch.clone();
    mirroredAntler.position.set(-0.3, head.position.y + 0.4, head.position.z);
    mirroredAntler.rotation.z = Math.PI / 3; // Apply rotation after setting position
    group.add(mirroredAntler);


    // Store leg references for animation
    group.userData.legs = { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg };
    group.userData.legHeight = legHeight; // Store height for grounding offset

    // Set group origin roughly at the base between the legs
    // group.position.y = legHeight / 2; // We'll handle offset in Enemy class now

    return group;
}

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
    constructor(initialData, scene, chunkManager) { // Accept chunkManager
        if (!chunkManager) {
            console.error(`[Enemy ${initialData.type}] Constructor missing ChunkManager! Grounding will fail.`);
        }
        this.scene = scene;
        this.chunkManager = chunkManager; // Store chunkManager
        this.type = initialData.type || 'unknown';
        this.originalPosition = initialData.position.clone(); // Keep original spawn height
        this.speed = Config.ENEMY_DEFAULT_SPEED; // Placeholder - will be overridden
        this.aggroRadius = Config.ENEMY_DEFAULT_AGGRO_RADIUS; // Placeholder
        this.deaggroRadius = Config.ENEMY_DEFAULT_DEAGGRO_RADIUS; // Placeholder
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
                console.log(`[Enemy] Added ${this.type} mesh to scene at`, this.mesh.position);
            } else {
                console.error("[Enemy] Scene not available for adding mesh!");
            }
        } else {
            console.error(`[Enemy] Failed to create mesh for type ${this.type}`);
        }
    }

    // Placeholder - subclasses MUST override this
    createMesh() {
        console.error(`[Enemy] createMesh() not implemented for subclass type ${this.type}!`);
        return null; // Return null if not implemented
    }

    update(playerPos, deltaTime, elapsedTime) { // Add elapsedTime for animation
        if (!this.mesh || !this.chunkManager) return; // Don't update if mesh or chunkManager missing

        // --- Grounding (Optimized Frequency) ---
        this.groundCheckCounter++;
        const currentPosition = this.mesh.position; // Get current position before potential adjustment

        // Only perform raycast check periodically (e.g., every 5 frames)
        if (this.groundCheckCounter % 5 === 0) {
            const rayOrigin = new THREE.Vector3(currentPosition.x, currentPosition.y + 2, currentPosition.z); // Start ray slightly above current pos
            groundRaycaster.set(rayOrigin, downVector);
            const nearbyTerrain = this.chunkManager.getTerrainMeshesNear(currentPosition);
            const intersects = groundRaycaster.intersectObjects(nearbyTerrain);

            if (intersects.length > 0) {
                this.lastGroundY = intersects[0].point.y; // Update last known ground Y
            } else {
                // If no ground found, gradually revert towards original spawn Y? Or keep last known?
                // Keeping last known seems safer for now to avoid sudden drops.
                // console.warn(`[Enemy ${this.type}] No ground found during check, using last known Y: ${this.lastGroundY.toFixed(2)}`);
            }
            // Optional: Reset counter to prevent potential overflow on very long runs
            // if (this.groundCheckCounter > 10000) this.groundCheckCounter = 0;
        }

        // Apply vertical position adjustment using the (potentially stale) lastGroundY
        const legHeight = this.mesh.userData.legHeight || 0.5; // Default offset if not found
        // Smoothly interpolate Y position towards the target ground height? Or snap? Snapping for now.
        this.mesh.position.y = this.lastGroundY + legHeight / 2; // Place origin (base of legs) on (last known) ground

        // --- AI Logic (State Transitions & Target Position) ---
        // Use the potentially updated mesh position for distance checks
        const distanceToPlayer = this.mesh.position.distanceTo(playerPos);
        const distanceToOrigin = this.mesh.position.distanceTo(this.originalPosition);

        // --- State Transitions ---
        switch (this.state) {
            case ENEMY_STATE.IDLE:
                // Immediately start roaming from idle
                console.log(`[Enemy ${this.type}] Idle, starting to roam. State: ROAMING`);
                this.state = ENEMY_STATE.ROAMING;
                this.pickNewRoamingTarget(); // Pick initial target
                // No break, fall through to ROAMING check immediately

            case ENEMY_STATE.ROAMING:
                 if (distanceToPlayer < this.aggroRadius) {
                    console.log(`[Enemy ${this.type}] Player entered aggro radius while roaming. State: CHASING`);
                    this.state = ENEMY_STATE.CHASING;
                    this.roamingTarget = null; // Clear roam target
                    this.roamingWaitTimer = 0; // Clear wait timer
                 } else if (this.roamingWaitTimer > 0) {
                    this.roamingWaitTimer -= deltaTime;
                    if (this.roamingWaitTimer <= 0) {
                        this.pickNewRoamingTarget(); // Time's up, pick new target
                    }
                 }
                 // Movement logic handles moving towards roam target if timer is not active
                break;

            case ENEMY_STATE.CHASING:
                if (distanceToPlayer > this.deaggroRadius) {
                    console.log(`[Enemy ${this.type}] Player left de-aggro radius. State: RETURNING`);
                    this.state = ENEMY_STATE.RETURNING;
                }
                break;

            case ENEMY_STATE.RETURNING:
                if (distanceToOrigin < 1.0) { // Close enough to origin
                    console.log(`[Enemy ${this.type}] Returned to origin. State: ROAMING`);
                    this.state = ENEMY_STATE.ROAMING;
                    this.mesh.position.copy(this.originalPosition); // Snap to origin
                    this.roamingTarget = null; // Clear target
                    this.setRoamingWaitTimer(); // Start waiting before picking new target
                } else if (distanceToPlayer < this.aggroRadius) {
                    // Player re-entered aggro radius while returning
                    console.log(`[Enemy ${this.type}] Player re-entered aggro radius while returning. State: CHASING`);
                    this.state = ENEMY_STATE.CHASING;
                    this.roamingTarget = null; // Clear roam target
                    this.roamingWaitTimer = 0; // Clear wait timer
                }
                break;
        }

        // --- Movement Logic ---
        const moveDirection = new THREE.Vector3();
        let targetPosition = null;
        let isMoving = false;
        let currentSpeed = this.speed; // Default speed

        // Determine target based on state
        if (this.state === ENEMY_STATE.CHASING) {
            targetPosition = playerPos;
        } else if (this.state === ENEMY_STATE.RETURNING) {
            targetPosition = this.originalPosition;
        } else if (this.state === ENEMY_STATE.ROAMING && this.roamingTarget && this.roamingWaitTimer <= 0) {
            targetPosition = this.roamingTarget;
            currentSpeed = this.speed * Config.ENEMY_ROAMING_SPEED_FACTOR; // Use slower roaming speed
        }

        // Determine if moving
        isMoving = !!targetPosition && this.roamingWaitTimer <= 0; // Only move if there's a target and not waiting

        if (isMoving && targetPosition) {
            moveDirection.subVectors(targetPosition, this.mesh.position);
            // Ignore Y component for horizontal movement direction
            moveDirection.y = 0;
            const distanceToTarget = moveDirection.length();
            moveDirection.normalize(); // Normalize after getting length

            const moveDistance = currentSpeed * deltaTime;

            // Check if reached target
            if (moveDistance >= distanceToTarget) {
                this.mesh.position.copy(targetPosition); // Snap to target
                if (this.state === ENEMY_STATE.ROAMING) {
                    this.roamingTarget = null; // Reached roam target
                    this.setRoamingWaitTimer(); // Start waiting
                    isMoving = false; // Stop moving for this frame
                    console.log(`[Enemy ${this.type}] Reached roam target, waiting.`);
                }
                // Note: RETURNING state handles reaching origin in the state transition logic
            } else {
                // Move towards target
                this.mesh.position.addScaledVector(moveDirection, moveDistance);

                // --- Orientation ---
                // Always face FORWARDS towards move direction
                // Positive Z (rear) should point away from target
                const lookAwayPos = this.mesh.position.clone().sub(moveDirection);
                this.mesh.lookAt(lookAwayPos);
            }
        } else {
             isMoving = false; // Ensure isMoving is false if not actively moving towards a target
        }


        // --- Animation ---
        if (this.mesh.userData.legs) {
            const legs = this.mesh.userData.legs;
            // Adjust animation speed based on current movement speed
            const animationSpeed = currentSpeed * 0.8 * (isMoving ? 1 : 0); // Slower/faster based on speed, 0 if not moving
            const legSwingAmplitude = Math.PI / 6; // Smaller swing than player

            if (isMoving) { // Only animate if actually moving
                const phase = elapsedTime * animationSpeed;
                // Simple alternating leg swing (rotation around X axis)
                legs.frontLeftLeg.rotation.x = Math.sin(phase) * legSwingAmplitude;
                legs.backRightLeg.rotation.x = Math.sin(phase) * legSwingAmplitude;
                legs.frontRightLeg.rotation.x = Math.sin(phase + Math.PI) * legSwingAmplitude;
                legs.backLeftLeg.rotation.x = Math.sin(phase + Math.PI) * legSwingAmplitude;
            } else {
                // Return legs to neutral position when idle
                legs.frontLeftLeg.rotation.x = 0;
                legs.backRightLeg.rotation.x = 0;
                legs.frontRightLeg.rotation.x = 0;
                legs.backLeftLeg.rotation.x = 0;
            }
        }

        // console.log(`[Enemy ${this.type}] Pos: ${this.mesh.position.x.toFixed(1)},${this.mesh.position.y.toFixed(1)},${this.mesh.position.z.toFixed(1)} State: ${this.state} DistP: ${distanceToPlayer.toFixed(1)}`);
    }

    getMesh() {
        return this.mesh;
    }

    // Called when the enemy's chunk is unloaded
    removeFromScene() {
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
            // Dispose geometry/material if they are unique to this instance
            // Assuming shared for now
            console.log(`[Enemy] Removed ${this.type} mesh from scene.`);
            this.mesh = null; // Clear reference
        }
    }

    // --- Roaming Helpers ---
    pickNewRoamingTarget() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * Config.ENEMY_ROAMING_RADIUS;
        const targetX = this.originalPosition.x + Math.cos(angle) * radius;
        const targetZ = this.originalPosition.z + Math.sin(angle) * radius;

        // Keep the Y the same as the original position for simplicity,
        // grounding logic will adjust it anyway.
        this.roamingTarget = new THREE.Vector3(targetX, this.originalPosition.y, targetZ);
        // console.log(`[Enemy ${this.type}] New roam target:`, this.roamingTarget);
    }

    setRoamingWaitTimer() {
        this.roamingWaitTimer = Config.ENEMY_ROAMING_MIN_WAIT_TIME + Math.random() * (Config.ENEMY_ROAMING_MAX_WAIT_TIME - Config.ENEMY_ROAMING_MIN_WAIT_TIME);
        // console.log(`[Enemy ${this.type}] Waiting for ${this.roamingWaitTimer.toFixed(1)}s`);
    }
}

// --- Specific Enemy Subclasses ---

export class Bear extends Enemy {
    constructor(initialData, scene, chunkManager) { // Add chunkManager
        super(initialData, scene, chunkManager); // Pass chunkManager
        this.speed = Config.ENEMY_BEAR_SPEED;
        this.aggroRadius = Config.ENEMY_BEAR_AGGRO_RADIUS;
        this.deaggroRadius = Config.ENEMY_BEAR_DEAGGRO_RADIUS;
    }

    createMesh() {
        return createBearModel();
    }
}

export class Squirrel extends Enemy {
    constructor(initialData, scene, chunkManager) { // Add chunkManager
        super(initialData, scene, chunkManager); // Pass chunkManager
        this.speed = Config.ENEMY_SQUIRREL_SPEED;
        this.aggroRadius = Config.ENEMY_SQUIRREL_AGGRO_RADIUS;
        this.deaggroRadius = Config.ENEMY_SQUIRREL_DEAGGRO_RADIUS;
    }

    createMesh() {
        return createSquirrelModel();
    }
}

export class Deer extends Enemy {
    constructor(initialData, scene, chunkManager) { // Add chunkManager
        super(initialData, scene, chunkManager); // Pass chunkManager
        this.speed = Config.ENEMY_DEER_SPEED;
        this.aggroRadius = Config.ENEMY_DEER_AGGRO_RADIUS;
        this.deaggroRadius = Config.ENEMY_DEER_DEAGGRO_RADIUS;
    }

    createMesh() {
        return createDeerModel();
    }
}

console.log('enemy.js loaded');
