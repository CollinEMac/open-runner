// js/core/game.js
import * as THREE from 'three';
import eventBus from './eventBus.js'; // Stays in core
import { ChunkManager } from '../managers/chunkManager.js'; // Moved to managers
import { EnemyManager } from '../managers/enemyManager.js'; // Moved to managers
import { SpatialGrid } from '../physics/spatialGrid.js'; // Moved to physics
import { ParticleManager } from '../managers/particleManager.js'; // Moved to managers
import { setupPlayerControls, initInputStateManager, resetInputStates } from '../input/controlsSetup.js'; // Moved to input
import { updateMobileControlsVisibility, setDeviceClass } from '../utils/deviceUtils.js'; // Stays in utils
import { grayMaterial, createPlayerCharacter } from '../entities/playerCharacter.js'; // Moved to entities
// Import specific constants and performanceManager from config
import {
    performanceManager,
    // getConfig, updateConfig, // Keep existing config functions if needed elsewhere - Now imported from configManager
    MAX_DELTA_TIME, GRID_CELL_SIZE, PLAYER_SPEED, // Existing used constants - SHOW_FPS now uses getConfig
    PLAYER_INITIAL_POS_X, PLAYER_INITIAL_POS_Y, PLAYER_INITIAL_POS_Z, // New player pos
    LEVEL1_TRANSITION_SCORE, // New level transition score
    POWERUP_TYPE_MAGNET, POWERUP_DURATION, // New powerup constants
    MAGNET_EFFECT_COLOR, MAGNET_EFFECT_EMISSIVE, MAGNET_EFFECT_METALNESS, MAGNET_EFFECT_ROUGHNESS, // New magnet effect
    KEY_TOGGLE_FPS, KEY_PAUSE_RESUME_BACK, KEY_RESTART_GAME_OVER, KEY_LEVEL_SELECT_TITLE // New key bindings
} from '../config/config.js'; // Moved to config
import * as AudioManager from '../managers/audioManager.js'; // Moved to managers
import { initScene, createFpsCounter, updateFpsCounter } from '../rendering/sceneSetup.js'; // Moved to rendering
import * as LevelManager from '../managers/levelManager.js'; // Moved to managers
import { GameStates, getCurrentState, setGameState } from './gameStateManager.js'; // Stays in core
import { initPlayerController, updatePlayer as updatePlayerController } from '../entities/playerController.js'; // Moved to entities
import { initCollisionManager, checkCollisions as checkCollisionsController } from '../managers/collisionManager.js'; // Moved to managers
import * as UIManager from '../managers/uiManager.js'; // Moved to managers
import * as AssetManager from '../managers/assetManager.js'; // Moved to managers
import * as ScoreManager from '../managers/scoreManager.js'; // Moved to managers
import cameraManager from '../managers/cameraManager.js'; // Moved to managers
import sceneTransitionManager from '../managers/sceneTransitionManager.js'; // Moved to managers
import atmosphericManager from '../managers/atmosphericManager.js'; // Moved to managers
import { createLogger } from '../utils/logger.js'; // Stays in utils
import configManager from '../utils/configManager.js'; // Import config manager instance
import { initializeGame } from './gameInitializer.js'; // Import the new initializer function
import { setupEventHandlers } from './eventHandlerSetup.js'; // Import the new event handler setup function
import { updateGameplay } from './gameplayUpdater.js'; // Import the new gameplay update function

const logger = createLogger('Game');

class Game {
    /**
     * Creates an instance of the Game.
     * @param {HTMLCanvasElement} canvasElement - The canvas element for rendering.
     * @throws {Error} If canvasElement is not provided.
     */
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

        // Performance monitoring
        this.fpsCounter = null;
        this.showFps = configManager.get('debug.showFPS'); // Use configManager.get to access the setting

