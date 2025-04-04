// js/game.js
import * as THREE from 'three';
import eventBus from './eventBus.js';
import { ChunkManager } from './chunkManager.js';
import { EnemyManager } from './enemyManager.js';
import { SpatialGrid } from './spatialGrid.js';
import { ParticleManager } from './particleManager.js';
import { setupPlayerControls, initInputStateManager, resetInputStates } from './controlsSetup.js';
import { updateMobileControlsVisibility, setDeviceClass } from './utils/deviceUtils.js';
import { grayMaterial, createPlayerCharacter } from './playerCharacter.js';
import * as GlobalConfig from './config.js';
import { performanceManager } from './config.js';
import * as AudioManager from './audioManager.js';
import { initScene, handleResize, createFpsCounter, updateFpsCounter } from './sceneSetup.js';
import * as LevelManager from './levelManager.js';
import { GameStates, getCurrentState, setGameState } from './gameStateManager.js';
import { initPlayerController, updatePlayer as updatePlayerController } from './playerController.js';
import { initCollisionManager, checkCollisions as checkCollisionsController } from './collisionManager.js';
import * as UIManager from './uiManager.js';
import * as AssetManager from './assetManager.js';
import * as ScoreManager from './scoreManager.js';

// Constants for camera transitions
const TITLE_TRANSITION_SPEED = 4.0; // Increased for faster transition
const TITLE_TRANSITION_THRESHOLD_SQ = 0.05; // Squared distance threshold to switch to TITLE state
const TITLE_LOOK_AT_TARGET = new THREE.Vector3(0, 0, 0); // Target for camera lookAt during title

// Constants for gameplay camera transition
const GAMEPLAY_TRANSITION_SPEED = 5.0; // Increased for faster transition
const GAMEPLAY_TRANSITION_THRESHOLD_SQ = 0.2; // Reduced threshold for quicker state change

class Game {
    constructor(canvasElement) {
        if (!canvasElement) {
            throw new Error("Canvas element is required to initialize the game.");
        }
        this.canvas = canvasElement;

        // Core Three.js components
        this.scene = null;           // Main scene (title screen)
        this.gameplayScene = null;   // Gameplay scene (prepared in background)
        this.activeScene = null;     // Currently active scene for rendering
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.initialCameraPosition = new THREE.Vector3();

        // Performance monitoring
        this.fpsCounter = null;
        this.showFps = GlobalConfig.SHOW_FPS;

        // Scene transition properties
        this.isSceneTransitioning = false;
        this.sceneTransitionStartTime = 0;
        this.sceneTransitionDuration = 0.4; // seconds - reduced for faster transitions

        // Managers
        this.assetManager = AssetManager;
        this.audioManager = AudioManager;
        this.chunkManager = null;
        this.collisionChecker = null;
        this.enemyManager = null;
        this.gameStateManager = { getCurrentState, setGameState };
        this.levelManager = LevelManager;
        this.particleManager = null;
        this.playerController = { updatePlayer: updatePlayerController };
        this.spatialGrid = null;
        this.uiManager = UIManager;

        // Game state
        this.player = {
            model: null,
            modelParts: null,
            currentSpeed: 0,
            powerup: '',
        };
        this.score = 0;
        this.currentLevelConfig = null;
        this.playerAnimationTime = 0;
        this.atmosphericElements = [];
        this.isTransitioning = false;
        this.powerupTimer = null;

        // Camera transition properties
        this.isCameraTransitioning = false;
        this.cameraStartPosition = null;
        this.cameraStartQuaternion = null;
        this.cameraTransitionStartTime = 0;
        this.cameraTransitionDuration = 0.8; // seconds - increased for smoother transitions between levels

        // Title Screen Animation
        this.titleCameraDrift = null;

        // Event Bus
        this.eventBus = eventBus;

        // Set up FPS toggle
        document.addEventListener('keydown', (event) => {
            if (event.key === 'f' || event.key === 'F') {
                GlobalConfig.updateConfig('', { SHOW_FPS: !GlobalConfig.getConfig('SHOW_FPS', false) });
                if (this.fpsCounter) {
                    this.fpsCounter.style.display = GlobalConfig.getConfig('SHOW_FPS', false) ? 'block' : 'none';
                }
            }
        });

        console.log("Game class instantiated");
    }

