// js/main.js
import * as THREE from 'three';
import { ChunkManager } from './chunkManager.js';
import { EnemyManager } from './enemyManager.js'; // Import EnemyManager
import { SpatialGrid } from './spatialGrid.js'; // Import SpatialGrid
import { ParticleManager } from './particleManager.js'; // Import ParticleManager
// Import new controls setup (including key states)
import { setupPlayerControls, keyLeftPressed, keyRightPressed, mouseLeftPressed, mouseRightPressed } from './controlsSetup.js'; // Added mouseLeftPressed, mouseRightPressed
import { createPlayerCharacter, animatePlayerCharacter } from './playerCharacter.js';
import * as GlobalConfig from './config.js'; // Renamed import
// Import audio functions
import * as AudioManager from './audioManager.js';
import { initScene, handleResize } from './sceneSetup.js';
import * as LevelManager from './levelManager.js'; // Import LevelManager
import { GameStates, getCurrentState, setGameState } from './gameStateManager.js';
import { initPlayerController, updatePlayer as updatePlayerController } from './playerController.js'; // Renamed import
import { initCollisionManager, checkCollisions as checkCollisionsController } from './collisionManager.js';
import * as UIManager from './uiManager.js';
import { showLevelSelectScreen, hideLevelSelectScreen, populateLevelSelect } from './uiManager.js'; // Add level select UI functions
import * as AssetManager from './assetManager.js'; // Import Asset Manager namespace
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
let currentLevelConfig = null; // Holds the config of the currently loaded level

// UI Element references are managed by uiManager.js
let atmosphericElements = []; // For things like circling buzzards
// let gameState = 'loading'; // Removed: Handled by gameStateManager
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);
const windDirection = new THREE.Vector3(0.5, 0, 0.2).normalize(); // Example: Wind blowing mostly along positive X, slightly positive Z
const tumbleweedSpeed = 8.0; // Base speed multiplier for tumbleweeds
const tumbleweedRaycaster = new THREE.Raycaster(); // Separate raycaster for tumbleweeds

// Make init async to handle await for loading
// --- Global Key Handler ---
function handleGlobalKeys(event) {
    const currentState = getCurrentState();

    // Level Select Key ('l') - Only works from Title Screen
    if (event.key.toLowerCase() === 'l' && currentState === GameStates.TITLE) {
        console.log("Level select triggered.");
        setGameState(GameStates.LEVEL_SELECT);
        UIManager.hideTitleScreen();
        UIManager.showLevelSelectScreen();

        // Populate the list
        const availableLevels = LevelManager.getAvailableLevels();
        UIManager.populateLevelSelect(availableLevels, selectLevelAndStart);

        // Optional: Add listener for 'Escape' or a back button to return to title
        // window.addEventListener('keydown', handleLevelSelectKeys, { once: true });
    }

    // Add other global keys here if needed (e.g., pause, mute)
}


// --- Game Logic Functions (Defined before init) ---

// Handle restart key press
function handleRestartKey(event) {
    if (event.key.toLowerCase() === 'r' && getCurrentState() === GameStates.GAME_OVER) {
        console.log("Restarting game...");
        window.location.reload();
    } else if (getCurrentState() === GameStates.GAME_OVER) {
        window.addEventListener('keydown', handleRestartKey, { once: true });
    }
}

// Update scene appearance based on level config
function updateSceneAppearance(levelConfig) {
    if (scene && levelConfig) {
        scene.background = new THREE.Color(levelConfig.SCENE_BACKGROUND_COLOR);
        scene.fog = new THREE.Fog(levelConfig.SCENE_FOG_COLOR, levelConfig.SCENE_FOG_NEAR, levelConfig.SCENE_FOG_FAR);
        const ambient = scene.getObjectByProperty('isAmbientLight', true);
        if (ambient) {
            ambient.color.setHex(levelConfig.AMBIENT_LIGHT_COLOR);
            ambient.intensity = levelConfig.AMBIENT_LIGHT_INTENSITY;
        }
        const directional = scene.getObjectByProperty('isDirectionalLight', true);
        if (directional) {
            directional.color.setHex(levelConfig.DIRECTIONAL_LIGHT_COLOR);
            directional.intensity = levelConfig.DIRECTIONAL_LIGHT_INTENSITY;
            directional.position.set(
                 levelConfig.DIRECTIONAL_LIGHT_POS_X,
                 levelConfig.DIRECTIONAL_LIGHT_POS_Y,
                 levelConfig.DIRECTIONAL_LIGHT_POS_Z
            );
        }
    }
}

