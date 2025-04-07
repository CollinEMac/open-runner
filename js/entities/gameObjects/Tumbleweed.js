// js/entities/gameObjects/Tumbleweed.js

import * as THREE from 'three';
// import GameObject from '../../core/GameObject.js'; // GameObject was removed in Phase 2, this dependency needs fixing later
import PhysicsComponent from '../../physics/PhysicsComponent.js'; // Updated path
import { noise2D } from '../../rendering/terrainGenerator.js'; // Updated path
import eventBus from '../../core/eventBus.js'; // Updated path
import { tumbleweedConfig as C } from '../../config/tumbleweed.js'; // Import specific config object and alias it
import { randomRange } from '../../utils/mathUtils.js'; // Import randomRange if needed

/**
 * Tumbleweed GameObject
 * A dynamic hazard that rolls across the terrain toward the player's path
 */
export default class Tumbleweed /* extends GameObject */ { // Removed inheritance as base class is gone
    /**
     * Create a new Tumbleweed
     * @param {Object} options - Configuration options
     * @param {THREE.Vector3} options.position - Initial position
     * @param {number} options.scale - Scale factor
     * @param {THREE.Scene} options.scene - Scene to add to
     * @param {Object} options.levelConfig - Level configuration
     */
    constructor(options = {}) {
        // super({ // Base class removed
        //     name: 'Tumbleweed',
        //     position: options.position,
        //     collidable: true,
        //     ...options
        // });
        // Manually set properties previously handled by GameObject base class
        this.name = C.TW_OBJECT_TYPE_NAME; // Use constant
        this.object3D = new THREE.Group(); // Create the main group
        this.object3D.name = this.name;
        if (options.position) {
            this.object3D.position.copy(options.position);
        }
        this.active = true; // Assume active by default
        this.components = new Map(); // Simple component map

        this.scene = options.scene;
        this.levelConfig = options.levelConfig;
        this.scale = options.scale || 1.0;

        // Tumbleweed properties - Use constants and randomRange
        this.rollSpeed = randomRange(C.TW_ROLL_SPEED_MIN, C.TW_ROLL_SPEED_MAX);
        this.rotationSpeed = new THREE.Vector3(
            randomRange(C.TW_ROTATION_SPEED_MIN, C.TW_ROTATION_SPEED_MAX),
            randomRange(C.TW_ROTATION_SPEED_MIN, C.TW_ROTATION_SPEED_MAX),
            randomRange(C.TW_ROTATION_SPEED_MIN, C.TW_ROTATION_SPEED_MAX)
        );
        this.targetDirection = new THREE.Vector3();
        this.isActive = false;
        this.activationDistanceSq = C.TW_ACTIVATION_DISTANCE * C.TW_ACTIVATION_DISTANCE; // Store squared distance
        this.deactivationDistanceSq = C.TW_DEACTIVATION_DISTANCE * C.TW_DEACTIVATION_DISTANCE; // Store squared distance

        // Create the visual representation
        this._createVisual();

        // Add physics component using constants
        this.physics = this.addComponent(new PhysicsComponent({
            mass: C.TW_MASS,
            friction: C.TW_FRICTION,
            restitution: C.TW_RESTITUTION,
            useGravity: C.TW_USE_GRAVITY,
            gravityForce: C.TW_GRAVITY_FORCE,
            velocity: new THREE.Vector3(0, 0, 0) // Initial velocity is zero
        }));

        // Add to scene if provided
        if (this.scene) {
            this.addToScene(this.scene);
        }

        // Reusable THREE objects for performance
        this._tempVec3_1 = new THREE.Vector3();
        this._tempVec3_2 = new THREE.Vector3();
        this._tempQuat_1 = new THREE.Quaternion();
        this._tempQuat_2 = new THREE.Quaternion();
        this._tempEuler = new THREE.Euler();
    }

    // --- Methods previously from GameObject base class (simplified) ---
    addComponent(component) {
        component.gameObject = this; // Link component back
        this.components.set(component.name || component.constructor.name, component);
        if (typeof component.onAttach === 'function') {
            component.onAttach(this);
        }
        return component;
    }

    getComponent(name) {
        return this.components.get(name);
    }

    addToScene(parent) {
        if (parent && typeof parent.add === 'function') {
            parent.add(this.object3D);
        }
    }

    removeFromScene() {
        if (this.object3D.parent) {
            this.object3D.parent.remove(this.object3D);
        }
    }

    emit(eventName, ...args) {
        // Placeholder for event emission if needed, maybe link to global eventBus?
    }
    // --- End GameObject methods ---