    async init() {
        console.log("Game initialization started...");

        // --- Set Device Class ---
        setDeviceClass();

        // --- Initialize Performance Manager ---
        performanceManager.init();

        // --- Initialize FPS Counter ---
        this.fpsCounter = createFpsCounter();

        // Initialize UI Manager first
        if (!this.uiManager.initUIManager()) {
            return false;
        }

        // --- Load Initial Level Configuration ---
        const initialLevelId = 'level1';
        const levelLoaded = await this.levelManager.loadLevel(initialLevelId);
        if (!levelLoaded) {
            return false;
        }
        this.currentLevelConfig = this.levelManager.getCurrentConfig();

        // --- Initialize Asset Manager ---
        await this.assetManager.initLevelAssets(this.currentLevelConfig);

        // --- Initialize Scene, Camera, Renderer ---
        const sceneComponents = initScene(this.canvas, this.currentLevelConfig);
        this.scene = sceneComponents.scene;
        this.camera = sceneComponents.camera;
        this.renderer = sceneComponents.renderer;
        this.initialCameraPosition.copy(this.camera.position); // Store initial position

        // Set the title scene as the active scene
        this.activeScene = this.scene;

        // --- Initialize Title Camera Drift ---
        this._initializeCameraDrift();

        // --- Initialize Managers ---
        this.spatialGrid = new SpatialGrid(GlobalConfig.GRID_CELL_SIZE);
        this.enemyManager = new EnemyManager(this.scene, this.spatialGrid);
        this.chunkManager = new ChunkManager(this.scene, this.enemyManager, this.spatialGrid, this.currentLevelConfig);
        this.particleManager = new ParticleManager(this.scene);
        this.levelManager.setManagers(this.chunkManager, this.enemyManager);

        // --- Initialize Player Controller ---
        const raycaster = new THREE.Raycaster();
        initPlayerController(raycaster);

        // --- Initialize Collision Manager ---
        initCollisionManager(this.spatialGrid, this.chunkManager);
        this.collisionChecker = checkCollisionsController;

        // --- Create Player ---
        const playerModelData = createPlayerCharacter();
        this.player = {
            model: playerModelData.characterGroup,
            modelParts: playerModelData,
            currentSpeed: GlobalConfig.PLAYER_SPEED,
            powerup: '',
        };
        this.player.model.position.set(0, 10, 5);

        // --- Setup Controls ---
        setupPlayerControls(this.renderer.domElement);
        initInputStateManager(); // Initialize input state manager to handle input resets

        // --- Initialize Audio ---
        this.audioManager.initAudio();

        // --- Initial Chunk Loading & State ---
        this.gameStateManager.setGameState(GameStates.LOADING);
        await this.chunkManager.loadInitialChunks((loaded, total) => {
            this.uiManager.updateLoadingProgress(loaded, total);
        });

        this.gameStateManager.setGameState(GameStates.TITLE);

        // Setup UI Button Listeners
        this.uiManager.setupStartButton(() => this.startGame('level1'));
        this.uiManager.setupBackToTitleButton(() => this.returnToTitle());
        this.uiManager.setupLevelSelectButton(() => this.showLevelSelect());
        this.uiManager.setupPauseMenuButtons(
            () => this.resumeGame(),
            () => this.restartLevel(),
            () => this.returnToTitle()
        );
        this.uiManager.setupGameOverButtons(
            () => this.restartLevel(),
            () => this.returnToTitle()
        );

        // Setup global event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        // Remove any existing keydown listeners to prevent duplicates
        const boundHandleGlobalKeys = this.handleGlobalKeys.bind(this);
        document.removeEventListener('keydown', boundHandleGlobalKeys);
        document.addEventListener('keydown', boundHandleGlobalKeys);

        // Subscribe to events
        this._setupEventSubscriptions();

        console.log("Game initialization complete.");
        return true;
    }

    _setupEventSubscriptions() {
        this.eventBus.subscribe('scoreChanged', (scoreIncrement) => {
            if (this.score + scoreIncrement < 0) {
                 this.score = 0;
            } else {
                 this.score += scoreIncrement;
            }
            console.log(`[Game] Score updated to: ${this.score}`);

            // Get current level ID for high score tracking
            const currentLevelId = this.levelManager.getCurrentLevelId();

            // Emit an event with the current score and level ID for UI updates
            this.eventBus.emit('currentScoreUpdated', {
                score: this.score,
                levelId: currentLevelId
            });

            // Check for level transition
            if (currentLevelId === 'level1' && this.score >= 300 && this.gameStateManager.getCurrentState() === GameStates.PLAYING) {
                 this.eventBus.emit('requestLevelTransition', 'level2');
                 console.log("[Game] Requesting level transition to level2");
            }
        });

        this.eventBus.subscribe('powerupActivated', (powerupType) => {
            this.player.powerup = powerupType;
            console.log(`${powerupType} powerup started!`);

            // give the player some visual indication of the powerup
            const magnetMaterial = new THREE.MeshStandardMaterial({
                color: 0xff0000,      // Bright red
                emissive: 0x330000,   // Subtle red glow
                metalness: 0.9,       // More metallic
                roughness: 0.1        // More shiny
            });

            // Apply to all player meshes
            this.player.modelParts.characterGroup.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = magnetMaterial;
                }
            });

            // Set a timer to clear the powerup
            if (this.powerupTimer) {
                clearTimeout(this.powerupTimer);
            }