// Select Level and Start Game
async function selectLevelAndStart(levelId) {
    isTransitioning = false;
    console.log(`Attempting to start level: ${levelId}`);
    if (isTransitioning) {
        console.warn("Already transitioning, cannot start new level yet.");
        return;
    }
    isTransitioning = true;

    UIManager.hideTitleScreen();
    setGameState(GameStates.LOADING_LEVEL);
    UIManager.showLoadingScreen(`Loading ${levelId}...`);

    LevelManager.unloadCurrentLevel();
    AssetManager.disposeLevelAssets();
    chunkManager.clearAllChunks();
    atmosphericElements.forEach(element => scene.remove(element));
    atmosphericElements = [];

    const levelLoaded = await LevelManager.loadLevel(levelId);
    if (!levelLoaded) {
        console.error(`Failed to load selected level ${levelId}. Returning to title.`);
        UIManager.hideLoadingScreen();
        UIManager.displayError(`Failed to load level: ${levelId}`);
        UIManager.showTitleScreen();
        setGameState(GameStates.TITLE);
        isTransitioning = false;
        return;
    }
    const newLevelConfig = LevelManager.getCurrentConfig();
    currentLevelConfig = newLevelConfig;

    await AssetManager.initLevelAssets(newLevelConfig);

    if (levelId === 'level2') { 
        console.log("Adding atmospheric buzzards for level 2...");
        const numBuzzards = 4; 
        const circleRadius = 150;
        const buzzardAltitude = 80;
        for (let i = 0; i < numBuzzards; i++) {
            const buzzard = AssetManager.createBuzzardModel();
            if (buzzard) {
                const angleOffset = (Math.PI * 2 / numBuzzards) * i;
                const buzzardX = Math.cos(angleOffset) * circleRadius;
                const buzzardZ = Math.sin(angleOffset) * circleRadius;
                buzzard.position.set(buzzardX, buzzardAltitude, buzzardZ);
                scene.add(buzzard);
                atmosphericElements.push(buzzard);
            }
        }
    }

    updateSceneAppearance(newLevelConfig);
    chunkManager.setLevelConfig(newLevelConfig);

    player.model.position.set(0, 10, 5);
    player.model.rotation.set(0, 0, 0);
    player.currentSpeed = GlobalConfig.PLAYER_SPEED;
    score = 0;
    UIManager.updateScore(score);

    const progressCallback = (loaded, total) => UIManager.updateLoadingProgress(loaded, total);
    await chunkManager.loadInitialChunks(progressCallback);

    UIManager.hideLoadingScreen();
    UIManager.showGameScreen();
    setGameState(GameStates.PLAYING);
    isTransitioning = false;

    setupPlayerControls(renderer.domElement);
    window.removeEventListener('keydown', handleRestartKey);
    AudioManager.initAudio();

    console.log(`Level ${levelId} started successfully.`);
}

// Start Game Function
function startGame() {
    console.log("Start button clicked. Starting default level...");
    selectLevelAndStart('level1');
}

// Callback function for the start button click
function handleStartButtonClick() {
    AudioManager.playButtonClickSound();
    startGame();
}

// Handle Game Over state
function handleGameOver(setGameStateFunc) {
    if (getCurrentState() !== GameStates.PLAYING) return;

    setGameStateFunc(GameStates.GAME_OVER);
    console.log("GAME OVER!");

    AudioManager.playCollisionSound();
    AudioManager.playGameOverSound();

    UIManager.showGameOverScreen(score);

    window.addEventListener('keydown', handleRestartKey, { once: true });
}


