import * as THREE from 'three';
import { ChunkManager } from '../managers/chunkManager.js';
import { EnemyManager } from '../managers/enemyManager.js';
import { SpatialGrid } from '../physics/spatialGrid.js';
import { ParticleManager } from '../managers/particleManager.js';
import { setupPlayerControls, initInputStateManager } from '../input/controlsSetup.js';
import { setDeviceClass } from '../utils/deviceUtils.js';
import { createPlayerCharacter } from '../entities/playerCharacter.js';
import { performanceManager } from '../config/config.js';
import { worldConfig } from '../config/world.js';
import { playerConfig } from '../config/player.js';
import * as AudioManager from '../managers/audioManager.js';
import { initScene, createFpsCounter } from '../rendering/sceneSetup.js';
import * as LevelManager from '../managers/levelManager.js';
import gameStateManager, { GameStates } from './gameStateManager.js';
import eventBus from './eventBus.js';
import { initPlayerController, updatePlayer as updatePlayerController } from '../entities/playerController.js';
import { initCollisionManager, checkCollisions } from '../managers/collisionManager.js';
import * as ScoreManager from '../managers/scoreManager.js';
import * as UIManager from '../managers/uiManager.js';
import * as AssetManager from '../managers/assetManager.js';
import cameraManager from '../managers/cameraManager.js';
import sceneTransitionManager from '../managers/sceneTransitionManager.js';
import atmosphericManager from '../managers/atmosphericManager.js';
import treeFixerManager from '../managers/treeFixerManager.js';
import { createLogger } from '../utils/logger.js';
import { validateSingleTree } from '../utils/treeValidator.js';
import * as ModelFactory from '../rendering/modelFactory.js';

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
        setDeviceClass();
        performanceManager.init();
        const fpsCounter = createFpsCounter();

        if (!UIManager.initUIManager()) {
            logger.error("UI Manager initialization failed.");
            return null;
        }

        UIManager.updateScoreDisplay(0, false, true);
        UIManager.updateHighScoreDisplay(ScoreManager.getGlobalHighScore());

        const initialLevelId = 'level1';
        const levelLoaded = await LevelManager.loadLevel(initialLevelId);
        if (!levelLoaded) {
            logger.error("Initial level configuration loading failed.");
            return null;
        }
        const currentLevelConfig = LevelManager.getCurrentConfig();

        await AssetManager.initLevelAssets(currentLevelConfig);

        const { scene, camera, renderer } = initScene(canvasElement, currentLevelConfig);

        const playerModelData = createPlayerCharacter();
        const player = {
            model: playerModelData.characterGroup,
            modelParts: playerModelData,
            currentSpeed: playerConfig.SPEED,
            powerup: '',
        };
        player.model.position.set(playerConfig.INITIAL_POS_X, playerConfig.INITIAL_POS_Y, playerConfig.INITIAL_POS_Z);

        cameraManager.setCamera(camera);
        cameraManager.setRenderer(renderer);
        sceneTransitionManager.setRenderer(renderer);
        sceneTransitionManager.setCamera(camera);
        sceneTransitionManager.setPlayer(player); // Pass player object
        atmosphericManager.setPlayerReference(player); // Pass player object
        atmosphericManager.setTargetScene(scene); // Initial scene
        
        // Initialize the tree fixer manager
        treeFixerManager.setScene(scene);

        const spatialGrid = new SpatialGrid(worldConfig.GRID_CELL_SIZE);
        const enemyManager = new EnemyManager(scene, spatialGrid);
        const chunkManager = new ChunkManager(scene, enemyManager, spatialGrid, currentLevelConfig);
        const particleManager = new ParticleManager(scene);
        LevelManager.setManagers(chunkManager, enemyManager);

        const raycaster = new THREE.Raycaster();
        initPlayerController(raycaster);
        initCollisionManager(spatialGrid, chunkManager);
        const collisionChecker = checkCollisions;

        setupPlayerControls(renderer.domElement);
        initInputStateManager();

        // Don't initialize audio yet - we'll do it after user interaction
        // Just set up the event listeners
        logger.info("Audio will be initialized after user interaction");
        
        // Set a flag to indicate we need to show the Click to Start screen
        window.needsAudioUnlock = true;
        window.audioUnlocked = false;
        
        // Create a global function to initialize audio after user interaction
        window.initializeAudioAfterInteraction = async function() {
            if (!window.audioInitialized) {
                window.audioInitialized = true;
                logger.info("Initializing audio after user interaction");
                await AudioManager.initAudio();
                
                // If we're already at the title screen, play the theme music
                if (gameStateManager.getCurrentState() === GameStates.TITLE) {
                    logger.info("Playing theme music after delayed audio initialization");
                    await AudioManager.playMusic('theme');
                }
            }
        };
        
        // We'll let the Click to Start screen handle the user interaction now
        // so we don't need these global listeners anymore

        gameStateManager.setGameState(GameStates.LOADING);
        await chunkManager.loadInitialChunks((loaded, total) => {
            UIManager.updateLoadingProgress(loaded, total);
        });

        // Set to title state
        gameStateManager.setGameState(GameStates.TITLE);
        
        // Create tree debugging helpers
        createTreeDebugHelpers(scene);
        
        // Create global function to fix all trees
        window.fixAllTrees = function() {
            console.warn("Fixing all trees in scene...");
            
            import('../utils/treeReplacer.js').then(module => {
                // This will replace ALL trees in a 100 unit radius around the player
                const replacedCount = module.replaceTreesAroundPlayer(scene, 100);
                console.warn(`Replaced ${replacedCount} trees around the player`);
                return replacedCount;
            }).catch(error => {
                console.error("Error importing tree replacer:", error);
                return -1;
            });
        };
        
        // Add a more powerful nuke option that rebuilds ALL trees
        window.nukeAllTrees = function() {
            console.warn("NUCLEAR OPTION: Replacing ALL trees in scene...");
            
            import('../utils/treeReplacer.js').then(module => {
                // Find the center of the world
                const worldCenter = new THREE.Vector3(0, 0, 0);
                // Replace all trees within a massive radius
                const replacedCount = module.replaceTreesInArea(scene, worldCenter, 1000);
                console.warn(`Replaced ${replacedCount} trees in the entire scene`);
                return replacedCount;
            }).catch(error => {
                console.error("Error importing tree replacer:", error);
                return -1;
            });
        };
        
        // Define a global debug helper function
        function createTreeDebugHelpers(gameScene) {
            // Create a global function to debug trees
            window.debugTrees = function() {
                console.warn("Scanning for trees in scene...");
                
                // Safety check
                if (!gameScene) {
                    console.error("Scene is not available - can't debug trees");
                    return { error: "No scene available" };
                }
                
                // Find all trees in the scene
                const treesFound = [];
                gameScene.traverse(object => {
                    if (object.userData && object.userData.objectType === 'tree_pine') {
                        treesFound.push(object);
                    }
                });
                
                console.warn(`Found ${treesFound.length} trees in scene`);
                
                // Check completeness
                let completeCount = 0;
                let missingTopCount = 0;
                let missingTrunkCount = 0;
                
                // Hardcode the names instead of using C_MODELS
                const trunkName = 'treeTrunk';
                const foliageName = 'treeFoliage';
                
                treesFound.forEach(tree => {
                    let hasTrunk = false;
                    let hasFoliage = false;
                    
                    // Check for trunk and foliage directly
                    tree.traverse(child => {
                        if (child.name === trunkName) hasTrunk = true;
                        if (child.name === foliageName) hasFoliage = true;
                    });
                    
                    if (hasTrunk && hasFoliage) {
                        completeCount++;
                    } else if (hasTrunk && !hasFoliage) {
                        missingTopCount++;
                        console.warn(`Tree missing top at position: (${tree.position.x.toFixed(2)}, ${tree.position.y.toFixed(2)}, ${tree.position.z.toFixed(2)})`);
                    } else if (!hasTrunk && hasFoliage) {
                        missingTrunkCount++;
                        console.warn(`Tree missing trunk at position: (${tree.position.x.toFixed(2)}, ${tree.position.y.toFixed(2)}, ${tree.position.z.toFixed(2)})`);
                    }
                });
                
                console.warn(`Tree statistics: ${treesFound.length} total, ${completeCount} complete, ${missingTopCount} missing tops, ${missingTrunkCount} missing trunks`);
                
                return {
                    total: treesFound.length,
                    complete: completeCount,
                    missingTop: missingTopCount,
                    missingTrunk: missingTrunkCount,
                    repair: function() {
                        console.warn("Attempting to repair all broken trees...");
                        let repaired = 0;
                        
                        treesFound.forEach(tree => {
                            // Use validateSingleTree to check the tree
                            const treeCheck = validateSingleTree(tree);
                            
                            if (!treeCheck.valid) {
                                // The tree is incomplete - create a completely new one
                                try {
                                    // Use dynamic import for robustTree
                                    import('../rendering/models/robustTree.js').then(robustTree => {
                                        // Create a new robust tree at the same position
                                        const newTree = robustTree.createTreeAtPosition(
                                            tree.position.clone(),
                                            {
                                                rotation: tree.rotation.y,
                                                scale: tree.scale.x,
                                                userData: tree.userData
                                            }
                                        );
                                        
                                        // Replace the old tree with the new one
                                        if (tree.parent) {
                                            tree.parent.add(newTree);
                                            tree.parent.remove(tree);
                                            repaired++;
                                        }
                                    }).catch(error => {
                                        console.error("Error importing robustTree:", error);
                                        
                                        // Fallback to old method if import fails
                                        const newTree = ModelFactory.createTreeMesh();
                                        newTree.position.copy(tree.position);
                                        newTree.rotation.copy(tree.rotation);
                                        newTree.scale.copy(tree.scale);
                                        
                                        // Copy over userData
                                        Object.keys(tree.userData).forEach(key => {
                                            if (key !== 'trunkMesh' && key !== 'foliageMesh') {
                                                newTree.userData[key] = tree.userData[key];
                                            }
                                        });
                                        
                                        // Replace the old tree with the new one
                                        if (tree.parent) {
                                            tree.parent.add(newTree);
                                            tree.parent.remove(tree);
                                            repaired++;
                                        }
                                    });
                                } catch (error) {
                                    console.error("Error repairing tree:", error);
                                }
                            }
                        });
                        
                        console.warn(`Repaired ${repaired} trees`);
                        return repaired;
                    }
                };
            };
        }
        
        // Create debug functions with access to the current scene
        createTreeDebugHelpers(scene);
        
        // Explicitly try to play theme music after a delay
        setTimeout(async () => {
            if (gameStateManager.getCurrentState() === GameStates.TITLE) {
                logger.debug("Explicitly starting theme music after initialization");
                try {
                    await AudioManager.forceResetMusicState();
                    await AudioManager.playMusic('theme');
                    logger.debug("Theme music started successfully");
                } catch (e) {
                    logger.error("Failed to start theme music:", e);
                }
            }
        }, 1000);

        logger.info("Game initialization complete.");

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
            playerController: { updatePlayer: updatePlayerController },
            spatialGrid,
            uiManager: UIManager,
            atmosphericManager,
            fpsCounter,
            currentLevelConfig,
            eventBus
        };

    } catch (error) {
        logger.error("CRITICAL ERROR during game initialization:", error);
        UIManager.displayError(new Error("Game initialization failed critically. Check console."));
        return null;
    }
}