    /**
     * Create the visual representation of the tumbleweed
     * @private
     */
    _createVisual() {
        // Create a more detailed tumbleweed model using constants
        const geometry = new THREE.IcosahedronGeometry(C.TW_MAIN_GEOMETRY_RADIUS, C.TW_MAIN_GEOMETRY_DETAIL);
        const material = new THREE.MeshStandardMaterial({
            color: C.TW_MAIN_MATERIAL_COLOR,
            roughness: C.TW_MAIN_MATERIAL_ROUGHNESS,
            metalness: C.TW_MAIN_MATERIAL_METALNESS,
            wireframe: C.TW_MAIN_MATERIAL_WIREFRAME
        });

        // Create the main mesh
        const mainMesh = new THREE.Mesh(geometry, material);
        mainMesh.castShadow = true;
        mainMesh.receiveShadow = true;

        // Create a second mesh for more detail using constants
        const innerGeometry = new THREE.IcosahedronGeometry(C.TW_INNER_GEOMETRY_RADIUS, C.TW_INNER_GEOMETRY_DETAIL);
        const innerMaterial = new THREE.MeshStandardMaterial({
            color: C.TW_INNER_MATERIAL_COLOR,
            roughness: C.TW_INNER_MATERIAL_ROUGHNESS,
            metalness: C.TW_INNER_MATERIAL_METALNESS
        });
        const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);

        // Add meshes to the object3D group
        this.object3D.add(mainMesh);
        this.object3D.add(innerMesh);

        // Set scale
        this.object3D.scale.set(this.scale, this.scale, this.scale);