        // Scene transition properties moved to SceneTransitionManager
        // Managers
        this.assetManager = AssetManager;
        this.audioManager = AudioManager;
        this.cameraManager = cameraManager;
        this.sceneTransitionManager = sceneTransitionManager; // Use the singleton instance
        this.chunkManager = null;
        this.collisionChecker = null;
        this.enemyManager = null;
        this.gameStateManager = { getCurrentState, setGameState };
        this.levelManager = LevelManager;
        this.particleManager = null;
        this.playerController = { updatePlayer: updatePlayerController };
        this.spatialGrid = null;
        this.uiManager = UIManager;
        this.atmosphericManager = atmosphericManager; // Use the singleton instance

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
        this.powerupTimer = null;


        // Event Bus
        this.eventBus = eventBus;

        // Set up FPS toggle
        document.addEventListener('keydown', (event) => {
            // Use lowercase comparison for consistency
            if (event.key.toLowerCase() === KEY_TOGGLE_FPS) {
                const newFpsState = !configManager.get('debug.showFPS');
                configManager.updateConfig('debug', { SHOW_FPS: newFpsState }); // Use configManager to update debug section
                if (this.fpsCounter) {
                    this.fpsCounter.style.display = newFpsState ? 'block' : 'none';
                }
            }
        });