            this.powerupTimer = setTimeout(() => {
                this.player.powerup = '';
                console.log(`${powerupType} powerup expired!`);

                // return the character to their original visual style
                this.player.modelParts.characterGroup.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        child.material = grayMaterial;
                    }
                });

            }, GlobalConfig.POWERUP_DURATION * 1000); // Convert seconds to milliseconds
        });

        this.eventBus.subscribe('playerDied', () => this.handleGameOver());

        this.eventBus.subscribe('gameStateChanged', (newState, previousState) => {
            console.log(`[Game] Observed state changed to: ${newState} from ${previousState}`);
            if (newState === GameStates.PLAYING) {
                 this.playerAnimationTime = 0;
            }
            if (newState === GameStates.TITLE) {
                if (this.player.model && this.player.model.parent) {
                    this.player.model.parent.remove(this.player.model);
                }

                // Only re-initialize drift when NOT coming from level select
                if (previousState !== GameStates.LEVEL_SELECT) {
                    console.log("[Game] Re-initializing camera drift for title screen.");
                    this._initializeCameraDrift();
                } else {
                    console.log("[Game] Preserving camera drift from level select.");
                }

                // Make sure level select is properly populated when entering title state
                const availableLevels = this.levelManager.getAvailableLevels();
                this.uiManager.populateLevelSelect(availableLevels, this.startGame.bind(this));
            }
        });

        this.eventBus.subscribe('requestLevelTransition', (levelId) => {
            console.log(`[Game] Received requestLevelTransition event for: ${levelId}`);
            this._loadLevel(levelId);
        });

        // Subscribe to pause/resume events from mobile controls
        this.eventBus.subscribe('requestPause', () => {
            console.log("[Game] Received requestPause event from mobile controls");
            this.pauseGame();
        });

        this.eventBus.subscribe('requestResume', () => {
            console.log("[Game] Received requestResume event from mobile controls");
            this.resumeGame();
        });

        console.log("[Game] Event subscriptions set up.");
    }

    start() {
        console.log("Starting game loop...");
        this.animate();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const deltaTime = Math.min(this.clock.getDelta(), GlobalConfig.MAX_DELTA_TIME);
        const elapsedTime = this.clock.getElapsedTime();
        const currentState = this.gameStateManager.getCurrentState();

        // Update performance monitoring
        performanceManager.updateFps();
        if (this.fpsCounter) {
            updateFpsCounter(this.fpsCounter, performanceManager.getCurrentFps());
        }

        if (currentState === GameStates.PLAYING) {
            this.playerAnimationTime += deltaTime;

            if (this.player.model) {
                // Update player and game elements
                // During camera transitions, we intentionally pass null for the camera follow function
                // because the camera position is being controlled by the transition logic
                const cameraFollowFunc = this.isCameraTransitioning ? null : this.updateCameraFollow.bind(this);
                this.playerController.updatePlayer(this.player, deltaTime, this.playerAnimationTime, this.chunkManager, cameraFollowFunc);

                // Handle camera transition if needed
                if (this.isCameraTransitioning) {
                    this._updateCameraTransition(deltaTime, elapsedTime);
                }
            }

            if (this.chunkManager && this.player.model) {
                this.chunkManager.update(this.player.model.position);
                // Update coins to make them spin and move toward player if magnet powerup is active
                this.chunkManager.updateCollectibles(deltaTime, elapsedTime, this.player.model.position, this.player.powerup);
                // Update tumbleweeds
                this.chunkManager.updateTumbleweeds(deltaTime, elapsedTime, this.player.model.position);
            }
            if (this.enemyManager && this.player.model) {
                this.enemyManager.update(this.player.model.position, deltaTime, elapsedTime);
            }
            if (this.particleManager && this.player.model) {
                this.particleManager.update(deltaTime, this.player.model.position);
            }
            if (this.collisionChecker && this.player.model) {
                this.collisionChecker(this.player);
            }
            this._updateAtmosphericElements(deltaTime, elapsedTime);

        } else if (currentState === GameStates.TITLE || currentState === GameStates.LEVEL_SELECT) {
            // Use the same camera drift for both title and level select screens
            this._updateTitleCamera(deltaTime);
        } else if (currentState === GameStates.TRANSITIONING_TO_TITLE) {
            this._transitionCameraToTitle(deltaTime);
        }

        // Handle scene transition if needed
        if (this.isSceneTransitioning) {
            this._updateSceneTransition(deltaTime, elapsedTime);
        }

        // Ensure player is in the active scene and visible before rendering
        if (this.player && this.player.model && this.activeScene &&
            this.player.model.parent !== this.activeScene &&
            this.gameStateManager.getCurrentState() === GameStates.PLAYING) {

            console.log("[Game] Player not in active scene before render, fixing...");

            // Remove from current parent if any
            if (this.player.model.parent) {
                this.player.model.parent.remove(this.player.model);
            }

            // Add to active scene
            this.activeScene.add(this.player.model);

            // Force visibility
            this.player.model.visible = true;
        }

        // Render the active scene
        if (this.renderer && this.activeScene && this.camera) {
            this.renderer.render(this.activeScene, this.camera);
        }


    }

    // --- Game State/Flow Methods ---

    async startGame(levelId) {
        console.log(`[Game] Starting level: ${levelId}`);
        this.eventBus.emit('uiButtonClicked');

        // Reset input states to prevent any stuck inputs when starting a new game
        resetInputStates();
        console.log("[Game] Input states reset before starting game");

        // Show mobile controls only on mobile devices when game starts
        updateMobileControlsVisibility();

        // 1. Create a new scene for gameplay
        const gameplaySceneComponents = initScene(this.canvas, this.currentLevelConfig);
        this.gameplayScene = gameplaySceneComponents.scene;

        // 2. Store the current camera position for the transition
        this.cameraStartPosition = this.camera.position.clone();
        this.cameraStartQuaternion = this.camera.quaternion.clone();

        // 3. Create new managers for the gameplay scene
        const originalScene = this.scene;
        const originalChunkManager = this.chunkManager;
        const originalEnemyManager = this.enemyManager;
        const originalParticleManager = this.particleManager;
        const originalSpatialGrid = this.spatialGrid;

        // Create new spatial grid and managers for the gameplay scene
        this.scene = this.gameplayScene; // Temporarily set gameplay scene as main scene
        this.spatialGrid = new SpatialGrid(GlobalConfig.GRID_CELL_SIZE);
        this.enemyManager = new EnemyManager(this.gameplayScene, this.spatialGrid);
        this.chunkManager = new ChunkManager(this.gameplayScene, this.enemyManager, this.spatialGrid, this.currentLevelConfig);
        this.particleManager = new ParticleManager(this.gameplayScene);
        this.levelManager.setManagers(this.chunkManager, this.enemyManager);

        // Re-initialize collision manager with the new spatial grid
        initCollisionManager(this.spatialGrid, this.chunkManager);

        // Load the level with the new managers
        await this._loadLevel(levelId);

        // 4. Keep the new managers for gameplay, but restore the original scene for now
        // We'll switch to the gameplay scene during transition
        this.scene = originalScene;

        // 5. Render one frame of the gameplay scene to ensure it's ready
        if (this.renderer && this.gameplayScene && this.camera) {
            // Ensure player is visible before rendering
            if (this.player && this.player.model) {
                // Force player visibility
                this.player.model.visible = true;

                // Make sure player is in the gameplay scene
                if (this.player.model.parent !== this.gameplayScene) {
                    console.log("[Game] Adding player to gameplay scene before first render.");
                    // Remove from current parent if any
                    if (this.player.model.parent) {
                        this.player.model.parent.remove(this.player.model);
                    }
                    this.gameplayScene.add(this.player.model);
                }

                console.log("[Game] Ensuring player is visible before first render.");
            } else {
                console.warn("[Game] Player or player model is null before first render.");
            }

            // Force a render of the gameplay scene
            this.renderer.render(this.gameplayScene, this.camera);
        }

        // 6. Start the scene transition
        this.activeScene = this.gameplayScene; // Switch to gameplay scene
        this.sceneTransitionStartTime = this.clock.getElapsedTime();
        this.isSceneTransitioning = true;
        this.cameraTransitionStartTime = this.clock.getElapsedTime();
        this.isCameraTransitioning = true;

        // 7. Set to PLAYING state
        this.gameStateManager.setGameState(GameStates.PLAYING);
    }

    async _loadLevel(levelId) {
        if (this.isTransitioning) {
            console.warn("[Game] Already transitioning, cannot start new level yet.");
            return;
        }
        this.isTransitioning = true;
        console.log(`[Game] Loading level ${levelId}...`);

        // 1. Don't change the state - keep the current transition state
        // Skip showing loading screen

        // Store the player's current scene parent before removing it
        const playerCurrentParent = this.player.model?.parent;

        // Log player state before transition
        if (this.player.model) {
            console.log(`[Game] Player state before level transition: visible=${this.player.model.visible}, parent=${playerCurrentParent ? 'exists' : 'null'}`);
        } else {
            console.warn("[Game] Player model is null before level transition.");
        }

        // 2. Unload Current Level Assets & State (if necessary)
        console.log("[Game] Unloading current level (if necessary)...");
        if (this.levelManager.getCurrentLevelId()) {
             this.levelManager.unloadCurrentLevel();
             this.chunkManager.clearAllChunks();
             this._clearAtmosphericElements();
             // Don't remove the player model yet - we'll handle it after the new scene is ready
        }

        // 3. Load New Level Config
        console.log(`[Game] Loading level ${levelId} config...`);
        const levelLoaded = await this.levelManager.loadLevel(levelId);
        if (!levelLoaded) {
            console.error(`[Game] Failed to load level config for ${levelId}. Returning to title.`);
            this.gameStateManager.setGameState(GameStates.TITLE);
            this.isTransitioning = false;
            return;
        }
        this.currentLevelConfig = this.levelManager.getCurrentConfig();

        // 4. Initialize New Level Assets
        console.log("[Game] Initializing new level assets...");
        await this.assetManager.initLevelAssets(this.currentLevelConfig);

        // 5. Add Atmospheric Elements (if applicable)
        this._addAtmosphericElements(levelId);

        // 6. Update Scene Appearance
        console.log("[Game] Updating scene appearance...");
        this._updateSceneAppearance(this.currentLevelConfig);

        // 7. Update Chunk Manager with New Config
        this.chunkManager.setLevelConfig(this.currentLevelConfig);

        // 8. Reset Player State & Add to Scene
        console.log("[Game] Resetting player state...");
        if (this.player.model) {
            // Always remove the player from its previous parent if it exists
            // This ensures we don't have the player in multiple scenes
            if (playerCurrentParent) {
                console.log("[Game] Removing player from previous parent.");
                playerCurrentParent.remove(this.player.model);
            }

            // Reset player position and rotation
            this.player.model.position.set(0, 10, 5);
            this.player.model.rotation.set(0, 0, 0);
            this.player.currentSpeed = GlobalConfig.PLAYER_SPEED;

            // CRITICAL FIX: Make sure we're adding the player to the ACTIVE scene
            // This is crucial for level transitions, especially to level 2
            // The activeScene should be the gameplayScene during level transitions
            if (this.activeScene) {
                console.log("[Game] Adding player to the active scene.");
                this.activeScene.add(this.player.model);
            } else {
                console.log("[Game] No active scene, adding player to the current scene.");
                this.scene.add(this.player.model);
            }

            // Force player visibility - critical for level transitions
            this.player.model.visible = true;

            // Force a render to ensure player is visible in the new scene
            if (this.renderer && this.activeScene) {
                console.log("[Game] Forcing a render of the active scene after adding player.");
                this.renderer.render(this.activeScene, this.camera);
            } else if (this.renderer) {
                console.log("[Game] Forcing a render of the current scene after adding player.");
                this.renderer.render(this.scene, this.camera);
            }

            // Log the player's current state for debugging
            console.log(`[Game] Player model reset and added to scene. Visibility: ${this.player.model.visible}, Parent: ${this.player.model.parent ? 'exists' : 'null'}`);
        } else {
            console.error("[Game] Player model is null when trying to reset for new level.");
        }
        const scoreToReset = this.score;
        this.score = 0;
        if (scoreToReset > 0) {
             this.eventBus.emit('scoreChanged', -scoreToReset);
        }
        this.playerAnimationTime = 0;

        // 9. Load Initial Chunks for New Level
        console.log("[Game] Loading initial chunks for new level...");
        // Load chunks silently without updating UI
        await this.chunkManager.loadInitialChunks(() => {});

        // 10. Finalize Transition
        console.log(`[Game] Level ${levelId} loaded successfully.`);

        // Don't change the state here - let the calling function handle state changes
        // This allows for proper sequencing of loading and camera transitions

        this.isTransitioning = false;
    }

    _updateSceneAppearance(levelConfig) {
         if (this.scene && levelConfig) {
             this.scene.background = new THREE.Color(levelConfig.SCENE_BACKGROUND_COLOR);
             this.scene.fog = new THREE.Fog(levelConfig.SCENE_FOG_COLOR, levelConfig.SCENE_FOG_NEAR, levelConfig.SCENE_FOG_FAR);
             const ambient = this.scene.getObjectByProperty('isAmbientLight', true);
             if (ambient) {
                 ambient.color.setHex(levelConfig.AMBIENT_LIGHT_COLOR);
                 ambient.intensity = levelConfig.AMBIENT_LIGHT_INTENSITY;
             }
             const directional = this.scene.getObjectByProperty('isDirectionalLight', true);
             if (directional) {
                 directional.color.setHex(levelConfig.DIRECTIONAL_LIGHT_COLOR);
                 directional.intensity = levelConfig.DIRECTIONAL_LIGHT_INTENSITY;
                 directional.position.set(
                      levelConfig.DIRECTIONAL_LIGHT_POS_X,
                      levelConfig.DIRECTIONAL_LIGHT_POS_Y,
                      levelConfig.DIRECTIONAL_LIGHT_POS_Z
                 ).normalize();
             }
         }
     }

     _clearAtmosphericElements() {
         console.log("[Game] Clearing atmospheric elements...");
         this.atmosphericElements.forEach(element => {
             if (element && element.parent) {
                 element.parent.remove(element);
             }
             if (element.traverse) {
                 element.traverse((child) => {
                     if (child instanceof THREE.Mesh) {
                         child.geometry?.dispose();
                         if (child.material) {
                             if (Array.isArray(child.material)) {
                                 child.material.forEach(m => m.dispose());
                             } else {
                                 child.material.dispose();
                             }
                         }
                     }
                 });
             }
         });
         this.atmosphericElements = [];
     }

     _addAtmosphericElements(levelId) {
         if (levelId === 'level2' && this.scene) {
             console.log("[Game] Adding atmospheric buzzards for level 2...");
             const numBuzzards = 4;
             const circleRadius = 150;
             const buzzardAltitude = 80;
             for (let i = 0; i < numBuzzards; i++) {
                 const buzzard = this.assetManager.createBuzzardModel();
                 if (buzzard) {
                     const angleOffset = (Math.PI * 2 / numBuzzards) * i;
                     const buzzardX = Math.cos(angleOffset) * circleRadius;
                     const buzzardZ = Math.sin(angleOffset) * circleRadius;
                     buzzard.position.set(buzzardX, buzzardAltitude, buzzardZ);
                     this.scene.add(buzzard);
                     this.atmosphericElements.push(buzzard);
                 }
             }
         }
     }

     _updateAtmosphericElements(deltaTime, elapsedTime) {
         if (this.atmosphericElements.length > 0 && this.levelManager.getCurrentLevelId() === 'level2') {
             const circleRadius = 150;
             const circleSpeed = 0.05;
             const buzzardAltitude = 80;
             const playerX = this.player.model?.position.x || 0;
             const playerZ = this.player.model?.position.z || 0;

             this.atmosphericElements.forEach((buzzard, index) => {
                 const angleOffset = (Math.PI * 2 / this.atmosphericElements.length) * index;
                 const currentAngle = elapsedTime * circleSpeed + angleOffset;
                 const buzzardX = playerX + Math.cos(currentAngle) * circleRadius;
                 const buzzardZ = playerZ + Math.sin(currentAngle) * circleRadius;
                 buzzard.position.set(buzzardX, buzzardAltitude, buzzardZ);
                 buzzard.lookAt(playerX, buzzardAltitude - 10, playerZ);
             });
         }
     }


    pauseGame() {
        if (this.gameStateManager.getCurrentState() === GameStates.PLAYING) {
            // Reset input states when pausing to prevent inputs from persisting
            resetInputStates();

            this.gameStateManager.setGameState(GameStates.PAUSED);
            console.log("[Game] Paused.");
        }
    }

    resumeGame() {
        if (this.gameStateManager.getCurrentState() === GameStates.PAUSED) {
            // Reset input states directly for immediate effect
            // This is in addition to the event-based reset for extra safety
            resetInputStates();

            this.eventBus.emit('uiButtonClicked');
            this.gameStateManager.setGameState(GameStates.PLAYING);
            console.log("[Game] Resumed.");
        }
    }

    restartLevel() {
        const currentLevelId = this.levelManager.getCurrentLevelId();
        if (currentLevelId && !this.isTransitioning) {
             console.log(`[Game] Restarting level: ${currentLevelId}`);
             // Reset input states directly before restarting to prevent stuck inputs
             resetInputStates();
             console.log("[Game] Input states reset before restart");

             // Show mobile controls only on mobile devices when restarting
             updateMobileControlsVisibility();

             this.eventBus.emit('uiButtonClicked');
             this.startGame(currentLevelId);
        } else if (this.isTransitioning) {
             console.warn("[Game] Cannot restart: Level transition in progress.");
        } else {
            console.error("[Game] Cannot restart: Current level ID not found.");
        }
    }

    returnToTitle() {
         if (this.isTransitioning) {
             console.warn("[Game] Cannot return to title: Level transition in progress.");
             return;
         }
         console.log("[Game] Returning to Title Screen.");
         this.eventBus.emit('uiButtonClicked');

         // Hide mobile controls when returning to title
         updateMobileControlsVisibility(false, true); // Force hide

         // Don't unload level, remove player/atmospheric elements
         this._clearAtmosphericElements();

         // Store the camera's current position for a smoother transition
         this.cameraStartPosition = this.camera.position.clone();
         this.cameraStartQuaternion = this.camera.quaternion.clone();
         this.cameraTransitionStartTime = this.clock.getElapsedTime();

         // Only remove the player after we've captured the camera position
         if (this.player.model && this.player.model.parent) {
             this.player.model.parent.remove(this.player.model);
         }

         // Check if we're coming from the level select menu
         const currentState = this.gameStateManager.getCurrentState();
         if (currentState === GameStates.LEVEL_SELECT) {
             // Skip camera transition if coming from level select menu
             // This preserves the camera position and drift
             console.log("[Game] Coming from level select, skipping camera transition.");
             this.gameStateManager.setGameState(GameStates.TITLE);
         } else {
             // For other states, use the normal transition
             this.gameStateManager.setGameState(GameStates.TRANSITIONING_TO_TITLE);
         }
         // Camera reset/drift init happens when state actually becomes TITLE

         // Update available levels for level select
         const availableLevels = this.levelManager.getAvailableLevels();
         this.uiManager.populateLevelSelect(availableLevels, this.startGame.bind(this));
    }

    showLevelSelect() {
        if (this.isTransitioning) {
            console.warn("[Game] Cannot show level select: Transition in progress.");
            return;
        }
        console.log("[Game] Showing level select screen.");

        // Make sure level select is populated with the latest available levels
        const availableLevels = this.levelManager.getAvailableLevels();
        this.uiManager.populateLevelSelect(availableLevels, this.startGame.bind(this));

        // Change game state to show level select screen
        this.gameStateManager.setGameState(GameStates.LEVEL_SELECT);
    }

    handleGameOver() {
        if (this.gameStateManager.getCurrentState() !== GameStates.PLAYING) return;
        console.log("[Game] Handling Game Over");

        // Get the current level ID
        const currentLevelId = this.levelManager.getCurrentLevelId();

        // Check if this is a new high score
        const isNewHighScore = ScoreManager.updateHighScore(this.score, currentLevelId);

        // Get the current high score
        const highScore = ScoreManager.getLevelHighScore(currentLevelId);

        // Show mobile controls only on mobile devices during game over
        updateMobileControlsVisibility();

        // Set game state to GAME_OVER
        this.gameStateManager.setGameState(GameStates.GAME_OVER);

        // Emit gameOverInfo event with score and high score
        this.eventBus.emit('gameOverInfo', {
            score: this.score,
            highScore: highScore,
            levelId: currentLevelId,
            isNewHighScore: isNewHighScore
        });

        // Set up game over buttons again to ensure they work
        this.uiManager.setupGameOverButtons(
            () => this.restartLevel(),
            () => this.returnToTitle()
        );
    }

     // --- Input Handling ---
     handleGlobalKeys(event) {
         const currentState = this.gameStateManager.getCurrentState();
         console.log(`[Game] Key pressed: ${event.key} in state: ${currentState}`);

         if (event.key === 'Escape') {
             if (currentState === GameStates.PLAYING) {
                 this.pauseGame();
             } else if (currentState === GameStates.PAUSED) {
                 this.resumeGame();
             }
             else if (currentState === GameStates.LEVEL_SELECT) {
                 this.returnToTitle();
             }
         }

         if (event.key.toLowerCase() === 'r' && currentState === GameStates.GAME_OVER) {
             this.restartLevel();
         }

         if (event.key.toLowerCase() === 'l') {
             if (currentState === GameStates.TITLE) {
                 console.log("[Game] Level select triggered from title screen via keyboard.");
                 this.showLevelSelect();
             }
         }
     }

    // --- Title Screen Camera Drift Logic ---
    _createCameraDrift(options = {}) {
        const config = {
            amplitude: options.amplitude || new THREE.Vector3(2, 1, 2),
            period: options.period || new THREE.Vector3(10, 15, 8),
            center: options.center || this.camera.position.clone(),
            smoothingFactor: options.smoothingFactor || 0.95
        };
        const originalPosition = config.center.clone();
        let elapsedTime = 0;
        const targetPosition = new THREE.Vector3();

        return (deltaTime) => {
            elapsedTime += deltaTime;
            targetPosition.copy(originalPosition).add(
                new THREE.Vector3(
                    Math.sin(elapsedTime * (Math.PI * 2) / config.period.x) * config.amplitude.x,
                    Math.sin(elapsedTime * (Math.PI * 2) / config.period.y) * config.amplitude.y,
                    Math.sin(elapsedTime * (Math.PI * 2) / config.period.z) * config.amplitude.z
                )
            );
            const smoothFactor = 1.0 - Math.pow(config.smoothingFactor, deltaTime);
            this.camera.position.lerp(targetPosition, smoothFactor);
        };
    }

    _initializeCameraDrift() {
        if (this.camera) {
            // Don't lookAt here, let the animate loop handle it for TITLE state
            this.titleCameraDrift = this._createCameraDrift({
                amplitude: new THREE.Vector3(15, 7.5, 10),
                period: new THREE.Vector3(45, 30, 60),
                smoothingFactor: GlobalConfig.CAMERA_SMOOTHING_FACTOR,
                center: this.initialCameraPosition.clone()
            });
            console.log("[Game] Title camera drift initialized.");
        }
    }

    _updateTitleCamera(deltaTime) {
        if (this.titleCameraDrift) {
            this.titleCameraDrift(deltaTime);
            this.camera.lookAt(TITLE_LOOK_AT_TARGET); // Keep looking at origin
        }
    }

    // --- Camera Transition Logic ---
    // Transition camera back to title screen
    _transitionCameraToTitle(deltaTime) {
        if (!this.camera) return;

        // Get elapsed time since transition started
        const elapsedTime = this.clock.getElapsedTime();
        const timeElapsed = elapsedTime - this.cameraTransitionStartTime;
        const progress = Math.min(timeElapsed / (this.cameraTransitionDuration * 1.5), 1.0);

        if (progress < 1.0) {
            // Use smooth easing function for better transition
            const easedProgress = this._easeInOutCubic(progress);

            // Smoothly interpolate position towards the initial title position
            const targetPosition = this.initialCameraPosition;

            // Use lerpVectors for more precise control
            const newPosition = new THREE.Vector3().lerpVectors(
                this.cameraStartPosition || this.camera.position,
                targetPosition,
                easedProgress
            );
            this.camera.position.copy(newPosition);

            // Smoothly interpolate lookAt towards the title target (origin)
            const targetRotationMatrix = new THREE.Matrix4();
            targetRotationMatrix.lookAt(newPosition, TITLE_LOOK_AT_TARGET, this.camera.up);
            const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(targetRotationMatrix);

            // Use slerpQuaternions for smoother rotation
            this.camera.quaternion.slerpQuaternions(
                this.cameraStartQuaternion || this.camera.quaternion,
                targetQuaternion,
                easedProgress
            );
        } else {
            // Transition complete
            console.log("[Game] Camera transition to title complete.");
            this.camera.position.copy(this.initialCameraPosition); // Snap to final position
            this.camera.lookAt(TITLE_LOOK_AT_TARGET); // Ensure final lookAt

            // Make sure level select is properly populated before switching to title
            const availableLevels = this.levelManager.getAvailableLevels();
            this.uiManager.populateLevelSelect(availableLevels, this.startGame.bind(this));

            this.gameStateManager.setGameState(GameStates.TITLE); // Switch to title state
        }
    }

    // Update camera transition during gameplay
    _updateCameraTransition(deltaTime, elapsedTime) {
        if (!this.camera || !this.player || !this.player.model) {
            console.log("[Game] Missing camera or player model during camera transition.");
            return;
        }

        // Force player visibility during camera transitions
        // This is critical for level transitions, especially to level 2
        if (!this.player.model.visible) {
            console.log("[Game] Player was invisible during camera transition, making visible.");
            this.player.model.visible = true;
        }

        // Double check that the player is in the scene
        if (!this.player.model.parent) {
            console.log("[Game] Player model not in scene during camera transition, adding to scene.");
            this.scene.add(this.player.model);
        }

        // Get the player position
        const playerModel = this.player.model;
        const playerPosition = new THREE.Vector3();
        playerModel.getWorldPosition(playerPosition);

        // Calculate the target camera position (same as in updateCameraFollow)
        const cameraOffset = new THREE.Vector3(
            GlobalConfig.CAMERA_FOLLOW_OFFSET_X,
            GlobalConfig.CAMERA_FOLLOW_OFFSET_Y,
            GlobalConfig.CAMERA_FOLLOW_OFFSET_Z
        );

        const rotatedOffset = cameraOffset.clone();
        rotatedOffset.applyQuaternion(playerModel.quaternion);

        const targetCameraPosition = playerPosition.clone().add(rotatedOffset);

        // Calculate the look-at position
        const lookAtPosition = playerPosition.clone();
        lookAtPosition.y += GlobalConfig.CAMERA_LOOK_AT_OFFSET_Y;

        // Calculate transition progress (0 to 1)
        const timeElapsed = elapsedTime - this.cameraTransitionStartTime;
        const progress = Math.min(timeElapsed / this.cameraTransitionDuration, 1.0);

        if (progress < 1.0) {
            // Use smooth easing function
            const easedProgress = this._easeInOutCubic(progress);

            // Interpolate position
            const newPosition = new THREE.Vector3().lerpVectors(
                this.cameraStartPosition,
                targetCameraPosition,
                easedProgress
            );
            this.camera.position.copy(newPosition);

            // Interpolate rotation
            const targetRotationMatrix = new THREE.Matrix4();
            targetRotationMatrix.lookAt(newPosition, lookAtPosition, this.camera.up);
            const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(targetRotationMatrix);

            this.camera.quaternion.slerpQuaternions(
                this.cameraStartQuaternion,
                targetQuaternion,
                easedProgress
            );
        } else {
            // Transition complete
            console.log("[Game] Camera transition to player complete.");
            this.isCameraTransitioning = false;

            // Double-check player visibility after transition
            if (!this.player.model.visible) {
                console.log("[Game] Player still invisible after transition, forcing visibility.");
                this.player.model.visible = true;
            }

            // Ensure player is in the scene
            if (!this.player.model.parent) {
                console.log("[Game] Player model not in scene after transition, adding to scene.");
                this.scene.add(this.player.model);
            }

            // Force a render to ensure player is visible
            if (this.renderer) {
                console.log("[Game] Forcing a render after camera transition to ensure player visibility.");
                this.renderer.render(this.scene, this.camera);
            }

            // From now on, use normal camera follow
            this.updateCameraFollow(this.player, deltaTime);
        }
    }

    // Easing function for smoother transitions
    _easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Handle transition between scenes
    _updateSceneTransition(deltaTime, elapsedTime) {
        if (!this.gameplayScene || !this.scene) return;

        // Ensure player is visible and in the correct scene during transitions
        if (this.player && this.player.model) {
            // Force visibility
            if (!this.player.model.visible) {
                console.log("[Game] Player was invisible during scene transition, making visible.");
                this.player.model.visible = true;
            }

            // CRITICAL FIX: Ensure player is in the active scene during transitions
            // This is especially important for level 2 transitions
            if (this.activeScene && this.player.model.parent !== this.activeScene) {
                console.log("[Game] Player not in active scene during transition, fixing...");

                // Remove from current parent if any
                if (this.player.model.parent) {
                    this.player.model.parent.remove(this.player.model);
                }

                // Add to active scene
                this.activeScene.add(this.player.model);
                console.log(`[Game] Player added to active scene. Parent exists: ${this.player.model.parent !== null}`);
            }
        }

        // Calculate transition progress (0 to 1)
        const timeElapsed = elapsedTime - this.sceneTransitionStartTime;
        const progress = Math.min(timeElapsed / this.sceneTransitionDuration, 1.0);

        if (progress < 1.0) {
            // Use smooth easing function
            const easedProgress = this._easeInOutCubic(progress);

            // During transition, we're already rendering the gameplay scene
            // The UI fade is handled separately in the UI manager

            // Just update the camera position during this time
            // (Camera transition is handled by _updateCameraTransition)
        } else {
            // Transition complete
            console.log("[Game] Scene transition complete.");
            this.isSceneTransitioning = false;

            // Double-check player visibility after scene transition
            if (this.player && this.player.model) {
                if (!this.player.model.visible) {
                    console.log("[Game] Player still invisible after scene transition, forcing visibility.");
                    this.player.model.visible = true;
                }

                // CRITICAL FIX: Ensure player is in the ACTIVE scene after transition
                // This is crucial for level 2 visibility
                if (this.activeScene) {
                    if (this.player.model.parent !== this.activeScene) {
                        console.log("[Game] Player not in active scene after transition, fixing...");

                        // Remove from current parent if any
                        if (this.player.model.parent) {
                            this.player.model.parent.remove(this.player.model);
                        }

                        // Add to active scene
                        this.activeScene.add(this.player.model);
                    }

                    // Force a render of the ACTIVE scene to ensure player visibility
                    if (this.renderer) {
                        console.log("[Game] Forcing a render of active scene after transition.");
                        this.renderer.render(this.activeScene, this.camera);
                    }
                } else {
                    // Fallback to current scene if no active scene
                    if (!this.player.model.parent) {
                        console.log("[Game] Player model not in any scene after transition, adding to current scene.");
                        this.scene.add(this.player.model);
                    }

                    // Force a render of the current scene
                    if (this.renderer) {
                        console.log("[Game] Forcing a render of current scene after transition.");
                        this.renderer.render(this.scene, this.camera);
                    }
                }
            } else {
                console.log("[Game] Player or player model is null after scene transition.");
            }
        }
    }

    // --- Camera Follow Logic ---
    updateCameraFollow(playerObj, deltaTime) {
        if (this.camera && playerObj && playerObj.model) {
            const playerModel = playerObj.model;
            const targetPosition = new THREE.Vector3();
            playerModel.getWorldPosition(targetPosition);

            const cameraOffset = new THREE.Vector3(
                GlobalConfig.CAMERA_FOLLOW_OFFSET_X,
                GlobalConfig.CAMERA_FOLLOW_OFFSET_Y,
                GlobalConfig.CAMERA_FOLLOW_OFFSET_Z
            );

            const rotatedOffset = cameraOffset.clone();
            rotatedOffset.applyQuaternion(playerModel.quaternion);

            const targetCameraPosition = targetPosition.clone().add(rotatedOffset);

            const smoothFactor = 1.0 - Math.pow(GlobalConfig.CAMERA_SMOOTHING_FACTOR, deltaTime);
            this.camera.position.lerp(targetCameraPosition, smoothFactor);

            const lookAtPosition = targetPosition.clone();
            lookAtPosition.y += GlobalConfig.CAMERA_LOOK_AT_OFFSET_Y;
            this.camera.lookAt(lookAtPosition);
        }
    }

    // --- Resize ---
    onWindowResize() {
        if (this.camera && this.renderer) {
            handleResize(this.camera, this.renderer);
        }
    }
}

export { Game };
