// js/main.js
import * as THREE from 'three';
import { ChunkManager } from './chunkManager.js';
import { EnemyManager } from './enemyManager.js'; // Import EnemyManager
import { SpatialGrid } from './spatialGrid.js'; // Import SpatialGrid
import { ParticleManager } from './particleManager.js'; // Import ParticleManager
// Import new controls setup (including key states)
import { setupPlayerControls, keyLeftPressed, keyRightPressed } from './controlsSetup.js'; // Removed mouseDeltaX, resetMouseDelta
import { createPlayerCharacter, animatePlayerCharacter } from './playerCharacter.js';
import * as Config from './config.js'; // Import all config constants

// console.log('main.js loading'); // Removed log

// --- Core Three.js Components ---
let scene, camera, renderer; // Removed controls variable
// let terrain; // Remove single terrain variable
let chunkManager; // Add chunk manager variable
let enemyManager; // Add enemy manager variable
let spatialGrid; // Add spatial grid variable
let particleManager; // Add particle manager variable
let player = {}; // Initialize as an object to hold model and state
let score = 0;
let scoreElement;
let gameOverElement; // For displaying game over message
let titleScreenElement; // For the title screen overlay
let startButtonElement; // For the start button
let loadingScreenElement; // For the loading screen overlay
let progressBarElement; // For the progress bar fill
let progressTextElement; // For the progress text
let gameState = 'loading'; // Initial game state: 'loading', 'title', 'playing', 'gameOver'
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);