        logger.info("Game class instantiated");
    }

    /**
     * Initializes the game asynchronously, setting up scenes, managers, assets, and initial state.
     * @returns {Promise<boolean>} True if initialization was successful, false otherwise.
     */
    async init() {
        const initialized = await initializeGame(this);
        if (initialized) {
            // Subscribe to events after successful initialization
            this._setupEventSubscriptions();
        }
        return initialized;
    }

    /**
     * Sets up subscriptions to global events via the event bus.
     * Handles score changes, power-ups, player death, state changes, etc.
     * @private
     */
    _setupEventSubscriptions() {
        // Delegate setup to the dedicated module
        setupEventHandlers(this);
    }

    /**
     * Starts the main game loop.
     */
    start() {
        logger.info("Starting game loop...");
        this.animate();
    }

    /**
     * The main game loop, called recursively via requestAnimationFrame.
     * Updates game state, managers, camera, and renders the active scene.
     * @private
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));

        let deltaTime = this.clock.getDelta();
        // --- NaN Check for deltaTime ---
        if (isNaN(deltaTime) || !isFinite(deltaTime) || deltaTime <= 0 || deltaTime > 1.0) {
            // If delta is invalid (e.g., first frame, after long pause, browser tab switch), use a fallback
            // logger.warn(`Invalid deltaTime ${deltaTime}, using fallback.`);
            deltaTime = 1 / 60; // Default to 60 FPS assumption
        }
        deltaTime = Math.min(deltaTime, MAX_DELTA_TIME); // Apply capping *after* validation
        // --- End NaN Check ---

        const elapsedTime = this.clock.getElapsedTime();
        const currentState = this.gameStateManager.getCurrentState();

        // Update performance monitoring
        performanceManager.updateFps();
        if (this.fpsCounter) {
            updateFpsCounter(this.fpsCounter, performanceManager.getCurrentFps());
        }

        // Update Camera Manager
        this.cameraManager.update(deltaTime, elapsedTime, currentState, this.player);

        // Update game logic based on state
        if (currentState === GameStates.PLAYING) {
            // Delegate gameplay updates to the dedicated module
            updateGameplay(this, deltaTime, elapsedTime);
        }
        // Camera updates for TITLE, LEVEL_SELECT, and TRANSITIONING states are handled by cameraManager.update() above

        // Update Scene Transition Manager
        this.sceneTransitionManager.update(deltaTime, elapsedTime);
        // Update activeScene based on transition manager's active scene
        this.activeScene = this.sceneTransitionManager.getActiveScene() || this.scene;

        // Player visibility and scene parenting are now handled within SceneTransitionManager._ensurePlayerState

        // Render the active scene
        if (this.renderer && this.activeScene && this.camera) {
            this.renderer.render(this.activeScene, this.camera);
        } else {
             logger.warn("Skipping render: Missing renderer, activeScene, or camera.");
        }


    }

    // --- Game State/Flow Methods ---

    /**
     * Starts or transitions to a specific game level.
     * Sets up a new gameplay scene, managers, loads level assets, and initiates transitions.
     * @param {string} levelId - The ID of the level to start (e.g., 'level1').
     * @returns {Promise<void>}
     */
    async startGame(levelId) {
        logger.info(`Starting level: ${levelId}`);
        this.eventBus.emit('uiButtonClicked');

        // Reset input states to prevent any stuck inputs when starting a new game
        resetInputStates();
        logger.info("Input states reset before starting game");

        // Show mobile controls only on mobile devices when game starts
        updateMobileControlsVisibility();

        // 1. Create a new scene for gameplay
        const gameplaySceneComponents = initScene(this.canvas, this.currentLevelConfig);
        this.gameplayScene = gameplaySceneComponents.scene;

        // 2. Start camera transition using CameraManager
        this.cameraManager.startTransitionToGameplay(this.camera.position, this.camera.quaternion);

        // 3. Create new managers for the gameplay scene
        const originalScene = this.scene; // Keep reference to title scene
        // Note: We don't need to store old managers as they operate on the old scene

        // Create new spatial grid and managers for the gameplay scene
        this.spatialGrid = new SpatialGrid(GRID_CELL_SIZE); // Use imported constant
        this.enemyManager = new EnemyManager(this.gameplayScene, this.spatialGrid); // Use gameplayScene
        this.chunkManager = new ChunkManager(this.gameplayScene, this.enemyManager, this.spatialGrid, this.currentLevelConfig); // Use gameplayScene
        this.particleManager = new ParticleManager(this.gameplayScene); // Use gameplayScene
        this.levelManager.setManagers(this.chunkManager, this.enemyManager);
        this.atmosphericManager.setTargetScene(this.gameplayScene); // Update target scene for atmospheric elements

        // Re-initialize collision manager with the new spatial grid and chunk manager
        initCollisionManager(this.spatialGrid, this.chunkManager);

        // Load the level with the new managers (operates on gameplayScene via managers)
        await this._loadLevel(levelId);

        // 4. Keep the new managers for gameplay. Restore this.scene reference if needed,
        // but activeScene will be managed by the transition manager.

        // 6. Start the scene transition using SceneTransitionManager
        this.sceneTransitionManager.startTransition(this.gameplayScene);
        this.activeScene = this.sceneTransitionManager.getActiveScene(); // Update active scene reference
        // Camera transition started earlier by cameraManager.startTransitionToGameplay

        // 7. Set to PLAYING state
        this.gameStateManager.setGameState(GameStates.PLAYING);
    }

    /**
     * Internal helper to load level configuration, assets, and reset state for a new level.
     * Assumes managers are already pointing to the correct (gameplay) scene.
     * @param {string} levelId - The ID of the level to load.
     * @returns {Promise<void>}
     * @private
     */
    async _loadLevel(levelId) {
        logger.info(`[_loadLevel] Starting execution for level ID: ${levelId}`); // Added entry log
        try { // Added try block
            // Check scene transition state (allow camera transition concurrently)
            if (this.sceneTransitionManager.getIsTransitioning()) {
                logger.warn("[_loadLevel] Already transitioning (scene), cannot load new level yet.");
                return;
            }
            // Scene transition flag is managed by SceneTransitionManager
            logger.info(`[_loadLevel] Loading level ${levelId}...`);
        // 1. Don't change the state - keep the current transition state
        // Skip showing loading screen - this improves the transition experience

        // Store the player's current scene parent before removing it
        const playerCurrentParent = this.player.model?.parent;

        // Log player state before transition
        if (this.player.model) {
            logger.debug(`Player state before level transition: visible=${this.player.model.visible}, parent=${playerCurrentParent ? 'exists' : 'null'}`);
        } else {
            logger.warn("Player model is null before level transition.");
        }

        // 2. Unload Current Level Assets & State (if necessary)
        logger.info("Unloading current level (if necessary)...");
        if (this.levelManager.getCurrentLevelId()) {
             this.levelManager.unloadCurrentLevel();
             this.chunkManager.clearAllChunks();
             this.atmosphericManager.clearElements(); // Use manager to clear elements
             // Player model removal handled below
        }

        // 3. Load New Level Config
        logger.info(`Loading level ${levelId} config...`);
        const levelLoaded = await this.levelManager.loadLevel(levelId);
        if (!levelLoaded) {
            logger.error(`Failed to load level config for ${levelId}. Returning to title.`);
            this.gameStateManager.setGameState(GameStates.TITLE);
            // Flag managed by SceneTransitionManager
            return;
        }
        this.currentLevelConfig = this.levelManager.getCurrentConfig();

        // 4. Initialize New Level Assets (using the current AssetManager instance)
        logger.info("Initializing new level assets...");
        await this.assetManager.initLevelAssets(this.currentLevelConfig);

        // 5. Add Atmospheric Elements (if applicable) using the manager
        this.atmosphericManager.addElementsForLevel(levelId, this.gameplayScene); // Pass gameplayScene explicitly

        // 6. Update Scene Appearance (applies to the scene held by managers, i.e., gameplayScene)
        logger.info("Updating scene appearance...");
        this._updateSceneAppearance(this.currentLevelConfig, this.gameplayScene); // Pass target scene explicitly

        // 7. Update Chunk Manager with New Config
        this.chunkManager.setLevelConfig(this.currentLevelConfig);

        // 8. Reset Player State & Add to Scene
        logger.info("Resetting player state...");
        if (this.player.model) {
            // Always remove the player from its previous parent if it exists
            if (playerCurrentParent) {
                logger.debug("Removing player from previous parent.");
                playerCurrentParent.remove(this.player.model);
            }

            // Reset player position and rotation using constants
            this.player.model.position.set(PLAYER_INITIAL_POS_X, PLAYER_INITIAL_POS_Y, PLAYER_INITIAL_POS_Z);
            this.player.model.rotation.set(0, 0, 0);
            this.player.currentSpeed = PLAYER_SPEED;

            // Add player to the gameplay scene (which managers are now operating on)
            if (this.gameplayScene) { // Ensure gameplayScene exists
                 logger.debug("Adding player to the gameplay scene.");
                 this.gameplayScene.add(this.player.model);
            } else {
                 logger.error("Gameplay scene is null during level load, cannot add player.");
            }


            // Force player visibility - critical for level transitions
            this.player.model.visible = true;

            // if (this.renderer && this.activeScene) { ... }

            // Log the player's current state for debugging
            logger.debug(`Player model reset and added to scene. Visibility: ${this.player.model.visible}, Parent: ${this.player.model.parent ? 'exists' : 'null'}`);
        } else {
            logger.error("Player model is null when trying to reset for new level.");
        }
        const scoreToReset = this.score;
        this.score = 0;
        if (scoreToReset > 0) {
             this.eventBus.emit('scoreChanged', -scoreToReset);
        }
        this.playerAnimationTime = 0;

        // 9. Load Initial Chunks for New Level (using the updated chunkManager)
        logger.info("Loading initial chunks for new level...");
        // Load chunks silently without updating UI
        await this.chunkManager.loadInitialChunks(() => {});

        // Initialize ChunkManager's last coords based on player start to prevent immediate unloading
        const initialPlayerChunkX = Math.floor(PLAYER_INITIAL_POS_X / this.chunkManager.chunkSize);
        const initialPlayerChunkZ = Math.floor(PLAYER_INITIAL_POS_Z / this.chunkManager.chunkSize);
        this.chunkManager.lastCameraChunkX = initialPlayerChunkX;
        this.chunkManager.lastCameraChunkZ = initialPlayerChunkZ;
        logger.info(`[Game] Initialized ChunkManager last coords to player start: ${initialPlayerChunkX},${initialPlayerChunkZ}`);

        // 10. Finalize Transition
        logger.info(`[_loadLevel] Level ${levelId} loaded successfully.`);

        // Don't change the state here - let the calling function handle state changes
        // This allows for proper sequencing of loading and camera transitions

        // Scene transition flag managed by SceneTransitionManager
        } catch (error) { // Added catch block
            logger.error(`[_loadLevel] CRITICAL ERROR during level load for ${levelId}:`, error);
            // Attempt to recover or go to a safe state
            this.gameStateManager.setGameState(GameStates.TITLE);
            this.uiManager.displayError(new Error(`Failed to load level ${levelId}. Returning to title.`));
        }
    }

    /**
     * Updates the visual appearance (background, fog, lighting) of a given scene based on level config.
     * @param {object} levelConfig - The configuration object for the level.
     * @param {THREE.Scene} sceneToUpdate - The scene object to apply changes to.
     * @private
     */
     _updateSceneAppearance(levelConfig, sceneToUpdate) {
         if (sceneToUpdate && levelConfig) {
             sceneToUpdate.background = new THREE.Color(levelConfig.SCENE_BACKGROUND_COLOR);
             sceneToUpdate.fog = new THREE.Fog(levelConfig.SCENE_FOG_COLOR, levelConfig.SCENE_FOG_NEAR, levelConfig.SCENE_FOG_FAR);
             const ambient = sceneToUpdate.getObjectByProperty('isAmbientLight', true);
             if (ambient) {
                 ambient.color.setHex(levelConfig.AMBIENT_LIGHT_COLOR);
                 ambient.intensity = levelConfig.AMBIENT_LIGHT_INTENSITY;
             }
             const directional = sceneToUpdate.getObjectByProperty('isDirectionalLight', true);
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



    /**
     * Pauses the game if it's currently playing.
     * Resets input states and sets the game state to PAUSED.
     */
    pauseGame() {
        if (this.gameStateManager.getCurrentState() === GameStates.PLAYING) {
            // Reset input states when pausing to prevent inputs from persisting
            resetInputStates();

            this.gameStateManager.setGameState(GameStates.PAUSED);
            logger.info("Paused.");
        }
    }

    /**
     * Resumes the game if it's currently paused.
     * Resets input states and sets the game state to PLAYING.
     */
    resumeGame() {
        if (this.gameStateManager.getCurrentState() === GameStates.PAUSED) {
            // Reset input states directly for immediate effect
            // This is in addition to the event-based reset for extra safety
            resetInputStates();

            this.eventBus.emit('uiButtonClicked');
            this.gameStateManager.setGameState(GameStates.PLAYING);
            logger.info("Resumed.");
        }
    }

    /**
     * Restarts the current level by calling `startGame` with the current level ID.
     * Resets input states before restarting.
     */
    restartLevel() {
        const currentLevelId = this.levelManager.getCurrentLevelId();
        // Check both scene and camera transitions
        if (currentLevelId && !this.sceneTransitionManager.getIsTransitioning() && !this.cameraManager.getIsTransitioning()) {
             logger.info(`Restarting level: ${currentLevelId}`);
             // Reset input states directly before restarting to prevent stuck inputs
             resetInputStates();
             logger.info("Input states reset before restart");

             // Show mobile controls only on mobile devices when restarting
             updateMobileControlsVisibility();

             this.eventBus.emit('uiButtonClicked');
             this.startGame(currentLevelId); // startGame is now async
        } else if (this.sceneTransitionManager.getIsTransitioning() || this.cameraManager.getIsTransitioning()) {
             logger.warn("Cannot restart: Level transition in progress.");
        } else {
            logger.error("Cannot restart: Current level ID not found.");
        }
    }

    /**
     * Returns the game to the title screen state.
     * Handles transitions, hides mobile controls, and resets necessary states.
     */
    returnToTitle() {
         // Check both scene and camera transitions
         if (this.sceneTransitionManager.getIsTransitioning() || this.cameraManager.getIsTransitioning()) {
             logger.warn("Cannot return to title: Transition in progress.");
             return;
         }
         logger.info("Returning to Title Screen.");
         this.eventBus.emit('uiButtonClicked');

         // Hide mobile controls when returning to title
         updateMobileControlsVisibility(false, true); // Force hide

         // Don't unload level, remove player/atmospheric elements
         this.atmosphericManager.clearElements(); // Use manager

         // Start camera transition using CameraManager
         this.cameraManager.startTransitionToTitle(this.camera.position, this.camera.quaternion);

         // Only remove the player after we've captured the camera position
         if (this.player.model && this.player.model.parent) {
             this.player.model.parent.remove(this.player.model);
         }

         // Check if we're coming from the level select menu
         const currentState = this.gameStateManager.getCurrentState();
         if (currentState === GameStates.LEVEL_SELECT) {
             // Skip camera transition if coming from level select menu
             // This preserves the camera position and drift
             logger.info("Coming from level select, skipping camera transition.");
             this.gameStateManager.setGameState(GameStates.TITLE);
         } else {
             // For other states (like PAUSED), use the normal transition
             // Camera transition already started by CameraManager
             // Set state to TRANSITIONING_TO_TITLE to allow UI manager to hide elements during transition
             this.gameStateManager.setGameState(GameStates.TRANSITIONING_TO_TITLE); // State change to TITLE handled by camera transition end event
         }
         // Camera reset/drift init happens when state actually becomes TITLE

         // Update available levels for level select
         const availableLevels = this.levelManager.getAvailableLevels();
         this.uiManager.populateLevelSelect(availableLevels, this.startGame.bind(this));
    }

    /**
     * Shows the level selection screen.
     * Populates the UI and sets the game state to LEVEL_SELECT.
     */
    showLevelSelect() {
        // Check both scene and camera transitions
        if (this.sceneTransitionManager.getIsTransitioning() || this.cameraManager.getIsTransitioning()) {
            logger.warn("Cannot show level select: Transition in progress.");
            return;
        }
        logger.info("Showing level select screen.");

        // Make sure level select is populated with the latest available levels
        const availableLevels = this.levelManager.getAvailableLevels();
        this.uiManager.populateLevelSelect(availableLevels, this.startGame.bind(this));

        // Change game state to show level select screen
        this.gameStateManager.setGameState(GameStates.LEVEL_SELECT);
    }

    /**
     * Handles the game over sequence.
     * Updates high scores, sets the game state to GAME_OVER, and emits relevant events.
     */
    handleGameOver() {
        if (this.gameStateManager.getCurrentState() !== GameStates.PLAYING) return;
        logger.info("Handling Game Over");

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
     /**
      * Handles global keydown events for actions like pausing, resuming, restarting, etc.
      * @param {KeyboardEvent} event - The keyboard event object.
      * @private
      */
     handleGlobalKeys(event) {
         const currentState = this.gameStateManager.getCurrentState();
         logger.debug(`Key pressed: ${event.key} (lowercase: ${event.key.toLowerCase()}) in state: ${currentState}`); // Changed to debug

         // Use key constants and lowercase comparison
         const lowerCaseKey = event.key.toLowerCase();

         if (lowerCaseKey === KEY_PAUSE_RESUME_BACK) {
             if (currentState === GameStates.PLAYING) {
                 this.pauseGame();
             } else if (currentState === GameStates.PAUSED) {
                 this.resumeGame();
             } else if (currentState === GameStates.LEVEL_SELECT) {
                 this.returnToTitle();
             }
         } else if (lowerCaseKey === KEY_RESTART_GAME_OVER && currentState === GameStates.GAME_OVER) {
             this.restartLevel();
         } else if (lowerCaseKey === KEY_LEVEL_SELECT_TITLE) {
             if (currentState === GameStates.TITLE) {
                 logger.info("Level select triggered from title screen via keyboard.");
                 this.showLevelSelect();
             }
         }
         // Note: The FPS toggle key ('f') is handled by a separate listener in the constructor.
     }
    /**
     * Updates all game logic relevant to the PLAYING state.
     * Called by animate() when the game state is PLAYING.
     * @param {number} deltaTime - Time elapsed since the last frame.
     * @param {number} elapsedTime - Total time elapsed since the game started.
     * @private
     */
    // _updateGameplay method is now removed, its logic is in gameplayUpdater.js
}

export { Game };
