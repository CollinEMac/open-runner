// js/components/PhysicsComponent.js

import * as THREE from 'three';
import Component from '../core/Component.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('PhysicsComponent');

/**
 * Component that adds basic physics behavior to a GameObject
 */
export default class PhysicsComponent extends Component {
    /**
     * Create a new PhysicsComponent
     * @param {Object} [options={}] - Configuration options
     * @param {THREE.Vector3} [options.velocity] - Initial velocity
     * @param {THREE.Vector3} [options.acceleration] - Initial acceleration
     * @param {number} [options.mass=1] - Mass of the object
     * @param {number} [options.friction=0.1] - Friction coefficient
     * @param {number} [options.restitution=0.5] - Restitution (bounciness)
     * @param {boolean} [options.useGravity=true] - Whether to apply gravity
     * @param {number} [options.gravityForce=9.8] - Gravity force
     * @param {boolean} [options.isKinematic=false] - Whether the object is kinematic (not affected by forces)
     * @param {boolean} [options.isTrigger=false] - Whether the object is a trigger (no physical response)
     */
    constructor(options = {}) {
        super({ name: 'PhysicsComponent', ...options });

        const {
            velocity = new THREE.Vector3(),
            acceleration = new THREE.Vector3(),
            mass = 1,
            friction = 0.1,
            restitution = 0.5,
            useGravity = true,
            gravityForce = 9.8,
            isKinematic = false,
            isTrigger = false
        } = options;

        /**
         * Velocity vector
         * @type {THREE.Vector3}
         */
        this.velocity = velocity instanceof THREE.Vector3
            ? velocity.clone()
            : new THREE.Vector3(velocity.x || 0, velocity.y || 0, velocity.z || 0);

        /**
         * Acceleration vector
         * @type {THREE.Vector3}
         */
        this.acceleration = acceleration instanceof THREE.Vector3
            ? acceleration.clone()
            : new THREE.Vector3(acceleration.x || 0, acceleration.y || 0, acceleration.z || 0);

        /**
         * Mass of the object
         * @type {number}
         */
        this.mass = Math.max(0.001, mass);

        /**
         * Friction coefficient
         * @type {number}
         */
        this.friction = Math.max(0, Math.min(1, friction));

        /**
         * Restitution (bounciness)
         * @type {number}
         */
        this.restitution = Math.max(0, Math.min(1, restitution));

        /**
         * Whether to apply gravity
         * @type {boolean}
         */
        this.useGravity = useGravity;

        /**
         * Gravity force
         * @type {number}
         */
        this.gravityForce = gravityForce;

        /**
         * Whether the object is kinematic (not affected by forces)
         * @type {boolean}
         */
        this.isKinematic = isKinematic;

        /**
         * Whether the object is a trigger (no physical response)
         * @type {boolean}
         */
        this.isTrigger = isTrigger;

        /**
         * Whether the object is grounded
         * @type {boolean}
         */
        this.isGrounded = false;

        /**
         * Accumulated forces to apply
         * @type {THREE.Vector3}
         */
        this.forces = new THREE.Vector3();

        /**
         * Previous position for collision detection
         * @type {THREE.Vector3}
         */
        this.previousPosition = new THREE.Vector3();

        /**
         * Whether the object is colliding
         * @type {boolean}
         */
        this.isColliding = false;

        /**
         * Current collisions
         * @type {Set<GameObject>}
         */
        this.collisions = new Set();

        // Set priority to update before other components
        this.priority = -10;
    }

    /**
     * Called when the component is attached to a GameObject
     * @param {GameObject} gameObject - The GameObject this component is attached to
     */
    onAttach(gameObject) {
        super.onAttach(gameObject);
        
        // Store initial position
        if (gameObject && gameObject.object3D) {
            this.previousPosition.copy(gameObject.object3D.position);
        }
    }