// Make init async to handle await for loading
async function init() {
    console.log('Initializing scene...'); // Keep this log

    // --- Get Loading UI Elements First ---
    loadingScreenElement = document.getElementById('loadingScreen');
    progressBarElement = document.getElementById('progressBar');
    progressTextElement = document.getElementById('progressText');
    if (!loadingScreenElement || !progressBarElement || !progressTextElement) {
        console.error("Loading screen elements not found!");
        // Potentially stop execution or show a basic error
        return;
    }
    // Ensure loading screen is visible initially (it should be by default from CSS)
    loadingScreenElement.style.display = 'flex';

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(Config.SCENE_BACKGROUND_COLOR);
    scene.fog = new THREE.Fog(Config.SCENE_FOG_COLOR, Config.SCENE_FOG_NEAR, Config.SCENE_FOG_FAR);

    // Camera
    camera = new THREE.PerspectiveCamera(
        Config.CAMERA_FOV,
        window.innerWidth / window.innerHeight,
        Config.CAMERA_NEAR_PLANE,
        Config.CAMERA_FAR_PLANE
    );
    // Initial camera position (will be overridden by follow logic)
    camera.position.set(0, 50, 100);
    camera.lookAt(0, 0, 0);

    // Renderer
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true; // Keep shadows enabled

    // Lighting
    // console.log('Setting up lighting...'); // Removed log
    const ambientLight = new THREE.AmbientLight(
        Config.AMBIENT_LIGHT_COLOR,
        Config.AMBIENT_LIGHT_INTENSITY
    );
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
        Config.DIRECTIONAL_LIGHT_COLOR,
        Config.DIRECTIONAL_LIGHT_INTENSITY
    );
    directionalLight.position.set(
        Config.DIRECTIONAL_LIGHT_POS_X,
        Config.DIRECTIONAL_LIGHT_POS_Y,
        Config.DIRECTIONAL_LIGHT_POS_Z
    );
    directionalLight.castShadow = true; // Keep shadows enabled (can be configured later)
    // Configure shadow properties if needed (using defaults for now)
    // directionalLight.shadow.mapSize.width = 2048; // Example
    // directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Spatial Grid (Choose a cell size)
    const gridCellSize = 25; // Example cell size
    console.log(`Initializing Spatial Grid with cell size ${gridCellSize}...`);
    spatialGrid = new SpatialGrid(gridCellSize);

    // Enemy Manager (Needs scene and spatialGrid)
    console.log('Initializing Enemy Manager...');
    enemyManager = new EnemyManager(scene, spatialGrid); // Pass spatialGrid

    // Chunk Manager (Needs scene, enemyManager, and spatialGrid)
    console.log('Initializing Chunk Manager...');
    chunkManager = new ChunkManager(scene, enemyManager, spatialGrid); // Pass enemyManager and spatialGrid

    // Initial chunk loading will happen in the first animation frame update

    // Particle Manager (Needs scene)
    console.log('Initializing Particle Manager...');
    particleManager = new ParticleManager(scene);

    // Controls - Setup Player Controls (Pointer Lock)
    setupPlayerControls(renderer.domElement);
    console.log('Player controls initialized.');

    // Player Character
    // console.log('Adding player character...'); // Removed log
    const playerModelData = createPlayerCharacter(); // Returns { characterGroup, leftArmGroup, ... }
    player = {
        model: playerModelData.characterGroup, // Reference to the THREE.Group
        modelParts: playerModelData,          // Keep the parts reference for animation
        currentSpeed: Config.PLAYER_SPEED,    // Initialize current speed
        // Add other player-specific state here if needed later (e.g., health, status)
    };
    // Adjust initial position - needs to be high enough to be above potential terrain
    // The character model's origin is at the torso center.
    player.model.position.set(0, 10, 5); // x=0, y=10 (above ground), z=5 (slightly forward)
    scene.add(player.model); // Add the model group to the scene
    console.log('Player character initialized with speed:', player.currentSpeed);
    // console.log('Player character group added to scene at:', player.model.position); // Removed log
    // console.log('[DEBUG] Player initial position:', player.model.position.toArray().map(p => p.toFixed(2)).join(', ')); // Removed log


    // UI Elements
    scoreElement = document.getElementById('scoreDisplay');
    gameOverElement = document.getElementById('gameOverDisplay');
    titleScreenElement = document.getElementById('titleScreen');
    startButtonElement = document.getElementById('startButton');

    if (!scoreElement) console.error("Score display element not found!");
    if (!gameOverElement) console.error("Game Over display element not found!");
    if (!titleScreenElement) console.error("Title screen element not found!");
    if (!startButtonElement) console.error("Start button element not found!");
    // Loading elements checked above

    // --- Initial UI State Setup (Post-Loading) ---
    // Hide all non-loading UI initially
    if (scoreElement) scoreElement.style.display = 'none';
    if (gameOverElement) gameOverElement.style.display = 'none';
    if (titleScreenElement) titleScreenElement.style.display = 'none'; // Keep hidden until loading finishes

    // --- Initial Chunk Loading ---
    console.log("Starting initial chunk loading process...");
    const progressCallback = (loadedCount, totalCount) => {
        const percentage = totalCount > 0 ? (loadedCount / totalCount) * 100 : 0;
        if (progressBarElement) {
            progressBarElement.style.width = `${percentage}%`;
        }
        if (progressTextElement) {
            progressTextElement.textContent = `Loading... ${percentage.toFixed(0)}%`;
        }
        // console.log(`Loading progress: ${loadedCount}/${totalCount} (${percentage.toFixed(1)}%)`); // Optional detailed log
    };

    // Await the completion of initial chunk loading
    await chunkManager.loadInitialChunks(progressCallback);

    console.log("Initial chunk loading finished.");

    // --- Post-Loading UI Setup ---
    if (loadingScreenElement) loadingScreenElement.style.display = 'none'; // Hide loading screen
    if (titleScreenElement) titleScreenElement.style.display = 'flex'; // Show title screen
    gameState = 'title'; // Transition to title screen state
    console.log("Game state set to 'title'.");

    // Add listener to start button AFTER loading is done and title screen is shown
    if (startButtonElement) {
        startButtonElement.addEventListener('click', startGame);
    }

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);

    console.log('Initialization complete. Starting animation loop.'); // Keep this log

    // --- Start the animation loop ONLY AFTER init (including loading) is done ---
    animate();
}

