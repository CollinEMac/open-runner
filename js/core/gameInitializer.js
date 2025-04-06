// js/core/gameInitializer.js
import * as THREE from 'three';
import { ChunkManager } from '../managers/chunkManager.js';
import { EnemyManager } from '../managers/enemyManager.js';
import { SpatialGrid } from '../physics/spatialGrid.js';
import { ParticleManager } from '../managers/particleManager.js';
import { setupPlayerControls, initInputStateManager } from '../input/controlsSetup.js';
import { setDeviceClass } from '../utils/deviceUtils.js';
import { createPlayerCharacter } from '../entities/playerCharacter.js';
import {
    performanceManager,
    GRID_CELL_SIZE,
    PLAYER_SPEED,
    PLAYER_INITIAL_POS_X, PLAYER_INITIAL_POS_Y, PLAYER_INITIAL_POS_Z
} from '../config/config.js';
import * as AudioManager from '../managers/audioManager.js';
import { initScene, createFpsCounter } from '../rendering/sceneSetup.js';
import * as LevelManager from '../managers/levelManager.js';
import { GameStates } from './gameStateManager.js'; // Needed for setting state
import { initPlayerController } from '../entities/playerController.js';
import { initCollisionManager, checkCollisions } from '../managers/collisionManager.js'; // Corrected import name
import * as UIManager from '../managers/uiManager.js';
import * as AssetManager from '../managers/assetManager.js';
import cameraManager from '../managers/cameraManager.js';
import sceneTransitionManager from '../managers/sceneTransitionManager.js';
import atmosphericManager from '../managers/atmosphericManager.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('GameInitializer');

/**
 * Initializes the game asynchronously, setting up scenes, managers, assets, and initial state.
 * Modifies the passed game instance directly.
 * @param {Game} game - The main game instance.
 * @returns {Promise<boolean>} True if initialization was successful, false otherwise.
 */
export async function initializeGame(game) {
    logger.info("Game initialization started...");

    // --- Set Device Class ---
    setDeviceClass();

    // --- Initialize Performance Manager ---
    performanceManager.init();

    // --- Initialize FPS Counter ---
    game.fpsCounter = createFpsCounter(); // Set on game instance

    // Initialize UI Manager first
    if (!game.uiManager.initUIManager()) { // Access via game instance
        return false;
    }

    // --- Load Initial Level Configuration ---
    const initialLevelId = 'level1';
    const levelLoaded = await game.levelManager.loadLevel(initialLevelId); // Access via game instance
    if (!levelLoaded) {
        return false;
    }
    game.currentLevelConfig = game.levelManager.getCurrentConfig(); // Set on game instance

    // --- Initialize Asset Manager ---
    await game.assetManager.initLevelAssets(game.currentLevelConfig); // Access via game instance

    // --- Initialize Scene, Camera, Renderer ---
    const sceneComponents = initScene(game.canvas, game.currentLevelConfig); // Access canvas via game instance
    game.scene = sceneComponents.scene; // Set on game instance
    game.camera = sceneComponents.camera; // Set on game instance
    game.renderer = sceneComponents.renderer; // Set on game instance

    // Initialize CameraManager
    game.cameraManager.setCamera(game.camera); // Access via game instance
    game.cameraManager.setRenderer(game.renderer); // Access via game instance
    // Initialize SceneTransitionManager
    game.sceneTransitionManager.setRenderer(game.renderer); // Access via game instance
    game.sceneTransitionManager.setCamera(game.camera); // Access via game instance
    game.sceneTransitionManager.setPlayer(game.player); // Access via game instance
    // Initialize AtmosphericManager
    game.atmosphericManager.setPlayerReference(game.player); // Access via game instance
    game.atmosphericManager.setTargetScene(game.scene); // Access via game instance

    // Set the title scene as the active scene
    game.activeScene = game.scene; // Set on game instance

    // Title Camera Drift is handled within CameraManager initialization

    // --- Initialize Managers ---
    game.spatialGrid = new SpatialGrid(GRID_CELL_SIZE); // Set on game instance
    game.enemyManager = new EnemyManager(game.scene, game.spatialGrid); // Set on game instance
    game.chunkManager = new ChunkManager(game.scene, game.enemyManager, game.spatialGrid, game.currentLevelConfig); // Set on game instance
    game.particleManager = new ParticleManager(game.scene); // Set on game instance
    game.levelManager.setManagers(game.chunkManager, game.enemyManager); // Access via game instance

    // --- Initialize Player Controller ---
    const raycaster = new THREE.Raycaster();
    initPlayerController(raycaster);

    // --- Initialize Collision Manager ---
    initCollisionManager(game.spatialGrid, game.chunkManager);
    game.collisionChecker = checkCollisions; // Assign the correctly imported function

    // --- Create Player ---
    const playerModelData = createPlayerCharacter();
    game.player = { // Re-assign player object on game instance
        model: playerModelData.characterGroup,
        modelParts: playerModelData,
        currentSpeed: PLAYER_SPEED,
        powerup: '',
    };
    game.player.model.position.set(PLAYER_INITIAL_POS_X, PLAYER_INITIAL_POS_Y, PLAYER_INITIAL_POS_Z);
    game.atmosphericManager.setPlayerReference(game.player); // Update player reference after creation
    game.sceneTransitionManager.setPlayer(game.player); // Update player reference in manager

    // --- Setup Controls ---
    setupPlayerControls(game.renderer.domElement); // Access renderer via game instance
    initInputStateManager(); // Initialize input state manager to handle input resets

    // --- Initialize Audio ---
    game.audioManager.initAudio(); // Access via game instance

    // --- Initial Chunk Loading & State ---
    game.gameStateManager.setGameState(GameStates.LOADING); // Access via game instance
    await game.chunkManager.loadInitialChunks((loaded, total) => { // Access via game instance
        game.uiManager.updateLoadingProgress(loaded, total); // Access via game instance
    });

    game.gameStateManager.setGameState(GameStates.TITLE); // Access via game instance

    // Setup UI Button Listeners (Callbacks need access to game instance methods)
    game.uiManager.setupStartButton(() => game.startGame('level1')); // Access via game instance
    game.uiManager.setupBackToTitleButton(() => game.returnToTitle()); // Access via game instance
    game.uiManager.setupLevelSelectButton(() => game.showLevelSelect()); // Access via game instance
    game.uiManager.setupPauseMenuButtons(
        () => game.resumeGame(), // Access via game instance
        () => game.restartLevel(), // Access via game instance
        () => game.returnToTitle() // Access via game instance
    );
    game.uiManager.setupGameOverButtons(
        () => game.restartLevel(), // Access via game instance
        () => game.returnToTitle() // Access via game instance
    );

    // Setup global event listeners
    window.addEventListener('resize', () => game.cameraManager.handleResize(), false); // Access via game instance

    // Remove any existing keydown listeners to prevent duplicates
    // Note: handleGlobalKeys needs to be bound to the game instance
    const boundHandleGlobalKeys = game.handleGlobalKeys.bind(game);
    document.removeEventListener('keydown', boundHandleGlobalKeys);
    document.addEventListener('keydown', boundHandleGlobalKeys);

    // Subscribe to events (This should remain in game.js as it uses game instance methods)
    // game._setupEventSubscriptions(); // Call from game.js after initializeGame completes

    logger.info("Game initialization complete.");
    return true;
}