// js/game.js
import * as THREE from 'three';
import eventBus from './eventBus.js';
import { ChunkManager } from './chunkManager.js';
import { EnemyManager } from './enemyManager.js';
import { SpatialGrid } from './spatialGrid.js';
import { ParticleManager } from './particleManager.js';
import { setupPlayerControls } from './controlsSetup.js';
import { createPlayerCharacter } from './playerCharacter.js';
import * as GlobalConfig from './config.js';
import * as AudioManager from './audioManager.js';
import { initScene, handleResize } from './sceneSetup.js';
import * as LevelManager from './levelManager.js';
import { GameStates, getCurrentState, setGameState } from './gameStateManager.js';
import { initPlayerController, updatePlayer as updatePlayerController } from './playerController.js';
import { initCollisionManager, checkCollisions as checkCollisionsController } from './collisionManager.js';
import * as UIManager from './uiManager.js';
import * as AssetManager from './assetManager.js';

// Constants for camera transition
const TITLE_TRANSITION_SPEED = 1.5; // Adjust for desired speed
const TITLE_TRANSITION_THRESHOLD_SQ = 0.1; // Squared distance threshold to switch to TITLE state
const TITLE_LOOK_AT_TARGET = new THREE.Vector3(0, 0, 0); // Target for camera lookAt during title

class Game {
    constructor(canvasElement) {
        if (!canvasElement) {
            throw new Error("Canvas element is required to initialize the game.");
        }
        this.canvas = canvasElement;

        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.initialCameraPosition = new THREE.Vector3();

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
        this.player = { model: null, modelParts: null, currentSpeed: 0 };
        this.score = 0;
        this.currentLevelConfig = null;
        this.playerAnimationTime = 0;
        this.atmosphericElements = [];
        this.isTransitioning = false;

        // Title Screen Animation
        this.titleCameraDrift = null;

        // Event Bus
        this.eventBus = eventBus;

        console.log("Game class instantiated");
    }

    async init() {
        console.log("Game initialization started...");

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
        };
        this.player.model.position.set(0, 10, 5);

        // --- Setup Controls ---
        setupPlayerControls(this.renderer.domElement);

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
        this.uiManager.setupPauseMenuButtons(
            () => this.resumeGame(),
            () => this.restartLevel(),
            () => this.returnToTitle()
        );