function onWindowResize() {
    // console.log('Window resized'); // Removed log
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    // console.log("[SUPER DEBUG] Entering animate function!"); // Removed log
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // --- Game State Logic ---
    if (gameState === 'playing') {
        // --- Update Player ---
        if (player && player.model) { // Check for player.model now
            updatePlayer(player, deltaTime, elapsedTime); // Pass the whole player object
        }

        // --- Update Chunk Manager ---
        if (chunkManager && player && player.model) { // Check for player.model
             chunkManager.update(player.model.position); // Use player.model.position
        } else if (chunkManager) {
            chunkManager.update(camera.position); // Fallback
        }

        // --- Update Enemy Manager ---
        if (enemyManager && player && player.model) { // Check for player.model
            // Pass elapsedTime for animation
            enemyManager.update(player.model.position, deltaTime, elapsedTime); // Use player.model.position
        }

        // --- Update Particle Manager ---
        if (particleManager && player && player.model) {
            particleManager.update(deltaTime, player.model.position);
        }

        // --- Check Collisions (Before Rendering) ---
        // Pass enemyManager to checkCollisions
        if (player && player.model && chunkManager && enemyManager) { // Check for player.model
            checkCollisions(player.model.position, enemyManager); // Use player.model.position
            // If checkCollisions sets gameState to 'gameOver', the next frame will handle it
        }

        // --- Animate Collectibles (Coins) ---
        if (chunkManager) {
            // Use the new method to get only collectible meshes
            const activeCollectibles = chunkManager.getActiveCollectibleMeshes();
            activeCollectibles.forEach(collectibleMesh => {
                // Only spin coins for now
                if (collectibleMesh.userData.objectType === 'coin') {
                    collectibleMesh.rotation.y += Config.COIN_SPIN_SPEED * deltaTime;
                }
            });
        }
    } else if (gameState === 'gameOver') {
        // Game is over, potentially add specific game over animations or effects here
        // Currently, just stops updates and waits for restart
    } else if (gameState === 'title') {
        // Title screen is showing, potentially add background animations or effects here
    } else if (gameState === 'loading') {
        // Loading screen is showing. Render a simple scene or just the background.
        // We might not even need an explicit render here if the overlay covers everything.
        // However, rendering ensures the canvas is cleared if needed.
        renderer.render(scene, camera); // Render background/fog while loading
        return; // Skip game updates during loading
    }

    // Render the scene (only if not in 'loading' state, handled above)
    renderer.render(scene, camera);

    // Removed resetMouseDelta() call
}

// --- Start Game Function ---
function startGame() {
    console.log("Starting game...");
    gameState = 'playing';

    if (titleScreenElement) titleScreenElement.style.display = 'none';
    if (scoreElement) {
        score = 0; // Reset score
        scoreElement.textContent = `Score: ${score}`;
        scoreElement.style.display = 'block'; // Show score
    }
    if (gameOverElement) gameOverElement.style.display = 'none'; // Ensure game over is hidden

    // Reset player state if needed (currently handled by page reload on restart)
    // player.model.position.set(0, 10, 5);
    // player.currentSpeed = Config.PLAYER_SPEED;
    // player.model.rotation.y = 0;
    // player.model.rotation.z = 0;

    // Ensure controls are active (Pointer Lock might need re-requesting if lost)
    // setupPlayerControls(renderer.domElement); // Re-setup might be needed depending on implementation

    // Remove restart listener if it exists from a previous game over
    window.removeEventListener('keydown', handleRestartKey);
}


// --- Player Update Logic ---
// Helper vectors for movement calculation
const forwardVector = new THREE.Vector3(0, 0, -1);
const playerDirection = new THREE.Vector3();
const playerQuaternion = new THREE.Quaternion(); // To get direction accurately

