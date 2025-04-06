// js/entities/enemies/Coyote.js
import { Enemy } from '../enemy.js'; // Import the base Enemy class
import * as ModelFactory from '../../rendering/modelFactory.js'; // Import ModelFactory

export class Coyote extends Enemy {
    constructor(initialData, properties, scene, chunkManager) {
        super(initialData, properties, scene, chunkManager);
    }

    createMesh() {
        // Call ModelFactory instead of AssetManager
        return ModelFactory.createCoyoteModel(this);
    }
}