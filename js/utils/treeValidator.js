// js/utils/treeValidator.js
import { createLogger } from './logger.js';
import { modelsConfig as C_MODELS } from '../config/models.js';

const logger = createLogger('TreeValidator');

/**
 * Creates a global function for the user to validate trees in the scene.
 * This function examines all trees currently loaded in the scene and 
 * reports if any are missing parts.
 */
export function setupTreeValidator() {
    window.validateTrees = function() {
        // Use the current scene from the global game instance if available
        const scene = window.game?.scene;
        if (!scene) {
            console.error("Game scene not available. Make sure the game is running.");
            return { success: false, error: "Game scene not available" };
        }
        
        const config = C_MODELS.TREE_PINE;
        const results = {
            totalTrees: 0,
            completeTrees: 0,
            incompleteTrees: 0,
            missingTrunks: 0,
            missingFoliage: 0,
            issues: [],
            success: true
        };
        
        // Search the scene for tree_pine objects
        scene.traverse(object => {
            // Check if this is a tree group
            if (object.userData?.objectType === 'tree_pine' || 
                object.name?.includes('tree_pine')) {
                
                results.totalTrees++;
                let hasTrunk = false;
                let hasFoliage = false;
                
                // Check all children to see if trunk and foliage are present
                object.traverse(child => {
                    if (child.name === config.TRUNK_NAME) hasTrunk = true;
                    if (child.name === config.FOLIAGE_NAME) hasFoliage = true;
                });
                
                if (hasTrunk && hasFoliage) {
                    results.completeTrees++;
                } else {
                    results.incompleteTrees++;
                    if (!hasTrunk) results.missingTrunks++;
                    if (!hasFoliage) results.missingFoliage++;
                    
                    // Record position of incomplete tree for debugging
                    results.issues.push({
                        position: object.position.clone(),
                        hasTrunk: hasTrunk,
                        hasFoliage: hasFoliage,
                        name: object.name,
                        id: object.id
                    });
                }
            }
        });
        
        // Log the results
        console.log("%c=== TREE VALIDATION RESULTS ===", "color: green; font-weight: bold;");
        console.log(`Total trees found: ${results.totalTrees}`);
        console.log(`Complete trees: ${results.completeTrees}`);
        
        if (results.incompleteTrees > 0) {
            console.log(`%cINCOMPLETE TREES: ${results.incompleteTrees}`, "color: red; font-weight: bold;");
            console.log(`Missing trunks: ${results.missingTrunks}`);
            console.log(`Missing foliage: ${results.missingFoliage}`);
            console.log("Issues:", results.issues);
            results.success = false;
        } else {
            console.log("%cAll trees are complete! 🌲", "color: green; font-weight: bold;");
        }
        
        return results;
    };
    
    // Function to fix all incomplete trees
    window.fixIncompleteTrees = function() {
        const validation = window.validateTrees();
        if (validation.success) {
            console.log("No incomplete trees to fix!");
            return;
        }
        
        let fixedCount = 0;
        const config = C_MODELS.TREE_PINE;
        
        // For each incomplete tree, attempt to repair it
        validation.issues.forEach(issue => {
            // Find the tree in the scene
            const scene = window.game?.scene;
            let tree = null;
            
            scene.traverse(object => {
                if (object.id === issue.id) {
                    tree = object;
                }
            });
            
            if (!tree) {
                console.warn(`Could not find tree with ID ${issue.id}`);
                return;
            }
            
            // Import the new robust tree module and replace the incomplete tree
            import('../rendering/models/robustTree.js')
                .then(robustTree => {
                    // Create a new tree
                    const newTree = robustTree.createTreeAtPosition(
                        tree.position.clone(),
                        {
                            rotation: tree.rotation.y,
                            scale: tree.scale.x,
                            userData: tree.userData
                        }
                    );
                    
                    // Replace the broken tree
                    if (tree.parent) {
                        tree.parent.add(newTree);
                        tree.parent.remove(tree);
                        fixedCount++;
                        console.log(`Fixed tree at position (${issue.position.x.toFixed(2)}, ${issue.position.y.toFixed(2)}, ${issue.position.z.toFixed(2)})`);
                    }
                })
                .catch(error => {
                    console.error("Error importing robustTree:", error);
                });
        });
        
        console.log(`Attempted to fix ${validation.issues.length} trees. Check with validateTrees() again in a moment.`);
    };
    
    logger.info("Tree validator functions registered. Use validateTrees() and fixIncompleteTrees() in the console.");
}

// Export a method to check a single tree
export function validateSingleTree(tree) {
    if (!tree) return { valid: false, error: "No tree provided" };
    
    const config = C_MODELS.TREE_PINE;
    let hasTrunk = false;
    let hasFoliage = false;
    
    tree.traverse(child => {
        if (child.name === config.TRUNK_NAME) hasTrunk = true;
        if (child.name === config.FOLIAGE_NAME) hasFoliage = true;
    });
    
    return {
        valid: hasTrunk && hasFoliage,
        hasTrunk,
        hasFoliage,
        position: tree.position.clone(),
        id: tree.id,
        name: tree.name
    };
}