// Update function now accepts the whole player object
function updatePlayer(playerObj, deltaTime, elapsedTime) {
    const playerModel = playerObj.model; // Convenience reference to the THREE.Group
    const playerParts = playerObj.modelParts; // Convenience reference to animatable parts

    // --- Update Speed (Uncapped) ---
    playerObj.currentSpeed += Config.PLAYER_SPEED_INCREASE_RATE * deltaTime;
    // console.log(`[DEBUG] Player speed increased to: ${playerObj.currentSpeed.toFixed(2)}`); // Optional debug log

    // 1. Calculate Rotation Deltas
    let keyRotationDelta = 0;
    if (keyLeftPressed) {
        keyRotationDelta += Config.PLAYER_KEY_TURN_SPEED * deltaTime;
    }
    if (keyRightPressed) {
        keyRotationDelta -= Config.PLAYER_KEY_TURN_SPEED * deltaTime;
    }

    // Removed mouseRotationDelta calculation

    // Calculate total rotation applied this frame (only keyboard)
    const totalRotationDelta = keyRotationDelta;

    // Apply total rotation
    playerModel.rotation.y += totalRotationDelta; // Apply to playerModel

    // 2. Handle Tilting (Roll) based on TOTAL rotation speed
    // Avoid division by zero if deltaTime is 0
    const totalRotationRate = (deltaTime > 0) ? totalRotationDelta / deltaTime : 0;
    const targetTilt = -totalRotationRate * Config.PLAYER_TILT_FACTOR; // Target tilt based on total rotation speed
    // Smoothly interpolate towards the target tilt
    const tiltSmoothingFactor = 1.0 - Math.pow(Config.PLAYER_TILT_SMOOTHING, deltaTime);
    playerModel.rotation.z = THREE.MathUtils.lerp(playerModel.rotation.z, targetTilt, tiltSmoothingFactor); // Apply to playerModel

    // 3. Animate Limbs
    // Calculate dynamic animation speed factor, capped by config
    const speedRatio = playerObj.currentSpeed / Config.PLAYER_SPEED;
    const cappedSpeedFactor = Math.min(speedRatio, Config.PLAYER_MAX_ANIMATION_SPEED_FACTOR);
    const dynamicAnimSpeed = Config.PLAYER_ANIMATION_BASE_SPEED * cappedSpeedFactor;
    animatePlayerCharacter(playerParts, elapsedTime, dynamicAnimSpeed); // Pass playerParts and capped dynamic speed

    // 4. Move Forward (in the direction the player is facing)
    const moveDistance = playerObj.currentSpeed * deltaTime; // Use playerObj.currentSpeed
    // Get player's current orientation
    playerModel.getWorldQuaternion(playerQuaternion); // Get from playerModel
    // Calculate forward direction based on orientation
    playerDirection.copy(forwardVector).applyQuaternion(playerQuaternion).normalize();
    // Apply movement
    playerModel.position.addScaledVector(playerDirection, moveDistance); // Apply to playerModel

    // 5. Terrain Following (using two rays)
    if (chunkManager) {
        const currentPosition = playerModel.position; // Use playerModel.position
        // console.log(`[DEBUG] Player pos before terrain check: Y=${currentPosition.y.toFixed(2)}`); // Removed log
        const nearbyMeshes = chunkManager.getTerrainMeshesNear(currentPosition); // Use playerModel.position
        let highestGroundY = -Infinity; // Default to very low
        let groundFound = false;

        // Ray 1: Front
        const rayOriginFront = new THREE.Vector3(
            currentPosition.x,
            currentPosition.y + Config.PLAYER_RAYCAST_ORIGIN_OFFSET,
            currentPosition.z - Config.PLAYER_RAYCAST_STRIDE_OFFSET
        );
        raycaster.set(rayOriginFront, downVector);
        const intersectsFront = raycaster.intersectObjects(nearbyMeshes);
        if (intersectsFront.length > 0) {
            highestGroundY = Math.max(highestGroundY, intersectsFront[0].point.y);
            groundFound = true;
        }

        // Ray 2: Back
        const rayOriginBack = new THREE.Vector3(
            currentPosition.x,
            currentPosition.y + Config.PLAYER_RAYCAST_ORIGIN_OFFSET,
            currentPosition.z + Config.PLAYER_RAYCAST_STRIDE_OFFSET
        );
        raycaster.set(rayOriginBack, downVector);
        const intersectsBack = raycaster.intersectObjects(nearbyMeshes);
        if (intersectsBack.length > 0) {
            highestGroundY = Math.max(highestGroundY, intersectsBack[0].point.y);
            groundFound = true;
        }

        // Set player Y position based on highest ground found
        if (groundFound) {
            playerModel.position.y = highestGroundY + Config.PLAYER_HEIGHT_OFFSET; // Apply to playerModel
            // console.log(`[DEBUG] Player pos after terrain check (found): Y=${playerModel.position.y.toFixed(2)}`); // Removed log
        } else {
            // No ground found below either ray (keep logging for now)
            // console.warn(`[DEBUG] No ground intersection found below player stride at X=${currentPosition.x.toFixed(1)}, Z=${currentPosition.z.toFixed(1)}`); // Removed log
            // Optional: Implement falling physics
            // playerModel.position.y -= 9.8 * deltaTime * deltaTime;
        }
    }

    // 6. Camera Following
    updateCameraFollow(playerObj, deltaTime); // Pass the whole player object
}