async function init() {
    console.log('Initializing scene...'); // Keep this log

    // --- Initialize UI Manager ---
    // This gets element references and sets initial visibility
    const uiInitialized = UIManager.initUIManager();
    if (!uiInitialized) {
        console.error("UI Manager failed to initialize. Stopping.");
        return; // Stop if essential UI elements are missing
    }

    // --- Load Initial Level Configuration ---
    const initialLevelId = 'level1'; // Start with Level 1 (using string ID)
    const levelLoaded = await LevelManager.loadLevel(initialLevelId);
    if (!levelLoaded) {
        console.error(`Failed to load initial level '${initialLevelId}'. Stopping.`); // Log string ID
        UIManager.displayError("Failed to load level data."); // Show error via UI
        return;
    }
    const levelConfig = LevelManager.getCurrentConfig();

    // --- Initialize Asset Manager with Level Config ---
    // This loads assets specific to the loaded level
    await AssetManager.initLevelAssets(levelConfig); // Assuming this might become async if loading models

    // --- Initialize Scene, Camera, Renderer, Lighting using Level Config ---
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Canvas element #gameCanvas not found!");
        return;
    }
    // Pass levelConfig to initScene
    const sceneComponents = initScene(canvas, levelConfig);
    scene = sceneComponents.scene;
    camera = sceneComponents.camera;
    renderer = sceneComponents.renderer;

    // Spatial Grid (Choose a cell size)
    const gridCellSize = 25; // Example cell size
    spatialGrid = new SpatialGrid(gridCellSize);

    // Enemy Manager (Needs scene and spatialGrid)
    enemyManager = new EnemyManager(scene, spatialGrid); // Pass spatialGrid

    // Chunk Manager (Needs scene, enemyManager, and spatialGrid)
    // Pass initial levelConfig to ChunkManager constructor
    chunkManager = new ChunkManager(scene, enemyManager, spatialGrid, levelConfig);

    // Initial chunk loading will happen in the first animation frame update

    // Particle Manager (Needs scene)
    particleManager = new ParticleManager(scene);

    // Initialize Player Controller (needs raycaster)
    initPlayerController(raycaster);

    // Initialize Collision Manager (needs grid, chunkManager, and callbacks)
    initCollisionManager(
        spatialGrid,
        chunkManager,
        (value) => { // Score update callback
            score += value;
            UIManager.updateScore(score); // Update score via UI Manager
            // Check for level transition condition
            // Check for level transition condition (using string IDs)
            if (LevelManager.getCurrentLevelId() === 'level1' && score >= 300 && getCurrentState() === GameStates.PLAYING) {
                 triggerLevelTransition('level2'); // Trigger transition to level 2 (using string ID)
            }
        },
        () => { // Game over callback
            handleGameOver(setGameState); // Pass the setGameState function
        }
    );
    // Controls - Setup Player Controls (Pointer Lock)
    setupPlayerControls(renderer.domElement);

    // Player Character
    // console.log('Adding player character...'); // Removed log
    const playerModelData = createPlayerCharacter(); // Returns { characterGroup, leftArmGroup, ... }
    player = {
        model: playerModelData.characterGroup, // Reference to the THREE.Group
        modelParts: playerModelData,          // Keep the parts reference for animation
        currentSpeed: GlobalConfig.PLAYER_SPEED,    // Use GlobalConfig
        // Add other player-specific state here if needed later (e.g., health, status)
    };
    // Adjust initial position - needs to be high enough to be above potential terrain
    // The character model's origin is at the torso center.
    player.model.position.set(0, 10, 5); // x=0, y=10 (above ground), z=5 (slightly forward)
    scene.add(player.model); // Add the model group to the scene
    // console.log('Player character group added to scene at:', player.model.position); // Removed log
    // console.log('[DEBUG] Player initial position:', player.model.position.toArray().map(p => p.toFixed(2)).join(', ')); // Removed log


    // UI Elements are now managed by UIManager
    // References obtained during UIManager.initUIManager()

    // Initial UI state (hiding game elements) is handled in UIManager.initUIManager()

    // --- Initial Chunk Loading ---
    const progressCallback = (loadedCount, totalCount) => {
        // Update progress via UI Manager
        UIManager.updateLoadingProgress(loadedCount, totalCount);
    };

    // Await the completion of initial chunk loading
    await chunkManager.loadInitialChunks(progressCallback);

    // --- Post-Loading UI Setup ---
    UIManager.hideLoadingScreen();
    UIManager.showTitleScreen();
    setGameState(GameStates.TITLE); // Transition to title screen state
    // console.log("Game state set to 'title'."); // Logged by gameStateManager

    // Setup start button listener via UI Manager

    UIManager.setupStartButton(handleStartButtonClick); // Pass the named function

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', handleGlobalKeys); // Add listener for global keys like level select

    console.log('Initialization complete. Starting animation loop.'); // Keep this log

    // --- Start the animation loop ONLY AFTER init (including loading) is done ---
    animate();
}