        // Set userData for collision detection
        this.object3D.userData = {
            objectType: C.TW_OBJECT_TYPE_NAME, // Use constant
            collidable: true,
            gameObject: this,
            isHazard: true
        };
    }

    /**
     * Update the tumbleweed
     * @param {number} deltaTime - Time since last update in seconds
     * @param {number} elapsedTime - Total elapsed time in seconds
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    update(deltaTime, elapsedTime, playerPosition) {
        if (!this.active) return;

        // Call base update (updates components)
        // super.update(deltaTime, elapsedTime); // Base class removed, update components manually
        this.components.forEach(component => {
             if (component.enabled && typeof component.update === 'function') {
                 component.update(deltaTime, elapsedTime);
             }
         });


        // Check if we should activate/deactivate based on distance to player
        const distanceToPlayerSq = this.object3D.position.distanceToSquared(playerPosition);

        if (!this.isActive && distanceToPlayerSq < this.activationDistanceSq) { // Use pre-calculated squared distance
            this._activate(playerPosition);
        } else if (this.isActive && distanceToPlayerSq > this.deactivationDistanceSq) { // Use pre-calculated squared distance
            this._deactivate();
        }

        // If active, update movement
        if (this.isActive) {
            this._updateMovement(deltaTime, playerPosition);
        }

        // Update terrain height to stay on ground
        this._updateTerrainHeight();
    }

    /**
     * Activate the tumbleweed
     * @param {THREE.Vector3} playerPosition - Current player position
     * @private
     */
    _activate(playerPosition) {
        this.isActive = true;

        // Calculate initial direction toward player's path using reusable objects
        const playerDirection = this._tempVec3_1.set(0, 0, -1).applyQuaternion(
            this._tempQuat_1.setFromEuler(this._tempEuler.set(0, 0, 0)) // Use reusable Euler and Quaternion
        );

        // Calculate a point ahead of the player using constants and reusable objects
        const targetAheadDistance = randomRange(C.TW_TARGET_AHEAD_MIN, C.TW_TARGET_AHEAD_MAX);
        const targetPoint = this._tempVec3_2.copy(playerPosition).add(
            playerDirection.multiplyScalar(targetAheadDistance) // Modify playerDirection in place
        );

        // Direction from tumbleweed to that point
        this.targetDirection.subVectors(targetPoint, this.object3D.position).normalize();

        // Add some randomness to the initial direction using constant
        this.targetDirection.x += (Math.random() - 0.5) * C.TW_TARGET_RANDOMNESS;
        this.targetDirection.normalize();

        // Set initial velocity using constants and reusable vector
        const initialSpeedFactor = randomRange(C.TW_INITIAL_SPEED_FACTOR_MIN, C.TW_INITIAL_SPEED_FACTOR_MAX);
        const initialSpeed = this.rollSpeed * initialSpeedFactor;
        this.physics.setVelocity(
            this._tempVec3_1.copy(this.targetDirection).multiplyScalar(initialSpeed) // Use tempVec3_1
        );
    }

    /**
     * Deactivate the tumbleweed
     * @private
     */
    _deactivate() {
        this.isActive = false;
        this.physics.setVelocity(this._tempVec3_1.set(0, 0, 0)); // Use reusable vector
    }

    /**
     * Update the tumbleweed's movement
     * @param {number} deltaTime - Time since last update in seconds
     * @param {THREE.Vector3} playerPosition - Current player position
     * @private
     */
    _updateMovement(deltaTime, playerPosition) {
        // Get current velocity using reusable vector
        const velocity = this._tempVec3_1.copy(this.physics.velocity);

        // Only adjust direction if we have some velocity (use constant)
        if (velocity.lengthSq() > C.TW_MIN_VELOCITY_SQ_THRESHOLD) {
            // Calculate direction to player's path using reusable objects
            const playerForward = this._tempVec3_2.set(0, 0, -1).applyQuaternion(
                this._tempQuat_1.setFromEuler(this._tempEuler.set(0, 0, 0)) // Use reusable Euler and Quaternion
            );

            // Calculate a point ahead of the player using constants and reusable objects
            const targetAheadDistance = randomRange(C.TW_UPDATE_TARGET_AHEAD_MIN, C.TW_UPDATE_TARGET_AHEAD_MAX);
            const targetPoint = this._tempVec3_1.copy(playerPosition).add(
                playerForward.multiplyScalar(targetAheadDistance) // Modify playerForward in place
            );

            // Calculate new direction using reusable vector
            const newDirection = this._tempVec3_2.subVectors(targetPoint, this.object3D.position).normalize();

            // Add some randomness using constant
            newDirection.x += (Math.random() - 0.5) * C.TW_UPDATE_DIRECTION_RANDOMNESS;
            newDirection.normalize();

            // Blend current direction with new direction using constant
            this.targetDirection.lerp(newDirection, C.TW_STEERING_LERP_FACTOR);

            // Apply a force in the target direction using constant and reusable vector
            const steeringForce = this._tempVec3_1.copy(this.targetDirection).multiplyScalar(this.rollSpeed * C.TW_STEERING_FORCE_FACTOR);
            this.physics.applyForce(steeringForce);

            // Limit max speed using constant
            const maxSpeed = this.rollSpeed * C.TW_MAX_SPEED_FACTOR;
            if (this.physics.velocity.length() > maxSpeed) {
                this.physics.velocity.normalize().multiplyScalar(maxSpeed);
            }

            // Rotate the tumbleweed based on movement
            // Calculate rotation axis perpendicular to movement direction using reusable vectors
            const movementDir = this._tempVec3_2.copy(this.physics.velocity).normalize(); // Use tempVec3_2
            const rotationAxis = this._tempVec3_1.set(movementDir.z, 0, -movementDir.x).normalize(); // Use tempVec3_1

            // Rotation amount based on distance traveled
            const rotationAmount = this.physics.velocity.length() * deltaTime;

            // Apply rotation using reusable quaternion
            const rotationQuat = this._tempQuat_1.setFromAxisAngle(rotationAxis, rotationAmount); // Use tempQuat_1
            this.object3D.quaternion.premultiply(rotationQuat);

            // Add some random wobble using constants and reusable objects
            const wobbleQuat = this._tempQuat_2.setFromEuler( // Use tempQuat_2
                this._tempEuler.set( // Use tempEuler
                    this.rotationSpeed.x * deltaTime * C.TW_WOBBLE_FACTOR,
                    this.rotationSpeed.y * deltaTime * C.TW_WOBBLE_FACTOR,
                    this.rotationSpeed.z * deltaTime * C.TW_WOBBLE_FACTOR
                )
            );
            this.object3D.quaternion.premultiply(wobbleQuat);
        }
    }

    /**
     * Update the tumbleweed's height to stay on the terrain
     * @private
     */
    _updateTerrainHeight() {
        if (!this.levelConfig) return;

        const pos = this.object3D.position;
        const terrainY = noise2D(
            pos.x * this.levelConfig.NOISE_FREQUENCY,
            pos.z * this.levelConfig.NOISE_FREQUENCY
        ) * this.levelConfig.NOISE_AMPLITUDE;

        // Only adjust if we're below terrain or too far above (use constant)
        if (pos.y < terrainY + C.TW_TERRAIN_ADJUST_THRESHOLD) {
            pos.y = terrainY + C.TW_TERRAIN_ADJUST_THRESHOLD;

            // If we hit the ground, bounce a little (use constant)
            if (this.physics.velocity.y < 0) {
                this.physics.velocity.y = Math.abs(this.physics.velocity.y) * C.TW_GROUND_BOUNCE_FACTOR;
            }
        }
    }

    /**
     * Handle collision with the player
     */
    onPlayerCollision() {
        // Emit player death event
        eventBus.emit('playerDied');
    }

    /**
     * Dispose resources
     */
     dispose() {
        // Dispose components
        this.components.forEach(component => {
            if (typeof component.dispose === 'function') {
                component.dispose();
            }
        });
        this.components.clear();

        // Dispose geometry and materials
        if (this.object3D) {
            this.object3D.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.geometry?.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m?.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        }
        // Remove from scene if still attached
        this.removeFromScene();
    }
}