// --- Collision Detection ---
const playerCollisionRadius = Config.PLAYER_TORSO_WIDTH; // Use a slightly larger radius for safety

// Placeholder radii for obstacles (adjust as needed, or switch to bounding boxes later)
const obstacleRadii = {
    rock_small: 1.0,
    rock_large: 2.5,
    tree_pine: 1.5, // Trunk radius
    log_fallen: 1.0, // Radius of the log cylinder
    cabin_simple: 5.0, // Approximate radius covering the cabin
};

// Placeholder radii/sizes for enemies (updated for blocky models)
const enemyCollisionSizes = {
    // Use approximate bounding box dimensions from create...Model functions
    bear: { width: 1.8, depth: 3.0 },     // Based on torso size in createBearModel
    squirrel: { width: 0.8, depth: 1.5 }, // Based on torso size in createSquirrelModel (now dog-sized)
    deer: { width: 1.2, depth: 2.8 }      // Based on torso size in createDeerModel
};


function checkCollisions(playerPosition, enemyManager) { // enemyManager might not be needed directly anymore
    if (gameState !== 'playing' || !spatialGrid) return; // Only check collisions during 'playing' state

    // --- Query Spatial Grid for Nearby Objects ---
    const nearbyObjects = spatialGrid.queryNearby(playerPosition);
    // console.log(`[Collision Check] Found ${nearbyObjects.size} nearby objects to check.`);

    // --- Process Nearby Objects ---
    // Convert Set to Array for easier backward iteration for collectibles
    const nearbyArray = Array.from(nearbyObjects);

    // Check Collectibles first (iterating backwards for safe removal)
    for (let i = nearbyArray.length - 1; i >= 0; i--) {
        const mesh = nearbyArray[i];
        if (!mesh || !mesh.userData) continue; // Skip if mesh or userData is missing

        // Check if it's a collectible (coin)
        if (mesh.userData.objectType === 'coin' && !mesh.userData.collidable) {
            const dx = playerPosition.x - mesh.position.x;
            const dz = playerPosition.z - mesh.position.z;
            const distanceSq = dx * dx + dz * dz;

            const coinCollisionRadius = Config.COIN_RADIUS;
            const collisionThresholdSq = (playerCollisionRadius + coinCollisionRadius) ** 2;

            if (distanceSq < collisionThresholdSq) {
                const { chunkKey, objectIndex, scoreValue } = mesh.userData;
                // Use chunkManager to handle collection logic (removes from scene, grid, etc.)
                const collected = chunkManager.collectObject(chunkKey, objectIndex);

                if (collected) {
                    score += scoreValue || 0;
                    if (scoreElement) scoreElement.textContent = `Score: ${score}`;
                    console.log(`Collectible collected! Score: ${score}`);
                    // Remove from our temporary array to avoid re-checking as obstacle/enemy
                    nearbyArray.splice(i, 1);
                }
            }
        }
    }

    // Now check remaining nearby objects for obstacles and enemies
    for (const mesh of nearbyArray) { // Iterate through what's left
        if (!mesh || !mesh.userData) continue;

        const dx = playerPosition.x - mesh.position.x;
        const dz = playerPosition.z - mesh.position.z;
        const distanceSq = dx * dx + dz * dz;

        // Check if it's an Obstacle (collidable but not an enemy)
        if (mesh.userData.collidable && !mesh.userData.enemyInstance) {
            const obstacleType = mesh.userData.objectType;
            const obstacleRadius = (obstacleRadii[obstacleType] || 1.0) * mesh.scale.x; // Use defined radius, scaled
            const collisionThresholdSqObstacle = (playerCollisionRadius + obstacleRadius) ** 2;

            if (distanceSq < collisionThresholdSqObstacle) {
                console.log(`Collision detected with obstacle: ${obstacleType}`);
                handleGameOver();
                return; // Stop checking collisions once game is over
            }
        }
        // Check if it's an Enemy
        else if (mesh.userData.enemyInstance) {
            const enemyType = mesh.userData.enemyInstance.type;
            let enemyRadius = 0.5; // Default small radius

            if (enemyCollisionSizes[enemyType]) {
                if (enemyCollisionSizes[enemyType].radius) {
                    enemyRadius = enemyCollisionSizes[enemyType].radius;
                } else if (enemyCollisionSizes[enemyType].width && enemyCollisionSizes[enemyType].depth) {
                    enemyRadius = (enemyCollisionSizes[enemyType].width + enemyCollisionSizes[enemyType].depth) / 4;
                }
            }

            const collisionThresholdSqEnemy = (playerCollisionRadius + enemyRadius) ** 2;

            if (distanceSq < collisionThresholdSqEnemy) {
                console.log(`Collision detected with enemy: ${enemyType}`);
                handleGameOver();
                return; // Stop checking collisions once game is over
            }
        }
        // Else: It was a non-collidable object (like a collected coin already handled) or unknown
    }
}