function onWindowResize() {
    // Delegate resize handling to the sceneSetup module
    if (camera && renderer) {
        handleResize(camera, renderer);
    }
}

function animate() {
    // console.log("[SUPER DEBUG] Entering animate function!"); // Removed log
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // --- Game State Logic ---
    const currentState = getCurrentState();
    if (currentState === GameStates.PLAYING) {
        // --- Update Player ---
        if (player && player.model) { // Check for player.model now
            // Call the imported player controller update function
            updatePlayerController(player, deltaTime, elapsedTime, chunkManager, updateCameraFollow);
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
        if (player && player.model) { // Check for player.model
            // Call the collision controller
            checkCollisionsController(player.model.position);
            // Game over state is handled internally by the collision manager via callback
        }

        // --- Animate Collectibles (Coins) ---
        if (chunkManager) {
            // Use the new method to get only collectible meshes
            const activeCollectibles = chunkManager.getActiveCollectibleMeshes();
            activeCollectibles.forEach(collectibleMesh => {
                // Only spin coins for now
                if (collectibleMesh.userData.objectType === 'coin') {
                    // Use coin spin speed potentially from level config or global
                    const spinSpeed = currentLevelConfig?.COIN_VISUALS?.spinSpeed ?? GlobalConfig.COIN_SPIN_SPEED ?? 1.0;
                    collectibleMesh.rotation.y += spinSpeed * deltaTime;
                }
            });
        }

        // --- Update Tumbleweed Physics ---
        if (chunkManager && LevelManager.getCurrentLevelId() === 2) { // Only update in Level 2
            const activeCollidables = chunkManager.getActiveCollidableMeshes();
            const terrainMeshes = chunkManager.getTerrainMeshesNear(player?.model?.position || camera.position); // Get nearby terrain for collision checks

            activeCollidables.forEach(mesh => {
                if (mesh.userData.objectType === 'tumbleweed') {
                    // 1. Apply Wind Velocity
                    const velocity = windDirection.clone().multiplyScalar(tumbleweedSpeed * deltaTime);

                    // 2. Terrain Following (Downward Raycast)
                    const tumbleweedPos = mesh.position;
                    const groundRayOrigin = tumbleweedPos.clone().add(new THREE.Vector3(0, 2, 0)); // Start ray slightly above
                    tumbleweedRaycaster.set(groundRayOrigin, downVector);
                    tumbleweedRaycaster.far = 5; // Limit ray distance
                    const groundIntersects = tumbleweedRaycaster.intersectObjects(terrainMeshes);

                    let targetY = tumbleweedPos.y; // Default to current Y
                    if (groundIntersects.length > 0) {
                        targetY = groundIntersects[0].point.y + (mesh.geometry.boundingSphere?.radius || 1.0); // Position base on ground + radius
                    }
                    // Simple gravity/grounding - can be improved with proper physics simulation
                    tumbleweedPos.y = THREE.MathUtils.lerp(tumbleweedPos.y, targetY, 0.1); // Smoothly move towards ground

                    // 3. Collision Detection & Bounce (Forward Raycast - Simplified)
                    const moveDirection = velocity.clone().normalize();
                    const collisionRayOrigin = tumbleweedPos.clone();
                    tumbleweedRaycaster.set(collisionRayOrigin, moveDirection);
                    tumbleweedRaycaster.far = (mesh.geometry.boundingSphere?.radius || 1.0) + 0.5; // Ray slightly longer than radius

                    // Check against other collidables (excluding self) and terrain
                    const otherCollidables = activeCollidables.filter(c => c !== mesh);
                    const collisionCandidates = [...otherCollidables, ...terrainMeshes];
                    const collisionIntersects = tumbleweedRaycaster.intersectObjects(collisionCandidates);

                    if (collisionIntersects.length > 0) {
                        // Simple bounce: Reverse velocity (can be improved with reflection)
                        // console.log("Tumbleweed collision!"); // Debug log
                        velocity.negate().multiplyScalar(0.5); // Lose some speed on bounce
                        // Prevent sticking: Move slightly away from collision point if possible
                        const collisionNormal = collisionIntersects[0].face?.normal || moveDirection.clone().negate(); // Fallback normal
                        tumbleweedPos.addScaledVector(collisionNormal, 0.1);
                    }

                    // 4. Update Position
                    tumbleweedPos.add(velocity);

                    // 5. Update Spatial Grid
                    spatialGrid.update(mesh);

                    // 6. Add Rotation (visual only)
                    mesh.rotation.x += velocity.length() * 0.5 * deltaTime;
                    mesh.rotation.z += velocity.length() * 0.3 * deltaTime;
                }
            });
        }

// Callback function for the start button click
        // --- Animate Atmospheric Elements ---
        if (atmosphericElements.length > 0) {
            const circleRadius = 150; // How far out the buzzards circle
            const circleSpeed = 0.05; // How fast they circle (radians per second)
            const buzzardAltitude = 80; // How high they fly

            atmosphericElements.forEach((buzzard, index) => {
                // Base angle progresses with time, offset per buzzard
                const angleOffset = (Math.PI * 2 / atmosphericElements.length) * index;
                const currentAngle = elapsedTime * circleSpeed + angleOffset;

                // Calculate position relative to player's XZ plane
                const buzzardX = (player?.model?.position.x || 0) + Math.cos(currentAngle) * circleRadius;
                const buzzardZ = (player?.model?.position.z || 0) + Math.sin(currentAngle) * circleRadius;

                buzzard.position.set(buzzardX, buzzardAltitude, buzzardZ);
                // Make buzzard look towards the center (player's rough XZ)
                buzzard.lookAt(player?.model?.position.x || 0, buzzardAltitude - 10, player?.model?.position.z || 0); // Look slightly down towards center
            });
        }





    } else if (currentState === GameStates.GAME_OVER) {
        // Game is over, potentially add specific game over animations or effects here
        // Currently, just stops updates and waits for restart
    } else if (currentState === GameStates.TITLE) {
        // Title screen is showing, potentially add background animations or effects here
    } else if (currentState === GameStates.LEVEL_SELECT) {
        // Level select screen is showing, wait for user input via UI buttons.
        // No game logic updates needed here.

    } else if (currentState === GameStates.LOADING || currentState === GameStates.LEVEL_TRANSITION || currentState === GameStates.LOADING_LEVEL) {
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

// Function moved after selectLevelAndStart definition


// --- Collision Detection (Moved to collisionManager.js) ---
// Constants moved to collisionManager.js
// checkCollisions function moved to collisionManager.js

// Function moved earlier in the file

// Function moved earlier in the file




// --- Level Transition Logic ---

let isTransitioning = false; // Prevent multiple transition triggers

function triggerLevelTransition(nextLevelId) {
    if (isTransitioning || getCurrentState() !== GameStates.PLAYING) {
        return; // Already transitioning or not in a state to transition
    }
    isTransitioning = true;
    console.log(`Triggering transition to level ${nextLevelId}...`);
    setGameState(GameStates.LEVEL_TRANSITION); // Initial transition state
    startLevelTransition(nextLevelId); // Start the async process
}

async function startLevelTransition(nextLevelId) {
    console.log("--- Starting Level Transition ---");

    // 1. Show Loading Screen
    // Dynamically set loading message based on the level ID being loaded
    const levelInfo = LevelManager.getAvailableLevels().find(l => l.id === nextLevelId);
    const loadingMessage = levelInfo ? `Loading ${levelInfo.name}...` : `Loading Level...`;
    UIManager.showLoadingScreen(loadingMessage);

    // 2. Unload Current Level Assets & State
    console.log("Unloading current level...");
    LevelManager.unloadCurrentLevel(); // Clears current config in LevelManager
    AssetManager.disposeLevelAssets(); // Dispose assets managed by AssetManager
    chunkManager.clearAllChunks(); // Clears chunks, including enemy removal via EnemyManager
    // Note: EnemyManager itself doesn't need explicit clearing if enemies are tied to chunks
    // Remove atmospheric elements
    atmosphericElements.forEach(element => scene.remove(element));
    atmosphericElements = [];

    // 3. Set Loading State
    setGameState(GameStates.LOADING_LEVEL);

    // 4. Load New Level Config
    console.log(`Loading level ${nextLevelId} config...`);
    const levelLoaded = await LevelManager.loadLevel(nextLevelId);
    if (!levelLoaded) {
        console.error(`Failed to load level ${nextLevelId}. Transition aborted.`);
        UIManager.displayError("Failed to load next level.");
        // TODO: Potentially revert to a safe state (e.g., title screen or previous level?)
        setGameState(GameStates.TITLE); // Go to title for now
        isTransitioning = false;
        return;
    }
    const newLevelConfig = LevelManager.getCurrentConfig();

    // 5. Initialize New Level Assets
    console.log("Initializing new level assets...");
    await AssetManager.initLevelAssets(newLevelConfig);

    // 5.5 Add Atmospheric Elements (if applicable for the new level)
    // Use string ID for level-specific logic check
    if (nextLevelId === 'level2') { // Specific to Level 2
        console.log("Adding atmospheric buzzards...");
        const numBuzzards = 4; // Example number
        const circleRadius = 150;
        const buzzardAltitude = 80;
        for (let i = 0; i < numBuzzards; i++) {
            const buzzard = AssetManager.createBuzzardModel(); // Assuming no specific properties needed
            if (buzzard) {
                // Position them initially around the circle
                const angleOffset = (Math.PI * 2 / numBuzzards) * i;
                const buzzardX = Math.cos(angleOffset) * circleRadius;
                const buzzardZ = Math.sin(angleOffset) * circleRadius;
                buzzard.position.set(buzzardX, buzzardAltitude, buzzardZ);
                scene.add(buzzard);
                atmosphericElements.push(buzzard);
            }
        }
    }

    // 6. Update Scene Appearance (Fog, Background)
    console.log("Updating scene appearance...");
    updateSceneAppearance(newLevelConfig);

    // 7. Update Chunk Manager with New Config
    chunkManager.setLevelConfig(newLevelConfig);

    // 8. Reset Player State
    console.log("Resetting player state...");
    player.model.position.set(0, 10, 5); // Reset position
    player.model.rotation.set(0, 0, 0); // Reset rotation
    player.currentSpeed = GlobalConfig.PLAYER_SPEED; // Reset speed
    // Reset score (or handle carry-over if needed later)
    score = 0; // Reset score for the new level
    UIManager.updateScore(score);

    // 9. Load Initial Chunks for New Level
    console.log("Loading initial chunks for new level...");
    const progressCallback = (loaded, total) => UIManager.updateLoadingProgress(loaded, total);
    await chunkManager.loadInitialChunks(progressCallback); // Load chunks around new player pos

    // 10. Finalize Transition
    console.log("--- Level Transition Complete ---");
    UIManager.hideLoadingScreen();
    setGameState(GameStates.PLAYING); // Back to playing state
    isTransitioning = false; // Allow future transitions
}

/**
 * Updates scene properties like background and fog based on the level config.
 * Avoids recreating the entire scene object.
 * @param {object} levelConfig
 */


// --- Camera Follow Logic --- (Restored)
// Use config values for offsets and smoothing
const baseCameraOffset = new THREE.Vector3(
    GlobalConfig.CAMERA_FOLLOW_OFFSET_X, // Use GlobalConfig
    GlobalConfig.CAMERA_FOLLOW_OFFSET_Y,
    GlobalConfig.CAMERA_FOLLOW_OFFSET_Z
);
const cameraLookAtOffset = new THREE.Vector3(0, GlobalConfig.CAMERA_LOOK_AT_OFFSET_Y, 0); // Use GlobalConfig
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
    const smoothFactor = 1.0 - Math.pow(GlobalConfig.CAMERA_SMOOTHING_FACTOR, deltaTime); // Use GlobalConfig
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
    // Display error via UI Manager
    UIManager.displayError(error);
}
// console.log('main.js loaded'); // Removed log
