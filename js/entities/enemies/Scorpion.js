// js/entities/enemies/Scorpion.js
import * as THREE from 'three'; // Needed for Vector3
import { Enemy } from '../enemy.js'; // Import the base Enemy class
import * as ModelFactory from '../../rendering/modelFactory.js'; // Import ModelFactory
import { enemyDefaultsConfig } from '../../config/enemyDefaults.js'; // Import defaults for grounding

// Shared raycaster and vectors (consider moving to a shared physics utils if used elsewhere)
const groundRaycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);
const _rayOrigin = new THREE.Vector3();

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
        _rayOrigin.set(currentPosition.x, currentPosition.y + enemyDefaultsConfig.GROUNDING_OFFSET_SCORPION, currentPosition.z); // Use constant & reusable vector
        groundRaycaster.set(_rayOrigin, downVector);
        const nearbyTerrain = this.chunkManager.getTerrainMeshesNear(currentPosition);
        const intersects = groundRaycaster.intersectObjects(nearbyTerrain);

        if (intersects.length > 0) {
            this.lastGroundY = intersects[0].point.y;
            const smoothFactor = enemyDefaultsConfig.GROUND_SMOOTHING_FACTOR;
            this.currentGroundY = this.currentGroundY * (1.0 - smoothFactor) + this.lastGroundY * smoothFactor; // Use constant
            const modelHeight = enemyDefaultsConfig.GROUNDING_HEIGHT_SCORPION; // Use constant
            this.mesh.position.y = this.currentGroundY + modelHeight / 2;
        } else {
             // Maintain last known good height if no ground found
             const modelHeight = enemyDefaultsConfig.GROUNDING_HEIGHT_SCORPION; // Use constant
             this.mesh.position.y = this.currentGroundY + modelHeight / 2;
        }
    }
}