function handleGameOver() {
    if (gameState !== 'playing') return; // Prevent multiple triggers if already game over

    gameState = 'gameOver';
    console.log("GAME OVER!");

    // Display Game Over message
    if (gameOverElement) {
        // Use innerHTML to allow line breaks
        gameOverElement.innerHTML = `GAME OVER!<br>Final Score: ${score}<br>(Press R to Restart)`;
        gameOverElement.style.display = 'flex'; // Show using flex (matches CSS)
    }

    // Add restart listener (simple example)
    // Consider moving this to controlsSetup or a dedicated input manager later
    window.addEventListener('keydown', handleRestartKey, { once: true }); // Listen only once
}

function handleRestartKey(event) {
    if (event.key.toLowerCase() === 'r' && gameState === 'gameOver') {
        console.log("Restarting game...");
        // Simple restart: Reload the page
        window.location.reload();
    } else if (gameState === 'gameOver') {
        // If another key was pressed while game over, re-add the listener
         window.addEventListener('keydown', handleRestartKey, { once: true });
    }
}


// --- Camera Follow Logic --- (Restored)
// Use config values for offsets and smoothing
const baseCameraOffset = new THREE.Vector3(
    Config.CAMERA_FOLLOW_OFFSET_X,
    Config.CAMERA_FOLLOW_OFFSET_Y,
    Config.CAMERA_FOLLOW_OFFSET_Z
);
const cameraLookAtOffset = new THREE.Vector3(0, Config.CAMERA_LOOK_AT_OFFSET_Y, 0);
const rotatedCameraOffset = new THREE.Vector3(); // To store the rotated offset

// Update function now accepts the whole player object
function updateCameraFollow(playerObj, deltaTime) {
    const playerModel = playerObj.model; // Get the model group
    const playerPosition = playerModel.position;
    const playerRotation = playerModel.rotation; // Use Euler rotation for simplicity here

    // Calculate desired camera position based on player rotation
    // Start with the base offset
    rotatedCameraOffset.copy(baseCameraOffset);
    // Apply the player's Y rotation to the offset vector
    rotatedCameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation.y);
    // Calculate the target position
    const targetCameraPosition = playerPosition.clone().add(rotatedCameraOffset);

    // Smoothly interpolate camera position using frame-rate independent smoothing
    const smoothFactor = 1.0 - Math.pow(Config.CAMERA_SMOOTHING_FACTOR, deltaTime);
    camera.position.lerp(targetCameraPosition, smoothFactor);

    // Calculate target lookAt point (remains relative to player's base position)
    const targetLookAt = playerPosition.clone().add(cameraLookAtOffset);

    // Make camera look at the target point
    camera.lookAt(targetLookAt);
    // console.log(`[DEBUG] Camera Pos: ${camera.position.toArray().map(p => p.toFixed(1)).join(', ')}, Target: ${targetLookAt.toArray().map(p => p.toFixed(1)).join(', ')}`); // Removed log
}


// --- Start the application ---
// Call init() which now handles loading and starting animate()
try {
    init(); // init is now async, but we don't need to await it here at the top level
    // animate() is called inside init() after loading completes
    console.log('Application initialization sequence started.'); // Keep this log
} catch (error) {
    console.error("Error during initialization:", error); // Keep error log
    // Display error to user?
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '10px';
    errorDiv.style.left = '10px';
    errorDiv.style.padding = '10px';
    errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    errorDiv.style.color = 'white';
    errorDiv.style.fontFamily = 'monospace';
    errorDiv.textContent = `Error: ${error.message}\nCheck console for details.`;
    document.body.appendChild(errorDiv);
}

// console.log('main.js loaded'); // Removed log
