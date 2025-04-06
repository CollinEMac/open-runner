// js/core/gameInitializer.js
import * as THREE from 'three';
import { ChunkManager } from '../managers/chunkManager.js';
import { EnemyManager } from '../managers/enemyManager.js';
import { SpatialGrid } from '../physics/spatialGrid.js';
import { ParticleManager } from '../managers/particleManager.js';
import { setupPlayerControls, initInputStateManager } from '../input/controlsSetup.js';
import { setDeviceClass } from '../utils/deviceUtils.js';
import { createPlayerCharacter } from '../entities/playerCharacter.js';
import { performanceManager } from '../config/config.js'; // Re-export from config.js
import { worldConfig } from '../config/world.js';
import { playerConfig } from '../config/player.js';
import * as AudioManager from '../managers/audioManager.js';
import { initScene, createFpsCounter } from '../rendering/sceneSetup.js';
import * as LevelManager from '../managers/levelManager.js';
import gameStateManager, { GameStates } from './gameStateManager.js'; // Import default instance and GameStates enum
import eventBus from './eventBus.js'; // Import eventBus singleton
import { initPlayerController, updatePlayer as updatePlayerController } from '../entities/playerController.js'; // Import updatePlayer
import { initCollisionManager, checkCollisions } from '../managers/collisionManager.js';
import * as ScoreManager from '../managers/scoreManager.js'; // Import ScoreManager
import * as UIManager from '../managers/uiManager.js';
import * as AssetManager from '../managers/assetManager.js';
import cameraManager from '../managers/cameraManager.js';
import sceneTransitionManager from '../managers/sceneTransitionManager.js';
import atmosphericManager from '../managers/atmosphericManager.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('GameInitializer');

/**
 * Initializes the core game components and managers asynchronously.
 * Returns an object containing the initialized components.
 * @param {HTMLCanvasElement} canvasElement - The canvas element for rendering.
 * @returns {Promise<object|null>} An object with initialized components or null if initialization fails.
 */
export async function initializeGame(canvasElement) {
    logger.info("Game initialization started...");

    try {
        // --- Set Device Class ---
        setDeviceClass();

        // --- Initialize Performance Manager ---
        performanceManager.init();

        // --- Initialize FPS Counter (DOM element) ---
        const fpsCounter = createFpsCounter();

        // Initialize UI Manager first
        if (!UIManager.initUIManager()) {
            logger.error("UI Manager initialization failed.");
            return null;
        }
        // Initialize score displays AFTER UI Manager is initialized
        UIManager.updateScoreDisplay(0);
        UIManager.updateHighScoreDisplay(ScoreManager.getGlobalHighScore());
        // Initialize score displays AFTER UI Manager is initialized
        UIManager.updateScoreDisplay(0);
        UIManager.updateHighScoreDisplay(ScoreManager.getGlobalHighScore());
        // Initialize score displays AFTER UI Manager is initialized
        UIManager.updateScoreDisplay(0);
        UIManager.updateHighScoreDisplay(ScoreManager.getGlobalHighScore());

        // --- Load Initial Level Configuration ---
        const initialLevelId = 'level1'; // TODO: Make this configurable?
        const levelLoaded = await LevelManager.loadLevel(initialLevelId);
        if (!levelLoaded) {
            logger.error("Initial level configuration loading failed.");
            return null;
        }
        const currentLevelConfig = LevelManager.getCurrentConfig();

        // --- Initialize Asset Manager ---
        await AssetManager.initLevelAssets(currentLevelConfig);

        // --- Initialize Scene, Camera, Renderer ---
        const { scene, camera, renderer } = initScene(canvasElement, currentLevelConfig);

        // --- Create Player ---
        const playerModelData = createPlayerCharacter();
        const player = {
            model: playerModelData.characterGroup,
            modelParts: playerModelData,
            currentSpeed: playerConfig.SPEED,
            powerup: '',
        };
        player.model.position.set(playerConfig.INITIAL_POS_X, playerConfig.INITIAL_POS_Y, playerConfig.INITIAL_POS_Z);

        // --- Initialize Managers ---
        cameraManager.setCamera(camera);
        cameraManager.setRenderer(renderer);
        sceneTransitionManager.setRenderer(renderer);
        sceneTransitionManager.setCamera(camera);
        sceneTransitionManager.setPlayer(player); // Pass player object
        atmosphericManager.setPlayerReference(player); // Pass player object
        atmosphericManager.setTargetScene(scene); // Initial scene

        const spatialGrid = new SpatialGrid(worldConfig.GRID_CELL_SIZE);
        const enemyManager = new EnemyManager(scene, spatialGrid); // Pass initial scene
        const chunkManager = new ChunkManager(scene, enemyManager, spatialGrid, currentLevelConfig); // Pass initial scene
        const particleManager = new ParticleManager(scene); // Pass initial scene
        LevelManager.setManagers(chunkManager, enemyManager); // Still needed for unload logic

        // --- Initialize Controllers/Checkers ---
        const raycaster = new THREE.Raycaster();
        initPlayerController(raycaster); // Pass shared raycaster
        initCollisionManager(spatialGrid, chunkManager);
        const collisionChecker = checkCollisions; // Assign function

        // --- Setup Controls ---
        setupPlayerControls(renderer.domElement);
        initInputStateManager(); // Initialize input state manager to handle input resets

        // --- Initialize Audio ---
        AudioManager.initAudio();

        // --- Initial Chunk Loading & State ---
        gameStateManager.setGameState(GameStates.LOADING);
        await chunkManager.loadInitialChunks((loaded, total) => {
            UIManager.updateLoadingProgress(loaded, total);
        });

        // --- Set Initial Game State ---
        gameStateManager.setGameState(GameStates.TITLE);

        // --- Setup UI Button Listeners (Requires Game instance - move this call to Game.init) ---
        // UIManager.setupStartButton(() => game.startGame('level1'));
        // UIManager.setupBackToTitleButton(() => game.returnToTitle());
        // UIManager.setupLevelSelectButton(() => game.showLevelSelect());
        // UIManager.setupPauseMenuButtons(...);
        // UIManager.setupGameOverButtons(...);

        // --- Setup global event listeners (Move to Game.init or main entry point) ---
        // window.addEventListener('resize', () => cameraManager.handleResize(), false);
        // document.addEventListener('keydown', boundHandleGlobalKeys);

        logger.info("Game initialization complete.");

        // Return all initialized components and managers needed by the Game class
        return {
            scene,
            camera,
            renderer,
            player,
            assetManager: AssetManager,
            audioManager: AudioManager,
            cameraManager,
            sceneTransitionManager,
            chunkManager,
            collisionChecker,
            enemyManager,
            gameStateManager,
            levelManager: LevelManager,
            particleManager,
            playerController: { updatePlayer: updatePlayerController }, // Keep consistent structure
            spatialGrid,
            uiManager: UIManager,
            atmosphericManager,
            fpsCounter,
            currentLevelConfig, // Pass initial config
            eventBus // Pass eventBus instance
        };

    } catch (error) {
        logger.error("CRITICAL ERROR during game initialization:", error);
        UIManager.displayError(new Error("Game initialization failed critically. Check console."));
        return null;
    }
}