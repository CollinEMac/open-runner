// js/gameObjects/Tumbleweed.js

import * as THREE from 'three';
import GameObject from '../core/GameObject.js';
import PhysicsComponent from '../components/PhysicsComponent.js';
import { noise2D } from '../utils/noise.js';
import eventBus from '../eventBus.js';

/**
 * Tumbleweed GameObject
 * A dynamic hazard that rolls across the terrain toward the player's path
 */
export default class Tumbleweed extends GameObject {
    /**
     * Create a new Tumbleweed
     * @param {Object} options - Configuration options
     * @param {THREE.Vector3} options.position - Initial position
     * @param {number} options.scale - Scale factor
     * @param {THREE.Scene} options.scene - Scene to add to
     * @param {Object} options.levelConfig - Level configuration
     */
    constructor(options = {}) {
        super({
            name: 'Tumbleweed',
            position: options.position,
            collidable: true,
            ...options
        });

        this.scene = options.scene;
        this.levelConfig = options.levelConfig;
        this.scale = options.scale || 1.0;
        
        // Tumbleweed properties
        this.rollSpeed = 2.0 + Math.random() * 3.0; // Random speed between 2-5
        this.rotationSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * 2.0,
            (Math.random() - 0.5) * 2.0,
            (Math.random() - 0.5) * 2.0
        );
        this.targetDirection = new THREE.Vector3();
        this.isActive = false;
        this.activationDistance = 50; // Distance from player to activate
        this.deactivationDistance = 100; // Distance from player to deactivate
        
        // Create the visual representation
        this._createVisual();
        
        // Add physics component
        this.physics = this.addComponent(new PhysicsComponent({
            mass: 0.5,
            friction: 0.2,
            restitution: 0.3,
            useGravity: true,
            gravityForce: 9.8,
            velocity: new THREE.Vector3(0, 0, 0)
        }));
        
        // Add to scene if provided
        if (this.scene) {
            this.addToScene(this.scene);
        }
    }
    
    /**
     * Create the visual representation of the tumbleweed
     * @private
     */
    _createVisual() {
        // Create a more detailed tumbleweed model
        const geometry = new THREE.IcosahedronGeometry(1.0, 1);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xAD8B60, 
            roughness: 0.9,
            metalness: 0.1,
            wireframe: true
        });
        
        // Create the main mesh
        const mainMesh = new THREE.Mesh(geometry, material);
        mainMesh.castShadow = true;
        mainMesh.receiveShadow = true;
        
        // Create a second mesh for more detail
        const innerGeometry = new THREE.IcosahedronGeometry(0.8, 1);
        const innerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B6B40, 
            roughness: 0.7,
            metalness: 0.1
        });
        const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
        
        // Add meshes to the object3D group
        this.object3D.add(mainMesh);
        this.object3D.add(innerMesh);
        
        // Set scale
        this.object3D.scale.set(this.scale, this.scale, this.scale);
        
        // Set userData for collision detection
        this.object3D.userData = {
            objectType: 'tumbleweed',
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
        super.update(deltaTime, elapsedTime);
        
        // Check if we should activate/deactivate based on distance to player
        const distanceToPlayerSq = this.object3D.position.distanceToSquared(playerPosition);
        
        if (!this.isActive && distanceToPlayerSq < this.activationDistance * this.activationDistance) {
            this._activate(playerPosition);
        } else if (this.isActive && distanceToPlayerSq > this.deactivationDistance * this.deactivationDistance) {
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
        
        // Calculate initial direction toward player's path
        // We want to roll toward where the player will be, not directly at them
        const playerDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, playerPosition.y, 0))
        );
        
        // Calculate a point ahead of the player
        const targetPoint = playerPosition.clone().add(
            playerDirection.clone().multiplyScalar(20)
        );
        
        // Direction from tumbleweed to that point
        this.targetDirection.subVectors(targetPoint, this.object3D.position).normalize();
        
        // Set initial velocity
        const initialSpeed = this.rollSpeed * (0.8 + Math.random() * 0.4);
        this.physics.setVelocity(
            this.targetDirection.clone().multiplyScalar(initialSpeed)
        );
    }
    
    /**
     * Deactivate the tumbleweed
     * @private
     */
    _deactivate() {
        this.isActive = false;
        this.physics.setVelocity(new THREE.Vector3(0, 0, 0));
    }
    
    /**
     * Update the tumbleweed's movement
     * @param {number} deltaTime - Time since last update in seconds
     * @param {THREE.Vector3} playerPosition - Current player position
     * @private
     */
    _updateMovement(deltaTime, playerPosition) {
        // Get current velocity
        const velocity = this.physics.velocity.clone();
        
        // Only adjust direction if we have some velocity
        if (velocity.lengthSq() > 0.1) {
            // Calculate direction to player's path (not directly to player)
            const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(
                new THREE.Quaternion().setFromEuler(new THREE.Euler(0, playerPosition.y, 0))
            );
            
            // Calculate a point ahead of the player
            const targetPoint = playerPosition.clone().add(
                playerForward.clone().multiplyScalar(20 + Math.random() * 10)
            );
            
            // Calculate new direction with some randomness
            const newDirection = new THREE.Vector3().subVectors(targetPoint, this.object3D.position).normalize();
            
            // Blend current direction with new direction
            this.targetDirection.lerp(newDirection, 0.05);
            
            // Apply a force in the target direction
            const steeringForce = this.targetDirection.clone().multiplyScalar(this.rollSpeed * 0.5);
            this.physics.applyForce(steeringForce);
            
            // Limit max speed
            const maxSpeed = this.rollSpeed;
            if (this.physics.velocity.length() > maxSpeed) {
                this.physics.velocity.normalize().multiplyScalar(maxSpeed);
            }
            
            // Rotate the tumbleweed based on movement
            // Calculate rotation axis perpendicular to movement direction
            const movementDir = this.physics.velocity.clone().normalize();
            const rotationAxis = new THREE.Vector3(movementDir.z, 0, -movementDir.x).normalize();
            
            // Rotation amount based on distance traveled
            const rotationAmount = this.physics.velocity.length() * deltaTime;
            
            // Apply rotation
            const rotationQuat = new THREE.Quaternion().setFromAxisAngle(rotationAxis, rotationAmount);
            this.object3D.quaternion.premultiply(rotationQuat);
            
            // Add some random wobble
            const wobbleQuat = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(
                    this.rotationSpeed.x * deltaTime * 0.1,
                    this.rotationSpeed.y * deltaTime * 0.1,
                    this.rotationSpeed.z * deltaTime * 0.1
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
        
        // Only adjust if we're below terrain or too far above
        if (pos.y < terrainY + 0.5) {
            pos.y = terrainY + 0.5;
            
            // If we hit the ground, bounce a little
            if (this.physics.velocity.y < 0) {
                this.physics.velocity.y = Math.abs(this.physics.velocity.y) * 0.3;
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
}