    /**
     * Update the physics simulation
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime, elapsedTime) {
        if (!this.enabled || !this.gameObject || this.isKinematic) return;

        // Store previous position for collision detection
        this.previousPosition.copy(this.gameObject.object3D.position);

        // Apply gravity if enabled
        if (this.useGravity && !this.isGrounded) {
            this.applyForce(new THREE.Vector3(0, -this.gravityForce * this.mass, 0));
        }

        // Update velocity based on acceleration and forces
        if (!this.isKinematic) {
            // Calculate acceleration from forces: a = F/m
            const acceleration = this.forces.clone().divideScalar(this.mass);
            
            // Add to current acceleration
            this.acceleration.add(acceleration);
            
            // Update velocity: v = v + a*t
            this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
            
            // Apply friction if grounded
            if (this.isGrounded) {
                const friction = this.velocity.clone().negate().normalize().multiplyScalar(this.friction);
                friction.y = 0; // Don't apply friction to vertical movement
                
                // Only apply friction if it wouldn't reverse velocity
                if (this.velocity.lengthSq() > friction.lengthSq() * deltaTime * deltaTime) {
                    this.velocity.add(friction.multiplyScalar(deltaTime));
                } else if (this.velocity.lengthSq() > 0.0001) {
                    // If friction would reverse velocity, just stop horizontal movement
                    this.velocity.x = 0;
                    this.velocity.z = 0;
                }
            }
            
            // Update position: p = p + v*t
            const movement = this.velocity.clone().multiplyScalar(deltaTime);
            this.gameObject.object3D.position.add(movement);
        }

        // Reset forces and acceleration for next frame
        this.forces.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
    }

    /**
     * Apply a force to the object
     * @param {THREE.Vector3} force - Force to apply
     */
    applyForce(force) {
        if (this.isKinematic) return;
        this.forces.add(force);
    }

    /**
     * Apply an impulse to the object (immediate velocity change)
     * @param {THREE.Vector3} impulse - Impulse to apply
     */
    applyImpulse(impulse) {
        if (this.isKinematic) return;
        // v = v + impulse/m
        this.velocity.add(impulse.clone().divideScalar(this.mass));
    }

    /**
     * Set the velocity directly
     * @param {THREE.Vector3} velocity - New velocity
     */
    setVelocity(velocity) {
        this.velocity.copy(velocity);
    }

    /**
     * Handle collision with another object
     * @param {GameObject} other - The other object
     * @param {THREE.Vector3} normal - Collision normal
     * @param {number} penetration - Penetration depth
     */
    handleCollision(other, normal, penetration) {
        if (!this.enabled || this.isTrigger) return;

        // Add to collisions set
        this.collisions.add(other);
        this.isColliding = true;

        // Emit collision event
        this.gameObject.emit('collision', other, normal, penetration);

        // Check if we're grounded (colliding with something below us)
        if (normal.y > 0.5) {
            this.isGrounded = true;
        }

        // If kinematic, don't apply physical response
        if (this.isKinematic) return;

        // Resolve penetration
        if (penetration > 0) {
            const correction = normal.clone().multiplyScalar(penetration);
            this.gameObject.object3D.position.add(correction);
        }

        // Get other physics component if any
        const otherPhysics = other.getComponent('PhysicsComponent');

        // Calculate response
        if (otherPhysics && !otherPhysics.isTrigger) {
            // Calculate relative velocity
            const relativeVelocity = this.velocity.clone().sub(otherPhysics.velocity);
            const normalVelocity = relativeVelocity.dot(normal);

            // Only resolve if objects are moving toward each other
            if (normalVelocity < 0) {
                // Calculate restitution (use the smaller of the two)
                const restitution = Math.min(this.restitution, otherPhysics.restitution);

                // Calculate impulse scalar
                let j = -(1 + restitution) * normalVelocity;
                j /= 1 / this.mass + 1 / otherPhysics.mass;

                // Apply impulse
                const impulse = normal.clone().multiplyScalar(j);
                this.applyImpulse(impulse.clone().negate());
                otherPhysics.applyImpulse(impulse);
            }
        } else {
            // Colliding with a static object
            // Reflect velocity along the normal
            const dot = this.velocity.dot(normal);
            if (dot < 0) {
                const reflection = normal.clone().multiplyScalar(2 * dot);
                this.velocity.sub(reflection);
                
                // Apply restitution
                this.velocity.multiplyScalar(this.restitution);
            }
        }
    }

    /**
     * Handle trigger enter event
     * @param {GameObject} other - The other object
     */
    handleTriggerEnter(other) {
        if (!this.enabled) return;

        // Add to collisions set
        this.collisions.add(other);
        
        // Emit trigger event
        this.gameObject.emit('triggerEnter', other);
    }

    /**
     * Handle trigger exit event
     * @param {GameObject} other - The other object
     */
    handleTriggerExit(other) {
        if (!this.enabled) return;

        // Remove from collisions set
        this.collisions.delete(other);
        
        // Emit trigger event
        this.gameObject.emit('triggerExit', other);
    }

    /**
     * Clear collision state
     */
    clearCollisionState() {
        this.isColliding = false;
        this.isGrounded = false;
        this.collisions.clear();
    }

    /**
     * Get the movement vector since last frame
     * @returns {THREE.Vector3} Movement vector
     */
    getMovementVector() {
        return this.gameObject.object3D.position.clone().sub(this.previousPosition);
    }
}