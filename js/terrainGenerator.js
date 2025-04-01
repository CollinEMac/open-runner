// js/terrainGenerator.js
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise'; // Use createNoise2D for 2D noise
import {
    WORLD_SEED,
    CHUNK_SIZE, // Use CHUNK_SIZE instead of TERRAIN_WIDTH/HEIGHT
    TERRAIN_SEGMENTS_X,
    TERRAIN_SEGMENTS_Y,
    NOISE_FREQUENCY,
    NOISE_AMPLITUDE
} from './config.js';

console.log('terrainGenerator.js loading');

// Initialize the noise function with the seed
const noise2D = createNoise2D(() => {
    // This function provides the seed. Using a simple string hash for reproducibility.
    // A more robust seeding mechanism might be needed for complex scenarios.
    let h = 0;
    for (let i = 0; i < WORLD_SEED.length; i++) {
        h = (h << 5) - h + WORLD_SEED.charCodeAt(i);
        h |= 0; // Convert to 32bit integer
    }
    console.log(`Using world seed: "${WORLD_SEED}" (Hashed: ${h})`);
    return h / 0x80000000; // Normalize to range expected by simplex-noise if needed
});

// Export the noise function so other modules can calculate terrain height
export { noise2D };

// Renamed function to generate a single chunk at specific coordinates
export function createTerrainChunk(chunkX, chunkZ) {
    console.log(`Creating terrain chunk at [${chunkX}, ${chunkZ}]...`);

    // Calculate world offset for this chunk
    const offsetX = chunkX * CHUNK_SIZE;
    const offsetZ = chunkZ * CHUNK_SIZE;

    const geometry = new THREE.PlaneGeometry(
        CHUNK_SIZE, // Use CHUNK_SIZE for geometry dimensions
        CHUNK_SIZE,
        TERRAIN_SEGMENTS_X,
        TERRAIN_SEGMENTS_Y
    );

    // Rotate the plane to be horizontal (XZ plane)
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    console.log(`Generating terrain heights using noise (Freq: ${NOISE_FREQUENCY}, Amp: ${NOISE_AMPLITUDE})...`);
    for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i);

        // Calculate noise based on vertex's WORLD X and Z coordinates for seamless chunks
        const worldX = vertex.x + offsetX;
        const worldZ = vertex.z + offsetZ;
        const noiseVal = noise2D(worldX * NOISE_FREQUENCY, worldZ * NOISE_FREQUENCY);

        // Apply noise to the Y coordinate (height)
        positions.setY(i, noiseVal * NOISE_AMPLITUDE);
    }

    // Important: Notify Three.js that the positions have changed
    positions.needsUpdate = true;

    // Calculate normals for proper lighting
    console.log('Computing vertex normals...');
    geometry.computeVertexNormals();

    console.log('Creating terrain material...');
    // Basic green material
    const material = new THREE.MeshStandardMaterial({
        color: 0x55aa55, // Greenish color
        wireframe: false, // Set to true to see the geometry structure
        side: THREE.DoubleSide // Render both sides, useful for debugging camera position
    });

    console.log('Creating terrain chunk mesh...');
    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.name = `TerrainChunk_${chunkX}_${chunkZ}`; // Assign a unique name

    // Position the chunk correctly in the world
    terrainMesh.position.set(offsetX, 0, offsetZ);

    console.log(`Terrain chunk [${chunkX}, ${chunkZ}] generation complete.`);
    return terrainMesh;
}

console.log('terrainGenerator.js loaded');
