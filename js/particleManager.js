import * as THREE from 'three';
import * as Config from './config.js'; // Assuming particle config might go here later

const MAX_PARTICLES = 500; // Max dust particles at once
const PARTICLE_LIFETIME = 0.8; // Seconds
const PARTICLES_PER_SECOND = 150; // How many particles to emit
const PARTICLE_INITIAL_SPEED_MIN = 0.5;
const PARTICLE_INITIAL_SPEED_MAX = 1.5;
const PARTICLE_DRIFT_VELOCITY = new THREE.Vector3(0, 0.8, -0.5); // Slight upward and backward drift
const PARTICLE_SIZE = 0.3;
const PARTICLE_COLOR = 0xAAAAAA; // Light gray dust

// Simple circular texture for particles
function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.4, 'rgba(200,200,200,0.3)');
    gradient.addColorStop(1, 'rgba(150,150,150,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Create texture with specific settings to avoid WebGL warnings
    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false; // Prevent FLIP_Y warning with 3D textures
    texture.premultiplyAlpha = false; // Prevent PREMULTIPLY_ALPHA warning
    return texture;
}

export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = []; // Array to hold active particle data { mesh, velocity, age }
        this.particlePool = []; // Pool of inactive particle meshes for reuse
        this.timeToEmit = 0; // Accumulator for emission rate

        // Geometry: We'll manage positions manually
        this.particleGeometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(MAX_PARTICLES * 3);
        this.opacities = new Float32Array(MAX_PARTICLES); // For fading

        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.particleGeometry.setAttribute('opacity', new THREE.BufferAttribute(this.opacities, 1));

        // Material
        this.particleMaterial = new THREE.PointsMaterial({
            size: PARTICLE_SIZE,
            map: createParticleTexture(),
            blending: THREE.AdditiveBlending, // Or NormalBlending
            depthWrite: false, // Particles don't obscure each other as much
            transparent: true,
            vertexColors: false, // Using uniform color for now
            color: PARTICLE_COLOR,
            opacity: 1.0, // We'll control via attribute/shader later if needed, for now uniform
            sizeAttenuation: true,
        });

        // The Points object
        this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.particleSystem.frustumCulled = false; // Ensure it's always rendered if visible
        this.scene.add(this.particleSystem);

        this.activeParticleCount = 0;
}

    emitParticle(originPosition) {
        if (this.activeParticleCount >= MAX_PARTICLES) {
            // console.warn("Max particles reached, skipping emission.");
            return; // Pool is full
        }

        const index = this.activeParticleCount;

        // Set initial position slightly randomized around origin
        this.positions[index * 3 + 0] = originPosition.x + (Math.random() - 0.5) * 0.5;
        this.positions[index * 3 + 1] = originPosition.y; // Start at ground level (adjust if needed)
        this.positions[index * 3 + 2] = originPosition.z + (Math.random() - 0.5) * 0.5;

        // Initial velocity (random upward/backward bias)
        const speed = THREE.MathUtils.randFloat(PARTICLE_INITIAL_SPEED_MIN, PARTICLE_INITIAL_SPEED_MAX);
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5, // Sideways spread
            Math.random() * 0.5 + 0.2,   // Upward bias
            (Math.random() - 0.5) * 0.5 - 0.3 // Backward bias
        );
        velocity.normalize().multiplyScalar(speed);

        // Store particle data (using the index directly)
        this.particles[index] = {
            velocity: velocity,
            age: 0,
            initialY: this.positions[index * 3 + 1] // Store initial Y for potential ground check
        };

        this.opacities[index] = 1.0; // Start fully opaque

        this.activeParticleCount++;
        // // console.log(`Emitted particle ${index + 1}/${this.activeParticleCount}`);
    }

    update(deltaTime, playerPosition) {
        // --- Emission ---
        this.timeToEmit += deltaTime;
        const particlesToEmit = Math.floor(this.timeToEmit * PARTICLES_PER_SECOND);
        if (particlesToEmit > 0) {
            this.timeToEmit -= particlesToEmit / PARTICLES_PER_SECOND; // Reduce accumulator
            const emitOrigin = playerPosition.clone();
            // Adjust emit origin slightly behind and below the player model center if needed
            emitOrigin.y -= Config.PLAYER_HEIGHT_OFFSET * 0.8; // Emit near feet
            // emitOrigin.z += 0.5; // Slightly behind player center

            for (let i = 0; i < particlesToEmit; i++) {
                this.emitParticle(emitOrigin);
            }
        }

        // --- Update Existing Particles ---
        let aliveCount = 0;
        for (let i = 0; i < this.activeParticleCount; i++) {
            const particle = this.particles[i];
            particle.age += deltaTime;

            if (particle.age >= PARTICLE_LIFETIME) {
                // Particle died, swap with the last active particle
                const lastIndex = this.activeParticleCount - 1;
                if (i !== lastIndex) {
                    // Copy data from last particle to current slot
                    this.positions[i * 3 + 0] = this.positions[lastIndex * 3 + 0];
                    this.positions[i * 3 + 1] = this.positions[lastIndex * 3 + 1];
                    this.positions[i * 3 + 2] = this.positions[lastIndex * 3 + 2];
                    this.opacities[i] = this.opacities[lastIndex];
                    this.particles[i] = this.particles[lastIndex];
                }
                this.activeParticleCount--; // Reduce active count
                i--; // Re-process the swapped particle in the next iteration
                // // console.log(`Particle died. Active: ${this.activeParticleCount}`);
                continue; // Skip further processing for this (now dead or replaced) particle
            }

            // Update position based on velocity and drift
            const currentPosX = this.positions[i * 3 + 0];
            const currentPosY = this.positions[i * 3 + 1];
            const currentPosZ = this.positions[i * 3 + 2];

            const newPosX = currentPosX + particle.velocity.x * deltaTime + PARTICLE_DRIFT_VELOCITY.x * deltaTime;
            let newPosY = currentPosY + particle.velocity.y * deltaTime + PARTICLE_DRIFT_VELOCITY.y * deltaTime;
            const newPosZ = currentPosZ + particle.velocity.z * deltaTime + PARTICLE_DRIFT_VELOCITY.z * deltaTime;

            // Optional: Prevent particles from going through the "ground" (approximate)
            // if (newPosY < particle.initialY * 0.8) { // If it drops significantly below start
            //     newPosY = particle.initialY * 0.8;
            //     particle.velocity.y *= -0.3; // Dampen bounce
            // }

            this.positions[i * 3 + 0] = newPosX;
            this.positions[i * 3 + 1] = newPosY;
            this.positions[i * 3 + 2] = newPosZ;

            // Update velocity (e.g., gravity, air resistance - simplified for now)
            // particle.velocity.y -= 0.5 * deltaTime; // Simple gravity

            // Update opacity (fade out)
            const lifeRatio = particle.age / PARTICLE_LIFETIME;
            this.opacities[i] = 1.0 - lifeRatio; // Linear fade

            aliveCount++; // This index is still alive
        }

        // Important: Update the draw range and notify buffer attributes need update
        this.particleGeometry.setDrawRange(0, this.activeParticleCount);
        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.opacity.needsUpdate = true; // Update opacity attribute
// // console.log(`Particles updated. Active: ${this.activeParticleCount}`);
}
}
