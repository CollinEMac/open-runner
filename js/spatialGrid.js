// js/spatialGrid.js
import * as THREE from 'three';

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
    }

    /**
     * Calculates the grid cell coordinates for a given world position.
     * @param {THREE.Vector3} position World position (only x and z are used).
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
     * Note: This simple version adds to only one cell based on the object's origin.
     * A more robust version might add to multiple cells if the object spans boundaries.
     * @param {any} objectRef The object reference to store (e.g., THREE.Mesh). Requires objectRef.position.
     * @param {string} [cellKey=null] Optional: Pre-calculated cell key to avoid recalculation.
     */
    add(objectRef, cellKey = null) {
        if (!objectRef || !objectRef.position) {
            console.warn("[SpatialGrid] Attempted to add object without position.", objectRef);
            return;
        }

        const key = cellKey || this._getCellKey(this._getGridCoords(objectRef.position).gridX, this._getGridCoords(objectRef.position).gridZ);

        if (!this.grid.has(key)) {
            this.grid.set(key, new Set());
        }
        this.grid.get(key).add(objectRef);
        // Store the current cell key on the object's userData for efficient removal/update
        if (!objectRef.userData) objectRef.userData = {};
        objectRef.userData.spatialGridKey = key;
    }

    /**
     * Removes an object reference from the grid cell it was last known to be in.
     * Uses the stored key in objectRef.userData.spatialGridKey for efficiency.
     * @param {any} objectRef The object reference to remove. Requires objectRef.userData.spatialGridKey.
     */
    remove(objectRef) {
        if (!objectRef || !objectRef.userData || !objectRef.userData.spatialGridKey) {
            // console.warn("[SpatialGrid] Attempted to remove object without spatialGridKey.", objectRef);
            // Fallback: try calculating key (less efficient)
            if (objectRef && objectRef.position) {
                const key = this._getCellKey(this._getGridCoords(objectRef.position).gridX, this._getGridCoords(objectRef.position).gridZ);
                if (this.grid.has(key)) {
                    this.grid.get(key).delete(objectRef);
                    // // console.log(`[SpatialGrid] Removed object ${objectRef.id || objectRef.name || 'unknown'} from cell ${key} (fallback). Cell size: ${this.grid.get(key).size}`);
                    if (this.grid.get(key).size === 0) {
                        this.grid.delete(key); // Clean up empty cell
                    }
                }
            } else {
                 console.warn("[SpatialGrid] Cannot remove object - missing position or key.", objectRef);
            }
            return;
        }

        const key = objectRef.userData.spatialGridKey;
        if (this.grid.has(key)) {
            const cell = this.grid.get(key);
            cell.delete(objectRef);
            // // console.log(`[SpatialGrid] Removed object ${objectRef.id || objectRef.name || 'unknown'} from cell ${key}. Cell size: ${cell.size}`);
            if (cell.size === 0) {
                this.grid.delete(key); // Clean up empty cell
            }
        } else {
            // console.warn(`[SpatialGrid] Attempted to remove object from non-existent cell key: ${key}`, objectRef);
        }
        // Clear the stored key
        delete objectRef.userData.spatialGridKey;
    }

    /**
     * Updates an object's position in the grid if it has moved to a new cell.
     * @param {any} objectRef The object reference to update. Requires objectRef.position and objectRef.userData.spatialGridKey.
     */
    update(objectRef) {
        if (!objectRef || !objectRef.position || !objectRef.userData || !objectRef.userData.spatialGridKey) {
            // console.warn("[SpatialGrid] Cannot update object - missing position or key.", objectRef);
            // If it has position but no key, try adding it
            if (objectRef && objectRef.position && (!objectRef.userData || !objectRef.userData.spatialGridKey)) {
                this.add(objectRef);
            }
            return;
        }

        const currentKey = objectRef.userData.spatialGridKey;
        const { gridX, gridZ } = this._getGridCoords(objectRef.position);
        const newKey = this._getCellKey(gridX, gridZ);

        if (newKey !== currentKey) {
            // // console.log(`[SpatialGrid] Updating object ${objectRef.id || objectRef.name || 'unknown'} from ${currentKey} to ${newKey}`);
            this.remove(objectRef); // Removes from old cell using stored key
            this.add(objectRef, newKey); // Adds to new cell and updates stored key
        }
        // Else: object hasn't changed cells, do nothing
    }

    /**
     * Queries the grid and returns a Set of unique objects found within the
     * cells surrounding (and including) the cell containing the given position.
     * Checks a 3x3 area of cells centered on the position's cell.
     * @param {THREE.Vector3} position The center position of the query area.
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
                    // // console.log(`[SpatialGrid]   Checking cell ${key} with ${cell.size} objects.`);
                    cell.forEach(obj => nearbyObjects.add(obj));
                } else {
                    // // console.log(`[SpatialGrid]   Cell ${key} is empty.`);
                }
            }
        }
        return nearbyObjects;
    }

    // --- Optional Helper Methods ---

    /** Clears the entire grid. */
    clear() {
        this.grid.clear();
    }

    /** Gets the number of non-empty cells in the grid. */
    getCellCount() {
        return this.grid.size;
    }

    /** Gets the total number of objects stored in the grid across all cells. */
    getObjectCount() {
        let count = 0;
        for (const cell of this.grid.values()) {
            count += cell.size;
        }
        return count;
    }
}
