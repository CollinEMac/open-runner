// js/entities/enemies/Deer.js
import { Enemy } from '../enemy.js'; // Import the base Enemy class
import * as ModelFactory from '../../rendering/modelFactory.js'; // Import ModelFactory

export class Deer extends Enemy {
    constructor(initialData, properties, scene, chunkManager) {
        super(initialData, properties, scene, chunkManager);
    }

    createMesh() {
        // Call ModelFactory instead of AssetManager
        return ModelFactory.createDeerModel(this);
    }
}