        // Setup global event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        document.addEventListener('keydown', this.handleGlobalKeys.bind(this));

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
             if (this.levelManager.getCurrentLevelId() === 'level1' && this.score >= 300 && this.gameStateManager.getCurrentState() === GameStates.PLAYING) {
                 this.eventBus.emit('requestLevelTransition', 'level2');
                 console.log("[Game] Requesting level transition to level2");
             }
        });

        this.eventBus.subscribe('playerDied', () => this.handleGameOver());

        this.eventBus.subscribe('gameStateChanged', (newState) => {
            console.log(`[Game] Observed state changed to: ${newState}`);
            if (newState === GameStates.PLAYING) {
                 this.playerAnimationTime = 0;
            }
            if (newState === GameStates.TITLE) {
                if (this.player.model && this.player.model.parent) {
                    this.player.model.parent.remove(this.player.model);
                }
                // Re-initialize drift when entering title state
                this._initializeCameraDrift();
            }
        });

        this.eventBus.subscribe('requestLevelTransition', (levelId) => {
            console.log(`[Game] Received requestLevelTransition event for: ${levelId}`);
            this._loadLevel(levelId);
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

        if (currentState === GameStates.PLAYING) {
            this.playerAnimationTime += deltaTime;

            if (this.player.model) {
                 this.playerController.updatePlayer(this.player, deltaTime, this.playerAnimationTime, this.chunkManager, this.updateCameraFollow.bind(this));
            }
            if (this.chunkManager && this.player.model) {
                this.chunkManager.update(this.player.model.position);
            }
            if (this.enemyManager && this.player.model) {
                this.enemyManager.update(this.player.model.position, deltaTime, elapsedTime);
            }
            if (this.particleManager && this.player.model) {
                this.particleManager.update(deltaTime, this.player.model.position);
            }
            if (this.collisionChecker && this.player.model) {
                this.collisionChecker(this.player.model.position);
            }
            this._updateAtmosphericElements(deltaTime, elapsedTime);

        } else if (currentState === GameStates.TITLE) {
            this._updateTitleCamera(deltaTime);
        } else if (currentState === GameStates.TRANSITIONING_TO_TITLE) {
            this._transitionCameraToTitle(deltaTime); // Added call
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // --- Game State/Flow Methods ---

    async startGame(levelId) {
        console.log(`[Game] Starting level: ${levelId}`);
        this.eventBus.emit('uiButtonClicked');
        await this._loadLevel(levelId);
    }

    async _loadLevel(levelId) {
        if (this.isTransitioning) {
            console.warn("[Game] Already transitioning, cannot start new level yet.");
            return;
        }
        this.isTransitioning = true;
        console.log(`[Game] Loading level ${levelId}...`);

        // 1. Set Loading State & Update UI
        this.gameStateManager.setGameState(GameStates.LOADING_LEVEL);

        // 2. Unload Current Level Assets & State (if necessary)
        console.log("[Game] Unloading current level (if necessary)...");
        if (this.levelManager.getCurrentLevelId()) {
             this.levelManager.unloadCurrentLevel();
             this.chunkManager.clearAllChunks();
             this._clearAtmosphericElements();
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
            this.player.model.position.set(0, 10, 5);
            this.player.model.rotation.set(0, 0, 0);
            this.player.currentSpeed = GlobalConfig.PLAYER_SPEED;
            if (!this.player.model.parent) {
                 this.scene.add(this.player.model);
                 console.log("[Game] Player model added to scene.");
            }
        }
        const scoreToReset = this.score;
        this.score = 0;
        if (scoreToReset > 0) {
             this.eventBus.emit('scoreChanged', -scoreToReset);
        }
        this.playerAnimationTime = 0;

        // 9. Load Initial Chunks for New Level
        console.log("[Game] Loading initial chunks for new level...");
        await this.chunkManager.loadInitialChunks((loaded, total) => {
            this.uiManager.updateLoadingProgress(loaded, total);
        });

        // 10. Finalize Transition
        console.log(`[Game] Level ${levelId} loaded successfully.`);
        this.gameStateManager.setGameState(GameStates.PLAYING);
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
            this.gameStateManager.setGameState(GameStates.PAUSED);
            console.log("[Game] Paused.");
        }
    }

    resumeGame() {
        if (this.gameStateManager.getCurrentState() === GameStates.PAUSED) {
            this.eventBus.emit('uiButtonClicked');
            this.gameStateManager.setGameState(GameStates.PLAYING);
            console.log("[Game] Resumed.");
        }
    }

    restartLevel() {
        const currentLevelId = this.levelManager.getCurrentLevelId();
        if (currentLevelId && !this.isTransitioning) {
             console.log(`[Game] Restarting level: ${currentLevelId}`);
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

         // Don't unload level, remove player/atmospheric elements
         this._clearAtmosphericElements();
         if (this.player.model && this.player.model.parent) {
             this.player.model.parent.remove(this.player.model);
         }

         // Set state to trigger smooth transition in animate loop
         this.gameStateManager.setGameState(GameStates.TRANSITIONING_TO_TITLE);
         // Camera reset/drift init happens when state actually becomes TITLE
    }

    handleGameOver() {
        if (this.gameStateManager.getCurrentState() !== GameStates.PLAYING) return;
        console.log("[Game] Handling Game Over");
        this.gameStateManager.setGameState(GameStates.GAME_OVER);
        this.eventBus.emit('gameOverInfo', this.score);
    }

     // --- Input Handling ---
     handleGlobalKeys(event) {
         const currentState = this.gameStateManager.getCurrentState();

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

         if (event.key.toLowerCase() === 'l' && currentState === GameStates.TITLE) {
             console.log("[Game] Level select triggered.");
             this.gameStateManager.setGameState(GameStates.LEVEL_SELECT);
             const availableLevels = this.levelManager.getAvailableLevels();
             this.uiManager.populateLevelSelect(availableLevels, this.startGame.bind(this));
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
    _transitionCameraToTitle(deltaTime) {
        if (!this.camera) return;

        // Smoothly interpolate position towards the initial title position
        const targetPosition = this.initialCameraPosition;
        this.camera.position.lerp(targetPosition, TITLE_TRANSITION_SPEED * deltaTime);

        // Smoothly interpolate lookAt towards the title target (origin)
        // We can lerp the camera's quaternion towards a target quaternion
        const currentQuaternion = this.camera.quaternion.clone();
        const targetRotationMatrix = new THREE.Matrix4();
        targetRotationMatrix.lookAt(this.camera.position, TITLE_LOOK_AT_TARGET, this.camera.up);
        const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(targetRotationMatrix);

        // Slerp (Spherical Linear Interpolation) for smoother rotation
        currentQuaternion.slerp(targetQuaternion, TITLE_TRANSITION_SPEED * deltaTime);
        this.camera.quaternion.copy(currentQuaternion);

        // Check if close enough to target position to switch state
        if (this.camera.position.distanceToSquared(targetPosition) < TITLE_TRANSITION_THRESHOLD_SQ) {
            console.log("[Game] Camera transition to title complete.");
            this.camera.position.copy(targetPosition); // Snap to final position
            this.camera.lookAt(TITLE_LOOK_AT_TARGET); // Ensure final lookAt
            this.gameStateManager.setGameState(GameStates.TITLE); // Switch to title state
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