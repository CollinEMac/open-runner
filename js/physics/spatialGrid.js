// js/physics/spatialGrid.js
import * as THREE from 'three'; // Re-enabled THREE import
import { createLogger } from '../utils/logger.js'; // Import logger

const logger = createLogger('SpatialGrid'); // Instantiate logger

/**
 * A simple 2D spatial grid for optimizing collision detection.
 * Stores object references (like meshes) in grid cells based on their XZ position.
 */
export class SpatialGrid {
    /**
     * @param {number} cellSize The width and depth of each grid cell.
     */
    constructor(cellSize) {
        if (!cellSize || cellSize <= 0) {
            throw new Error("SpatialGrid requires a positive cellSize.");
        }
        this.cellSize = cellSize;
        // Use a Map where key is "gridX,gridZ" and value is a Set of object references
        this.grid = new Map();
        this.objectCellMap = new Map(); // Map objectRef.id -> cellKey
    }

    /**
     * Calculates the grid cell coordinates for a given world position.
     * @param {{x: number, z: number}} position World position (only x and z are used).
     * @returns {{gridX: number, gridZ: number}} The integer grid coordinates.
     */
    _getGridCoords(position) {
        const gridX = Math.floor(position.x / this.cellSize);
        const gridZ = Math.floor(position.z / this.cellSize);
        return { gridX, gridZ };
    }

    /**
     * Generates the string key for a grid cell.
     * @param {number} gridX
     * @param {number} gridZ
     * @returns {string} The cell key "gridX,gridZ".
     */
    _getCellKey(gridX, gridZ) {
        return `${gridX},${gridZ}`;
    }

    /**
     * Adds an object reference to the grid cell corresponding to its position.
     * Note: This simple version adds to only one cell based on the object's origin. (Limitation: Large objects near cell boundaries might miss collisions).
     * A more robust version might add to multiple cells if the object spans boundaries.
     * @param {any} objectRef The object reference to store (e.g., THREE.Mesh). Requires objectRef.position.
     * @param {string} [cellKey=null] Optional: Pre-calculated cell key to avoid recalculation.
     */
    add(objectRef, cellKey = null) {
        if (!objectRef || !objectRef.position) {
            logger.warn("[SpatialGrid] Attempted to add object without position.", objectRef);
            return;
        }

        const key = cellKey || this._getCellKey(this._getGridCoords(objectRef.position).gridX, this._getGridCoords(objectRef.position).gridZ);

        if (!this.grid.has(key)) {
            this.grid.set(key, new Set());
        }
        const cell = this.grid.get(key);
        if (!cell.has(objectRef)) { // Avoid adding duplicates to the cell
            cell.add(objectRef);
            // Store the mapping from object ID to cell key
            if (objectRef.id) { // Ensure object has an ID
                 this.objectCellMap.set(objectRef.id, key);
            } else {
                 logger.warn("[SpatialGrid] Added object missing 'id' property, cannot track in objectCellMap.", objectRef);
            }
        }
        // Store the current cell key on the object's userData for efficient removal/update (optional, but kept for now)
        if (!objectRef.userData) objectRef.userData = {};
        objectRef.userData.spatialGridKey = key;
    }

    /**
     * Removes an object reference from the grid cell it was last known to be in.
     * Uses the stored key in objectRef.userData.spatialGridKey for efficiency.
     * @param {any} objectRef The object reference to remove. Requires objectRef.userData.spatialGridKey.
     */
    remove(objectRef) {
        // Use objectCellMap first if available and object has ID
        let key = null;
        if (objectRef?.id && this.objectCellMap.has(objectRef.id)) {
            key = this.objectCellMap.get(objectRef.id);
        } else if (objectRef?.userData?.spatialGridKey) {
            // Fallback to userData key
            key = objectRef.userData.spatialGridKey;
        } else if (objectRef?.position) {
            // Fallback to calculating key (less efficient)
            const coords = this._getGridCoords(objectRef.position);
            key = this._getCellKey(coords.gridX, coords.gridZ);
        }

        if (!key) {
             logger.warn("[SpatialGrid] Cannot remove object - missing ID, userData key, or position.", objectRef);
             return;
        }

        // Remove from grid cell
        if (this.grid.has(key)) {
            const cell = this.grid.get(key);
            cell.delete(objectRef);
            if (cell.size === 0) {
                this.grid.delete(key); // Clean up empty cell
            }
        } else {
        }

        // Remove from objectCellMap
        if (objectRef?.id) {
            this.objectCellMap.delete(objectRef.id);
        }

        // Clear the stored userData key if it exists
        if (objectRef?.userData?.spatialGridKey) {
            delete objectRef.userData.spatialGridKey;
        }
    }

    /**
     * Updates an object's position in the grid if it has moved to a new cell.
     * @param {any} objectRef The object reference to update. Requires objectRef.position and objectRef.userData.spatialGridKey.
     */
    update(objectRef) {
        if (!objectRef?.position) {
             logger.warn("[SpatialGrid] Cannot update object - missing position.", objectRef);
             return;
        }
        if (!objectRef?.id) {
             logger.warn("[SpatialGrid] Cannot update object - missing id.", objectRef);
             // If it has position but no id/key, try adding it (will warn about missing id)
             this.add(objectRef);
             return;
        }

        const currentKey = this.objectCellMap.get(objectRef.id);
        // If object wasn't tracked, try adding it
        if (!currentKey) {
             this.add(objectRef);
             return;
        }

        // const currentKey = objectRef.userData.spatialGridKey; // Now using objectCellMap
        const { gridX, gridZ } = this._getGridCoords(objectRef.position);
        const newKey = this._getCellKey(gridX, gridZ);

        if (newKey !== currentKey) {
            this.remove(objectRef); // Removes from old cell using stored key
            this.add(objectRef, newKey); // Adds to new cell and updates stored key
        }
        // Else: object hasn't changed cells, do nothing
    }

    /**
     * Queries the grid and returns a Set of unique objects found within the
     * cells surrounding (and including) the cell containing the given position.
     * Checks a 3x3 area of cells centered on the position's cell.
     * @param {{x: number, z: number}} position The center position of the query area.
     * @returns {Set<any>} A Set containing unique object references found in the nearby cells.
     */
    queryNearby(position) {
        const { gridX: centerGridX, gridZ: centerGridZ } = this._getGridCoords(position);
        const nearbyObjects = new Set();

        // Iterate through the 3x3 grid of cells
        for (let x = centerGridX - 1; x <= centerGridX + 1; x++) {
            for (let z = centerGridZ - 1; z <= centerGridZ + 1; z++) {
                const key = this._getCellKey(x, z);
                if (this.grid.has(key)) {
                    const cell = this.grid.get(key);
                    cell.forEach(obj => nearbyObjects.add(obj));
                } else {
                }
            }
        }
        return nearbyObjects;
    }

    // --- Optional Helper Methods ---

    /** Clears the entire grid. */
    clear() {
        this.grid.clear();
        this.objectCellMap.clear();
    }

    /** Gets the number of non-empty cells in the grid. */
    getCellCount() {
        return this.grid.size;
    }

    /** Gets the total number of objects stored in the grid across all cells. */
    getObjectCount() {
        // Return the size of the map tracking unique object IDs
        return this.objectCellMap.size;
    }
}