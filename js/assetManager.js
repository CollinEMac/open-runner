// js/assetManager.js
import * as THREE from 'three'; // Keep existing import
import * as UIManager from './uiManager.js'; // Import UI Manager for error display
// Removed duplicate import of THREE
import * as GlobalConfig from './config.js'; // Renamed import

// --- Private Asset Storage ---
// Changed to hold assets for the currently loaded level
let levelAssets = {};

/**
 * Initializes and stores shared assets like geometries and materials.
 * Should be called once during application startup.
 */
export function initLevelAssets(levelConfig) { // Renamed and added levelConfig
    console.log("[AssetManager] Initializing assets for level...");

    // Clear previous level's assets first
    disposeLevelAssets();
    levelAssets = {}; // Reset the storage

    if (!levelConfig) {
        // Display error if levelConfig is missing during asset initialization
        UIManager.displayError(new Error("[AssetManager] Cannot initialize assets without levelConfig!"));
        return;
    }

    // --- Coin ---
    // --- Coin --- (Assuming coin visuals might change per level, use config)
    const coinVis = levelConfig.COIN_VISUALS || { radius: 0.75, height: 0.2, color: 0xFFFF00 }; // Fallback defaults
    levelAssets.coinGeometry = new THREE.CylinderGeometry(coinVis.radius, coinVis.radius, coinVis.height, 16);
    levelAssets.coinGeometry.rotateX(Math.PI / 2); // Orient coin flat
    levelAssets.coinMaterial = new THREE.MeshStandardMaterial({ color: coinVis.color, metalness: 0.3, roughness: 0.4 });

    // --- Powerups ---
    // --- Magnet ---
    const magnetVis = levelConfig.MAGNET_VISUALS || { size: 0.8, color: 0xF60000 };
    // Create a horseshoe magnet model instead of using a simple cylinder
    levelAssets.magnetGroup = createMagnetModel(magnetVis);
    // Create a material for the magnet
    levelAssets.magnetMaterial = new THREE.MeshStandardMaterial({
      color: magnetVis.color,
      emissive: 0x330000,
      metalness: 0.8,
      roughness: 0.10
    });

    // --- Obstacles ---
    // --- Obstacles (Initialize based on levelConfig.OBJECT_TYPES) ---
    // Generic materials first (can be overridden if needed)
    levelAssets.rockMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
    levelAssets.logMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }); // Saddle brown
    levelAssets.cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xDEB887, roughness: 0.8 }); // Burlywood
    // Add materials for desert objects if defined in config (Phase 2)
    levelAssets.cactusMaterial = new THREE.MeshStandardMaterial({ color: 0x2E8B57, roughness: 0.7 }); // SeaGreen
    levelAssets.saloonMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D, roughness: 0.8 }); // Sienna (wood)
    // ... other desert materials ...

    // Geometries (Create geometries found in the current level's OBJECT_TYPES)
    const objectTypes = levelConfig.OBJECT_TYPES || [];
    objectTypes.forEach(objType => {
        switch (objType.type) {
            case 'rock_small':
                if (!levelAssets.rockSmallGeo) levelAssets.rockSmallGeo = new THREE.SphereGeometry(1, 8, 6);
                break;
            case 'rock_large':
                if (!levelAssets.rockLargeGeo) levelAssets.rockLargeGeo = new THREE.SphereGeometry(2.5, 10, 8);
                break;
            case 'log_fallen':
                if (!levelAssets.logFallenGeo) levelAssets.logFallenGeo = new THREE.CylinderGeometry(0.5, 0.5, 5, 8);
                break;
            case 'cabin_simple':
                if (!levelAssets.cabinGeo) levelAssets.cabinGeo = new THREE.BoxGeometry(8, 6, 10);
                break;
            case 'rock_desert': // Placeholder for Level 2
                 if (!levelAssets.rockDesertGeo) levelAssets.rockDesertGeo = new THREE.DodecahedronGeometry(1.5, 0); // More jagged rock
                 break;
            // Add cases for desert objects
            case 'cactus_saguaro':
                // Geometry created dynamically in factory function
                break;
            case 'cactus_barrel':
                 if (!levelAssets.cactusBarrelGeo) levelAssets.cactusBarrelGeo = new THREE.CylinderGeometry(1.0, 1.2, 1.5, 12);
                 break;
            case 'saloon':
                 if (!levelAssets.saloonGeo) levelAssets.saloonGeo = new THREE.BoxGeometry(12, 8, 15); // Match factory
                 break;
            case 'railroad_sign':
                 // Geometry created dynamically in factory function
                 break;
            case 'skull':
                 if (!levelAssets.skullGeo) levelAssets.skullGeo = new THREE.IcosahedronGeometry(0.5, 0);
                 break;
            case 'dried_bush':
                 if (!levelAssets.driedBushGeo) levelAssets.driedBushGeo = new THREE.IcosahedronGeometry(0.8, 0);
                 break;
            case 'wagon_wheel':
                 if (!levelAssets.wagonWheelGeo) levelAssets.wagonWheelGeo = new THREE.TorusGeometry(1.0, 0.15, 6, 12);
                 break;
            case 'mine_entrance':
                 // Geometry created dynamically in factory function
                 break;
            case 'water_tower':
                 // Geometry created dynamically in factory function
                 break;
            case 'tumbleweed':
                 if (!levelAssets.tumbleweedGeo) levelAssets.tumbleweedGeo = new THREE.IcosahedronGeometry(1.0, 1);
                 break;
        }
    });

    // --- Tree Components ---
    // Note: Tree geometry/mesh creation might be better suited for a factory function
    // if trees become more complex, but materials can be shared.
    // --- Tree Components (Only if 'tree_pine' is in OBJECT_TYPES) ---
    if (objectTypes.some(t => t.type === 'tree_pine')) {
        levelAssets.treeFoliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.7 }); // Forest green
        levelAssets.treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }); // Saddle brown
    }

    console.log("[AssetManager] Level assets initialized:", Object.keys(levelAssets));
}

/**
 * Retrieves a pre-initialized asset by key.
 * @param {string} key - The key of the asset (e.g., 'coinGeometry', 'rockMaterial').
 * @returns {THREE.BufferGeometry | THREE.Material | undefined} The requested asset or undefined if not found.
 */
export function getAsset(key) {
    if (!levelAssets[key]) {
        // It's possible an asset is requested before the level is fully loaded, or it's missing from config
        console.warn(`[AssetManager] Asset with key "${key}" not found in currently loaded level assets.`);
    }
    return levelAssets[key];
}

// --- Optional: Factory Functions for Complex Objects ---
// Example for creating a tree mesh - could be expanded
/**
 * Creates a simple pine tree mesh group.
 * @returns {THREE.Group}
 */
export function createTreeMesh(levelConfig) { // Accept levelConfig (though not strictly needed if materials are preloaded)
    const treeGroup = new THREE.Group();

    const trunkHeight = 4;
    const trunkRadius = 0.5;
    const foliageHeight = 12;
    const foliageRadius = 3.5;

    // Get materials with error checking
    const trunkMaterial = getAsset('treeTrunkMaterial');
    const foliageMaterial = getAsset('treeFoliageMaterial');

    // Check if materials are available
    if (!trunkMaterial || !foliageMaterial) {
        console.error('[AssetManager] Missing tree materials:',
                     !trunkMaterial ? 'treeTrunkMaterial' : '',
                     !foliageMaterial ? 'treeFoliageMaterial' : '');
        // Create fallback materials if needed
        if (!trunkMaterial) {
            console.warn('[AssetManager] Creating fallback trunk material');
            levelAssets.treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
        }
        if (!foliageMaterial) {
            console.warn('[AssetManager] Creating fallback foliage material');
            levelAssets.treeFoliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.7 });
        }
    }

    // Create trunk
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius, trunkHeight, 8);
    const trunkMesh = new THREE.Mesh(trunkGeometry, getAsset('treeTrunkMaterial'));
    trunkMesh.position.y = trunkHeight / 2;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    trunkMesh.name = 'treeTrunk'; // Add name for debugging
    treeGroup.add(trunkMesh);

    // Create foliage
    const foliageGeometry = new THREE.ConeGeometry(foliageRadius, foliageHeight, 8);
    const foliageMesh = new THREE.Mesh(foliageGeometry, getAsset('treeFoliageMaterial'));
    foliageMesh.position.y = trunkHeight + foliageHeight / 2;
    foliageMesh.castShadow = true;
    foliageMesh.receiveShadow = true;
    foliageMesh.name = 'treeFoliage'; // Add name for debugging
    treeGroup.add(foliageMesh);

    // Verify that both parts were added
    if (treeGroup.children.length !== 2) {
        console.warn(`[AssetManager] Tree has ${treeGroup.children.length} parts instead of 2`);
    }

    return treeGroup;
}



// --- Enemy Model Factory Functions ---

// Helper Function (Internal to AssetManager)
function createBoxPart(width, height, depth, color, roughness = 0.7) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: roughness
    });
    const part = new THREE.Mesh(geometry, material);
    part.castShadow = true;
    // part.receiveShadow = true; // Optional, might impact performance
    return part;
}

// Helper function to create detailed eyes for animals
function createEyes(headWidth, headPosition, color = 0x000000, size = 0.1) {
    const group = new THREE.Group();

    // Create eye material (black by default)
    const eyeMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.2
    });

    // Create white part of the eye for more realism
    const eyeWhiteMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        roughness: 0.3,
        metalness: 0.0
    });

    // Create eye geometry with more segments for smoother appearance
    const eyeGeometry = new THREE.SphereGeometry(size, 12, 12);
    const eyeWhiteGeometry = new THREE.SphereGeometry(size * 1.3, 12, 12);

    // Create left and right eye whites (larger spheres behind the pupils)
    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
    const rightEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);

    // Create left and right eye pupils (smaller black spheres)
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);

    // Position eyes on the head
    const eyeOffset = headWidth * 0.25;
    const eyeDepth = headPosition.z - headWidth * 0.4;

    // Position eye whites
    leftEyeWhite.position.set(-eyeOffset, headPosition.y, eyeDepth);
    rightEyeWhite.position.set(eyeOffset, headPosition.y, eyeDepth);

    // Position pupils slightly in front of whites
    leftEye.position.set(-eyeOffset, headPosition.y, eyeDepth - size * 0.5);
    rightEye.position.set(eyeOffset, headPosition.y, eyeDepth - size * 0.5);

    // Add all parts to the group
    group.add(leftEyeWhite);
    group.add(rightEyeWhite);
    group.add(leftEye);
    group.add(rightEye);

    return group;
}

// Helper function to create a more detailed snout/nose for animals
function createSnout(headPosition, color, width = 0.3, height = 0.3, depth = 0.3) {
    const group = new THREE.Group();

    // Create a slightly darker color for the snout
    const snoutColor = new THREE.Color(color).multiplyScalar(0.9);

    // Create even darker color for the nose tip
    const noseTipColor = new THREE.Color(color).multiplyScalar(0.7);

    // Create snout geometry with more segments for smoother appearance
    const snoutGeometry = new THREE.BoxGeometry(width, height, depth, 3, 3, 3);
    const snoutMaterial = new THREE.MeshStandardMaterial({
        color: snoutColor.getHex(),
        roughness: 0.9
    });
    const snout = new THREE.Mesh(snoutGeometry, snoutMaterial);
    snout.castShadow = true;

    // Add a nose tip (small sphere at the end of the snout)
    const noseTipGeometry = new THREE.SphereGeometry(width * 0.3, 8, 8);
    const noseTipMaterial = new THREE.MeshStandardMaterial({
        color: noseTipColor.getHex(),
        roughness: 0.7
    });
    const noseTip = new THREE.Mesh(noseTipGeometry, noseTipMaterial);
    noseTip.position.set(0, 0, -depth * 0.6); // Position at the front of the snout
    noseTip.castShadow = true;

    // Add nose tip to the snout
    snout.add(noseTip);

    // Position snout at the front of the head
    snout.position.set(0, headPosition.y - height * 0.1, headPosition.z - depth * 1.2);

    group.add(snout);
    return group;
}

// Helper function to create more detailed ears for animals
function createEars(headWidth, headHeight, headPosition, color, pointy = false) {
    const group = new THREE.Group();

    // Create ear material (same color as body but slightly darker)
    const earColor = new THREE.Color(color).multiplyScalar(0.9);

    // Create inner ear material (darker pink/red color)
    const innerEarColor = new THREE.Color(0xFF9999);

    // Create ear geometry based on whether they should be pointy
    let leftEar, rightEar, leftInnerEar, rightInnerEar;

    if (pointy) {
        // Pointy ears using cones with more segments for smoother appearance
        const earGeometry = new THREE.ConeGeometry(headWidth * 0.15, headHeight * 0.5, 8);
        const innerEarGeometry = new THREE.ConeGeometry(headWidth * 0.1, headHeight * 0.35, 8);

        // Create outer ear parts
        leftEar = new THREE.Mesh(earGeometry, new THREE.MeshStandardMaterial({
            color: earColor.getHex(),
            roughness: 0.8
        }));
        rightEar = new THREE.Mesh(earGeometry, new THREE.MeshStandardMaterial({
            color: earColor.getHex(),
            roughness: 0.8
        }));

        // Create inner ear parts
        leftInnerEar = new THREE.Mesh(innerEarGeometry, new THREE.MeshStandardMaterial({
            color: innerEarColor.getHex(),
            roughness: 0.7
        }));
        rightInnerEar = new THREE.Mesh(innerEarGeometry, new THREE.MeshStandardMaterial({
            color: innerEarColor.getHex(),
            roughness: 0.7
        }));

        // Position inner ears slightly in front of outer ears
        leftInnerEar.position.z = -0.05;
        rightInnerEar.position.z = -0.05;

        // Add inner ears to outer ears
        leftEar.add(leftInnerEar);
        rightEar.add(rightInnerEar);
    } else {
        // Round ears using ellipsoids (scaled spheres) for more realistic shape
        const earGeometry = new THREE.SphereGeometry(headWidth * 0.2, 12, 12);
        const innerEarGeometry = new THREE.SphereGeometry(headWidth * 0.15, 10, 10);

        // Create outer ear parts
        leftEar = new THREE.Mesh(earGeometry, new THREE.MeshStandardMaterial({
            color: earColor.getHex(),
            roughness: 0.8
        }));
        rightEar = new THREE.Mesh(earGeometry, new THREE.MeshStandardMaterial({
            color: earColor.getHex(),
            roughness: 0.8
        }));

        // Scale to make ears more oval-shaped
        leftEar.scale.set(1, 1.2, 0.7);
        rightEar.scale.set(1, 1.2, 0.7);

        // Create inner ear parts
        leftInnerEar = new THREE.Mesh(innerEarGeometry, new THREE.MeshStandardMaterial({
            color: innerEarColor.getHex(),
            roughness: 0.7
        }));
        rightInnerEar = new THREE.Mesh(innerEarGeometry, new THREE.MeshStandardMaterial({
            color: innerEarColor.getHex(),
            roughness: 0.7
        }));

        // Scale inner ears to match outer ear shape
        leftInnerEar.scale.set(1, 1.2, 0.7);
        rightInnerEar.scale.set(1, 1.2, 0.7);

        // Position inner ears slightly in front of outer ears
        leftInnerEar.position.z = -0.05;
        rightInnerEar.position.z = -0.05;

        // Add inner ears to outer ears
        leftEar.add(leftInnerEar);
        rightEar.add(rightInnerEar);
    }

    // Position ears on top of the head
    const earOffset = headWidth * 0.35;
    leftEar.position.set(-earOffset, headPosition.y + headHeight * 0.4, headPosition.z);
    rightEar.position.set(earOffset, headPosition.y + headHeight * 0.4, headPosition.z);

    // Rotate pointy ears slightly outward
    if (pointy) {
        leftEar.rotation.z = Math.PI / 12;
        rightEar.rotation.z = -Math.PI / 12;
    }

    leftEar.castShadow = true;
    rightEar.castShadow = true;

    group.add(leftEar);
    group.add(rightEar);

    return group;
}

// Helper function to create an improved tail
function createImprovedTail(basePosition, color, length = 1.0, width = 0.3, curved = true) {
    const group = new THREE.Group();

    if (curved) {
        // Create a curved tail using multiple segments
        const segments = 4;
        const segmentLength = length / segments;
        const segmentWidth = width;

        let currentPos = new THREE.Vector3().copy(basePosition);
        let currentAngle = 0;

        for (let i = 0; i < segments; i++) {
            const segment = createBoxPart(segmentWidth, segmentWidth, segmentLength, color);
            segment.position.copy(currentPos);

            // Gradually curve the tail
            const curveAngle = Math.PI / 8 * (i / segments);
            segment.rotation.x = currentAngle;

            group.add(segment);

            // Update position for next segment
            currentPos.z += Math.cos(currentAngle) * segmentLength;
            currentPos.y += Math.sin(currentAngle) * segmentLength;
            currentAngle += curveAngle;
        }
    } else {
        // Simple straight tail
        const tail = createBoxPart(width, width, length, color);
        tail.position.copy(basePosition);
        group.add(tail);
    }

    return group;
}

/**
 * Creates an improved bear model mesh group with facial features.
 * @returns {THREE.Group}
 */
export function createBearModel(properties) {
    const group = new THREE.Group();
    const color = properties?.color || 0x8B4513; // Use passed color or fallback

    // --- Grizzly Bear Dimensions ---
    const torsoWidth = 3.5;
    const torsoHeight = 2.5;
    const torsoDepth = 5.0;
    const headWidth = 1.8;
    const headHeight = 1.5;
    const headDepth = 1.5;
    const legWidth = 0.8;
    const legHeight = 2.0; // Increased height
    const legDepth = 0.8;

    // Torso - use a slightly rounded geometry for better appearance
    const torsoGeometry = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth, 2, 2, 2);
    const torsoMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.8
    });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.castShadow = true;

    // Position torso center based on new leg height
    const torsoY = legHeight / 2 + torsoHeight / 2 - 0.2; // Adjust slightly down
    torso.position.y = torsoY;
    group.add(torso);

    // Head - use a slightly rounded geometry for better appearance
    const headGeometry = new THREE.BoxGeometry(headWidth, headHeight, headDepth, 2, 2, 2);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.castShadow = true;

    // Position head relative to the front-top of the torso
    head.position.set(0, torsoY + torsoHeight * 0.4, -torsoDepth / 2 - headDepth * 0.3);
    group.add(head);

    // Add eyes
    const eyes = createEyes(headWidth, head.position, 0x000000, 0.15);
    group.add(eyes);

    // Add snout/nose
    const snout = createSnout(head.position, color, 0.9, 0.7, 0.8);
    group.add(snout);

    // Add ears
    const ears = createEars(headWidth, headHeight, head.position, color, false);
    group.add(ears);

    // Legs (improved with slightly rounded edges)
    const legY = legHeight / 2; // Center leg geometry at half its height, base will be at 0

    // Calculate leg positions based on torso dimensions
    const legXOffset = torsoWidth / 2 - legWidth * 0.4; // Place legs slightly inwards
    const frontLegZ = -torsoDepth / 2 + legDepth * 0.6; // Place front legs forward
    const backLegZ = torsoDepth / 2 - legDepth * 0.6; // Place back legs backward

    // Create legs with slightly rounded edges
    const legGeometry = new THREE.BoxGeometry(legWidth, legHeight, legDepth, 2, 2, 2);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.8
    });

    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.castShadow = true;
    frontLeftLeg.position.set(-legXOffset, legY, frontLegZ);
    group.add(frontLeftLeg);

    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.castShadow = true;
    frontRightLeg.position.set(legXOffset, legY, frontLegZ);
    group.add(frontRightLeg);

    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.castShadow = true;
    backLeftLeg.position.set(-legXOffset, legY, backLegZ);
    group.add(backLeftLeg);

    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.castShadow = true;
    backRightLeg.position.set(legXOffset, legY, backLegZ);
    group.add(backRightLeg);

    // Store leg references for animation
    group.userData.legs = { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg };
    group.userData.legHeight = legHeight; // Store height for grounding offset

    return group;
}

/**
 * Creates an improved squirrel model mesh group with facial features.
 * @returns {THREE.Group}
 */
export function createSquirrelModel(properties) {
    const group = new THREE.Group();
    const color = properties?.color || 0xA0522D; // Use passed color or fallback

    // Torso (Dog-sized - larger than before)
    const torsoWidth = 0.8;
    const torsoHeight = 0.7;
    const torsoDepth = 1.5;

    // Create torso with slightly rounded edges
    const torsoGeometry = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth, 2, 2, 2);
    const torsoMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.castShadow = true;
    torso.position.y = 0.5; // Center torso above origin
    group.add(torso);

    // Head with rounded edges
    const headWidth = 0.6;
    const headHeight = 0.5;
    const headDepth = 0.5;
    const headGeometry = new THREE.BoxGeometry(headWidth, headHeight, headDepth, 2, 2, 2);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.castShadow = true;
    head.position.set(0, torso.position.y + 0.2, -0.8); // Front of torso
    group.add(head);

    // Add eyes (smaller for squirrel)
    const eyes = createEyes(headWidth, head.position, 0x000000, 0.08);
    group.add(eyes);

    // Add small snout/nose
    const snout = createSnout(head.position, color, 0.3, 0.25, 0.25);
    group.add(snout);

    // Add ears (pointy for squirrel)
    const ears = createEars(headWidth, headHeight, head.position, color, true);
    group.add(ears);

    // Legs (shorter)
    const legWidth = 0.25;
    const legHeight = 0.6;
    const legDepth = 0.25;
    const legY = 0;

    // Create legs with slightly rounded edges
    const legGeometry = new THREE.BoxGeometry(legWidth, legHeight, legDepth, 2, 2, 2);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });

    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.castShadow = true;
    frontLeftLeg.position.set(-torsoWidth / 2 + 0.1, legY, -torsoDepth / 2 + 0.2);
    group.add(frontLeftLeg);

    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.castShadow = true;
    frontRightLeg.position.set(torsoWidth / 2 - 0.1, legY, -torsoDepth / 2 + 0.2);
    group.add(frontRightLeg);

    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.castShadow = true;
    backLeftLeg.position.set(-torsoWidth / 2 + 0.1, legY, torsoDepth / 2 - 0.2);
    group.add(backLeftLeg);

    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.castShadow = true;
    backRightLeg.position.set(torsoWidth / 2 - 0.1, legY, torsoDepth / 2 - 0.2);
    group.add(backRightLeg);

    // Improved bushy tail using multiple segments
    const tailBasePosition = new THREE.Vector3(0, torso.position.y + 0.3, torsoDepth / 2 + 0.2);

    // Create a more complex, curved tail
    const tailSegments = 5;
    const tailWidth = 0.4;
    const tailSegmentLength = 0.3;
    const tailCurve = Math.PI / 4; // Curve angle

    let currentPos = new THREE.Vector3().copy(tailBasePosition);
    let currentAngle = -Math.PI / 6; // Start angled slightly up

    for (let i = 0; i < tailSegments; i++) {
        // Make the middle segments wider for a bushy appearance
        const segmentWidth = tailWidth * (i === 0 || i === tailSegments - 1 ? 0.7 : 1.0);

        const segment = createBoxPart(segmentWidth, segmentWidth, tailSegmentLength, color);
        segment.position.copy(currentPos);
        segment.rotation.x = currentAngle;
        group.add(segment);

        // Update position for next segment
        currentPos.z += Math.cos(currentAngle) * tailSegmentLength;
        currentPos.y += Math.sin(currentAngle) * tailSegmentLength;

        // Curve the tail upward
        currentAngle -= tailCurve / tailSegments;
    }

    // Store leg references for animation
    group.userData.legs = { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg };
    group.userData.legHeight = legHeight; // Store height for grounding offset

    return group;
}

/**
 * Creates an improved deer model mesh group with facial features.
 * @returns {THREE.Group}
 */
export function createDeerModel(properties) {
    const group = new THREE.Group();
    const color = properties?.color || 0xD2B48C; // Use passed color or fallback

    // Torso (Longer and thinner than bear)
    const torsoWidth = 1.2;
    const torsoHeight = 1.3;
    const torsoDepth = 2.8;

    // Create torso with slightly rounded edges
    const torsoGeometry = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth, 2, 2, 2);
    const torsoMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.castShadow = true;
    torso.position.y = 1.0; // Higher off ground
    group.add(torso);

    // Head (Smaller) with rounded edges
    const headWidth = 0.8;
    const headHeight = 0.8;
    const headDepth = 0.9;
    const headGeometry = new THREE.BoxGeometry(headWidth, headHeight, headDepth, 2, 2, 2);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.castShadow = true;
    head.position.set(0, torso.position.y + 0.5, -1.6); // Front of torso
    group.add(head);

    // Add eyes
    const eyes = createEyes(headWidth, head.position, 0x000000, 0.1);
    group.add(eyes);

    // Add snout/nose
    const snout = createSnout(head.position, color, 0.4, 0.3, 0.5);
    group.add(snout);

    // Add ears (pointy for deer)
    const ears = createEars(headWidth, headHeight, head.position, color, true);
    group.add(ears);

    // Neck (Improved with rounded edges)
    const neckWidth = 0.5;
    const neckHeight = 0.5;
    const neckDepth = 0.8;
    const neckGeometry = new THREE.BoxGeometry(neckWidth, neckHeight, neckDepth, 2, 2, 2);
    const neckMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });
    const neck = new THREE.Mesh(neckGeometry, neckMaterial);
    neck.castShadow = true;
    neck.position.set(0, torso.position.y + 0.3, -1.1);
    neck.rotation.x = Math.PI / 6; // Angle neck slightly
    group.add(neck);

    // Legs (Longer and thinner)
    const legWidth = 0.3;
    const legHeight = 1.5;
    const legDepth = 0.3;
    const legY = 0;

    // Create legs with slightly rounded edges
    const legGeometry = new THREE.BoxGeometry(legWidth, legHeight, legDepth, 2, 2, 2);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });

    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.castShadow = true;
    frontLeftLeg.position.set(-0.4, legY, -1.0);
    group.add(frontLeftLeg);

    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.castShadow = true;
    frontRightLeg.position.set(0.4, legY, -1.0);
    group.add(frontRightLeg);

    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.castShadow = true;
    backLeftLeg.position.set(-0.4, legY, 1.0);
    group.add(backLeftLeg);

    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.castShadow = true;
    backRightLeg.position.set(0.4, legY, 1.0);
    group.add(backRightLeg);

    // Improved antlers with multiple branches
    const antlerColor = 0x654321; // Darker brown

    // Create left antler group
    const leftAntlerGroup = new THREE.Group();

    // Main branch
    const mainBranchGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.8, 5);
    const antlerMaterial = new THREE.MeshStandardMaterial({
        color: antlerColor,
        roughness: 0.9
    });

    const leftMainBranch = new THREE.Mesh(mainBranchGeo, antlerMaterial);
    leftMainBranch.position.set(0, 0.4, 0);
    leftMainBranch.rotation.z = Math.PI / 12;
    leftAntlerGroup.add(leftMainBranch);

    // Secondary branches
    const secondaryBranchGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.4, 5);

    const leftBranch1 = new THREE.Mesh(secondaryBranchGeo, antlerMaterial);
    leftBranch1.position.set(0.1, 0.6, 0);
    leftBranch1.rotation.z = Math.PI / 4;
    leftAntlerGroup.add(leftBranch1);

    const leftBranch2 = new THREE.Mesh(secondaryBranchGeo, antlerMaterial);
    leftBranch2.position.set(-0.1, 0.7, 0);
    leftBranch2.rotation.z = -Math.PI / 5;
    leftAntlerGroup.add(leftBranch2);

    // Position the entire antler group
    leftAntlerGroup.position.set(-0.3, head.position.y + 0.4, head.position.z);
    group.add(leftAntlerGroup);

    // Create right antler group (mirror of left)
    const rightAntlerGroup = leftAntlerGroup.clone();
    rightAntlerGroup.position.set(0.3, head.position.y + 0.4, head.position.z);
    rightAntlerGroup.rotation.y = Math.PI; // Flip to mirror
    group.add(rightAntlerGroup);

    // Store leg references for animation
    group.userData.legs = { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg };
    group.userData.legHeight = legHeight; // Store height for grounding offset

    return group;
}
// Placeholder for Phase 1 desert rock
export function createRockDesertModel(properties) {
     const group = new THREE.Group(); // Use group for consistency if needed later
     const geo = getAsset('rockDesertGeo');
     const mat = getAsset('rockMaterial'); // Reuse rock material for now
     if (geo && mat) {
         const mesh = new THREE.Mesh(geo, mat);
         mesh.castShadow = true;
         mesh.receiveShadow = true;
         group.add(mesh);
     } else {
         console.warn("[AssetManager] Missing geometry or material for rock_desert");
     }
     return group;
}


// --- Desert Asset Factory Functions (Placeholders) ---

export function createCactusSaguaroModel(properties) {
    const group = new THREE.Group();
    const mat = getAsset('cactusMaterial');
    if (!mat) { console.warn("Missing cactusMaterial"); return group; }

    // Main trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 8, 8), mat);
    trunk.position.y = 4;
    group.add(trunk);

    // Arms (simple cylinders)
    const armGeo = new THREE.CylinderGeometry(0.3, 0.4, 3, 6);
    const arm1 = new THREE.Mesh(armGeo, mat);
    arm1.position.set(0.6, 5, 0);
    arm1.rotation.z = -Math.PI / 4;
    arm1.rotation.y = Math.PI / 8;
    group.add(arm1);

    const arm2 = new THREE.Mesh(armGeo, mat);
    arm2.position.set(-0.6, 6, 0);
    arm2.rotation.z = Math.PI / 4;
    arm2.rotation.y = -Math.PI / 8;
    group.add(arm2);

    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}

export function createCactusBarrelModel(properties) {
    const group = new THREE.Group();
    const mat = getAsset('cactusMaterial');
    if (!mat) { console.warn("Missing cactusMaterial"); return group; }
    // Wider, shorter cylinder
    const geo = new THREE.CylinderGeometry(1.0, 1.2, 1.5, 12);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.75; // Sit on ground
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
}

export function createSaloonModel(properties) {
    const group = new THREE.Group();
    const mat = getAsset('saloonMaterial'); // Wood color
    if (!mat) { console.warn("Missing saloonMaterial"); return group; }

    // Simple box shape
    const mainBuilding = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 15), mat);
    mainBuilding.position.y = 4;
    group.add(mainBuilding);

    // Add a simple facade/porch roof?
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 4), mat);
    porchRoof.position.set(0, 7.75, -9.5); // Front of building, high up
    group.add(porchRoof);

    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}

export function createRailroadSignModel(properties) {
    const group = new THREE.Group();
    const woodMat = getAsset('logMaterial'); // Reuse log material
    const signMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); // White sign

    if (!woodMat) { console.warn("Missing logMaterial for railroad sign"); return group; }

    // Post
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5, 6), woodMat);
    post.position.y = 2.5;
    group.add(post);

    // Crossbucks
    const signGeo = new THREE.BoxGeometry(3, 0.5, 0.1);
    const cross1 = new THREE.Mesh(signGeo, signMat);
    cross1.position.set(0, 4.5, 0);
    cross1.rotation.z = Math.PI / 4;
    group.add(cross1);

    const cross2 = new THREE.Mesh(signGeo, signMat);
    cross2.position.set(0, 4.5, 0);
    cross2.rotation.z = -Math.PI / 4;
    group.add(cross2);

    group.traverse(child => { if (child.isMesh) { child.castShadow = true; } }); // Signs might not receive shadow well
    return group;
}

export function createSkullModel(properties) {
    const group = new THREE.Group();
    // Use a simple sphere or icosahedron for skull shape
    const geo = new THREE.IcosahedronGeometry(0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xFFFACD, roughness: 0.6 }); // Bone color
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);
    return group;
}

export function createDriedBushModel(properties) {
    const group = new THREE.Group();
    // Similar to skull, maybe slightly larger sphere/icosahedron
    const geo = new THREE.IcosahedronGeometry(0.8, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xBC8F8F, roughness: 0.9 }); // RosyBrown (dried look)
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
}

export function createWagonWheelModel(properties) {
    const group = new THREE.Group();
    const mat = getAsset('logMaterial'); // Reuse wood material
    if (!mat) { console.warn("Missing logMaterial for wagon wheel"); return group; }
    // Use a Torus for the wheel rim
    const geo = new THREE.TorusGeometry(1.0, 0.15, 6, 12);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2; // Lay flat initially (objectGenerator might rotate it)
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    // Could add spokes later if needed
    return group;
}

export function createMineEntranceModel(properties) {
    const group = new THREE.Group();
    const woodMat = getAsset('logMaterial');
    const rockMat = getAsset('rockMaterial');
    if (!woodMat || !rockMat) { console.warn("Missing materials for mine entrance"); return group; }

    // Wooden frame
    const frameSideGeo = new THREE.BoxGeometry(0.5, 6, 0.5);
    const frameTopGeo = new THREE.BoxGeometry(5, 0.5, 0.5);

    const leftPost = new THREE.Mesh(frameSideGeo, woodMat);
    leftPost.position.set(-2.25, 3, 0);
    group.add(leftPost);

    const rightPost = new THREE.Mesh(frameSideGeo, woodMat);
    rightPost.position.set(2.25, 3, 0);
    group.add(rightPost);

    const topBeam = new THREE.Mesh(frameTopGeo, woodMat);
    topBeam.position.set(0, 6.25, 0);
    group.add(topBeam);

    // Dark opening (just a dark plane/box behind)
    const openingMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const opening = new THREE.Mesh(new THREE.PlaneGeometry(4, 5.5), openingMat);
    opening.position.set(0, 2.75, 0.3); // Slightly behind frame
    group.add(opening);

    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}

export function createWaterTowerModel(properties) {
    const group = new THREE.Group();
    const woodMat = getAsset('logMaterial');
    if (!woodMat) { console.warn("Missing logMaterial for water tower"); return group; }

    // Tank (cylinder)
    const tankGeo = new THREE.CylinderGeometry(3, 3, 5, 12);
    const tank = new THREE.Mesh(tankGeo, woodMat);
    tank.position.y = 8; // High up
    group.add(tank);

    // Legs (simple boxes)
    const legGeo = new THREE.BoxGeometry(0.4, 6, 0.4);
    const legY = 3; // Base of legs at y=0

    const leg1 = new THREE.Mesh(legGeo, woodMat);
    leg1.position.set(2, legY, 2);
    group.add(leg1);
    const leg2 = new THREE.Mesh(legGeo, woodMat);
    leg2.position.set(-2, legY, 2);
    group.add(leg2);
    const leg3 = new THREE.Mesh(legGeo, woodMat);
    leg3.position.set(2, legY, -2);
    group.add(leg3);
    const leg4 = new THREE.Mesh(legGeo, woodMat);
    leg4.position.set(-2, legY, -2);
    group.add(leg4);

    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}


export function createTumbleweedModel(properties) {
    const group = new THREE.Group();
    // Use an icosahedron for a somewhat irregular shape
    const geo = new THREE.IcosahedronGeometry(1.0, 1); // Radius 1, detail 1
    const mat = new THREE.MeshStandardMaterial({ color: 0xAD8B60, roughness: 0.8 }); // Dried grass color
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);
    return group;
}

// --- Desert Enemy Factory Functions ---

/**
 * Creates an improved coyote model mesh group with facial features.
 * @returns {THREE.Group}
 */
export function createCoyoteModel(properties) {
    const group = new THREE.Group();
    const color = properties?.color || 0xAAAAAA; // Fallback grey

    // Similar to deer but maybe slightly smaller/leaner
    const torsoWidth = 1.0;
    const torsoHeight = 1.1;
    const torsoDepth = 2.5;

    // Create torso with slightly rounded edges
    const torsoGeometry = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth, 2, 2, 2);
    const torsoMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.castShadow = true;
    torso.position.y = 0.8;
    group.add(torso);

    // Head with rounded edges
    const headWidth = 0.7;
    const headHeight = 0.7;
    const headDepth = 0.8;
    const headGeometry = new THREE.BoxGeometry(headWidth, headHeight, headDepth, 2, 2, 2);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.castShadow = true;
    head.position.set(0, torso.position.y + 0.4, -1.4);
    group.add(head);

    // Add eyes
    const eyes = createEyes(headWidth, head.position, 0x000000, 0.1);
    group.add(eyes);

    // Add snout/nose (longer for coyote)
    const snout = createSnout(head.position, color, 0.4, 0.3, 0.6);
    group.add(snout);

    // Add ears (pointy for coyote)
    const ears = createEars(headWidth, headHeight, head.position, color, true);
    group.add(ears);

    // Neck with rounded edges
    const neckWidth = 0.4;
    const neckHeight = 0.4;
    const neckDepth = 0.6;
    const neckGeometry = new THREE.BoxGeometry(neckWidth, neckHeight, neckDepth, 2, 2, 2);
    const neckMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });
    const neck = new THREE.Mesh(neckGeometry, neckMaterial);
    neck.castShadow = true;
    neck.position.set(0, torso.position.y + 0.2, -1.0);
    neck.rotation.x = Math.PI / 7;
    group.add(neck);

    // Legs with rounded edges
    const legWidth = 0.25;
    const legHeight = 1.2;
    const legDepth = 0.25;
    const legY = 0;

    // Create legs with slightly rounded edges
    const legGeometry = new THREE.BoxGeometry(legWidth, legHeight, legDepth, 2, 2, 2);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });

    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.castShadow = true;
    frontLeftLeg.position.set(-0.35, legY, -0.8);
    group.add(frontLeftLeg);

    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.castShadow = true;
    frontRightLeg.position.set(0.35, legY, -0.8);
    group.add(frontRightLeg);

    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.castShadow = true;
    backLeftLeg.position.set(-0.35, legY, 0.8);
    group.add(backLeftLeg);

    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.castShadow = true;
    backRightLeg.position.set(0.35, legY, 0.8);
    group.add(backRightLeg);

    // Improved tail with multiple segments
    const tailBasePosition = new THREE.Vector3(0, torso.position.y - 0.1, 1.4);

    // Create a more complex, curved tail
    const tailSegments = 4;
    const tailWidth = 0.2;
    const tailSegmentLength = 0.3;

    let currentPos = new THREE.Vector3().copy(tailBasePosition);
    let currentAngle = Math.PI / 5; // Initial angle

    for (let i = 0; i < tailSegments; i++) {
        // Make the tail thinner toward the end
        const segmentWidth = tailWidth * (1 - i * 0.15);

        const segment = createBoxPart(segmentWidth, segmentWidth, tailSegmentLength, color);
        segment.position.copy(currentPos);
        segment.rotation.x = currentAngle;
        group.add(segment);

        // Update position for next segment
        currentPos.z += Math.cos(currentAngle) * tailSegmentLength;
        currentPos.y += Math.sin(currentAngle) * tailSegmentLength;

        // Curve the tail upward slightly more for each segment
        currentAngle += Math.PI / 20;
    }

    group.userData.legs = { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg };
    group.userData.legHeight = legHeight;
    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}

/**
 * Creates an improved rattlesnake model mesh group with facial features.
 * @returns {THREE.Group}
 */
export function createRattlesnakeModel(properties) {
    const group = new THREE.Group();
    const color = properties?.color || 0xCD853F; // Fallback Peru

    // Improved segmented body using cylinders with more segments and better texturing
    const segmentGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.6, 8);
    const segmentMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.8
    });

    // Create a head for the snake
    const headGeo = new THREE.ConeGeometry(0.3, 0.7, 8);
    const headMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.rotation.x = -Math.PI / 2; // Orient the cone to point forward
    head.position.set(0, 0.15, 2.0); // Position at the front
    group.add(head);

    // Add eyes to the snake
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0.3,
        metalness: 0.2
    });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.15, 0.2, 1.8);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.15, 0.2, 1.8);
    group.add(rightEye);

    // More segments for a longer, more detailed snake
    const numSegments = 8;
    let currentPos = new THREE.Vector3(0, 0.15, 1.5); // Start behind the head
    let currentAngle = 0;

    for (let i = 0; i < numSegments; i++) {
        // Vary the segment size slightly for a more natural look
        const radius = 0.2 - (i * 0.01); // Gradually get thinner
        const segmentGeo = new THREE.CylinderGeometry(radius, radius + 0.05, 0.6, 8);

        // Alternate colors slightly for a pattern effect
        const segmentColor = i % 2 === 0 ? color : new THREE.Color(color).multiplyScalar(0.9).getHex();
        const segmentMat = new THREE.MeshStandardMaterial({
            color: segmentColor,
            roughness: 0.8
        });

        const segment = new THREE.Mesh(segmentGeo, segmentMat);
        segment.position.copy(currentPos);
        segment.rotation.x = Math.PI / 2; // Lay flat
        segment.rotation.y = currentAngle;
        group.add(segment);

        // Move position for next segment with a more pronounced zig-zag
        currentPos.z -= 0.5; // Move along Z
        currentPos.x += (i % 2 === 0 ? 0.15 : -0.15); // More pronounced zig-zag
        currentAngle += (i % 2 === 0 ? -0.15 : 0.15); // More rotation
    }

    // Improved rattle with multiple segments
    const rattleBasePos = new THREE.Vector3().copy(currentPos);
    rattleBasePos.z -= 0.3; // Position at the end of the body

    // Create a more detailed rattle with multiple segments
    const rattleSegments = 3;
    const rattleColor = 0xAAAAAA; // Grey rattle

    for (let i = 0; i < rattleSegments; i++) {
        const rattleSize = 0.15 - (i * 0.02); // Get smaller toward the end
        const rattleGeo = new THREE.SphereGeometry(rattleSize, 6, 6);
        const rattleMat = new THREE.MeshStandardMaterial({
            color: rattleColor,
            roughness: 0.9
        });

        const rattleSegment = new THREE.Mesh(rattleGeo, rattleMat);
        rattleSegment.position.copy(rattleBasePos);
        rattleSegment.position.z -= i * 0.15; // Space out the segments
        group.add(rattleSegment);
    }

    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}

/**
 * Creates an improved scorpion model mesh group with better details.
 * @returns {THREE.Group}
 */
export function createScorpionModel(properties) {
    const group = new THREE.Group();
    const color = properties?.color || 0x444444; // Fallback dark grey

    // Body with rounded edges for better appearance
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.3, 1.0, 2, 2, 2);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.8
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.position.y = 0.15;
    group.add(body);

    // Add a smaller head segment
    const headGeo = new THREE.BoxGeometry(0.5, 0.25, 0.4, 2, 2, 2);
    const headMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.8
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    head.position.set(0, 0.15, -0.6);
    group.add(head);

    // Add eyes (small dots on the head)
    const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0.3
    });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, 0.2, -0.8);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.1, 0.2, -0.8);
    group.add(rightEye);

    // Improved tail with cylindrical segments for smoother appearance
    let tailY = 0.2;
    let tailZ = 0.6;
    const tailSegments = 5; // More segments for smoother curve

    for (let i = 0; i < tailSegments; i++) {
        // Gradually decrease segment size
        const radius = 0.1 - (i * 0.01);
        const tailSegmentGeo = new THREE.CylinderGeometry(radius, radius, 0.3, 8);
        const tailMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.8
        });

        const segment = new THREE.Mesh(tailSegmentGeo, tailMat);
        segment.rotation.x = Math.PI / 2; // Orient cylinder along z-axis
        segment.position.set(0, tailY, tailZ);

        // Gradually increase curve angle for each segment
        const curveAngle = -Math.PI / 6 * (i + 1) / tailSegments;
        segment.rotation.x += curveAngle;

        group.add(segment);

        // Update position for next segment
        tailY += 0.15;
        tailZ += 0.15;
    }

    // Improved stinger
    const stingerGeo = new THREE.ConeGeometry(0.08, 0.25, 8);
    const stingerMat = new THREE.MeshStandardMaterial({
        color: 0x222222, // Darker than body
        roughness: 0.7,
        metalness: 0.2
    });
    const stinger = new THREE.Mesh(stingerGeo, stingerMat);
    stinger.position.set(0, tailY, tailZ);
    stinger.rotation.x = -Math.PI / 2; // Point stinger forward/down
    group.add(stinger);

    // Improved claws with multiple parts
    // Claw base (upper arm)
    const clawBaseGeo = new THREE.BoxGeometry(0.15, 0.15, 0.4, 2, 2, 2);
    const clawMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.8
    });

    // Left claw group
    const leftClawGroup = new THREE.Group();

    const leftClawBase = new THREE.Mesh(clawBaseGeo, clawMat);
    leftClawBase.position.set(0, 0, 0.2);
    leftClawGroup.add(leftClawBase);

    // Claw pincer parts
    const pincerGeo = new THREE.BoxGeometry(0.1, 0.1, 0.3, 2, 2, 2);

    const leftPincerUpper = new THREE.Mesh(pincerGeo, clawMat);
    leftPincerUpper.position.set(0, 0.05, -0.15);
    leftClawGroup.add(leftPincerUpper);

    const leftPincerLower = new THREE.Mesh(pincerGeo, clawMat);
    leftPincerLower.position.set(0, -0.05, -0.15);
    leftClawGroup.add(leftPincerLower);

    // Position the entire claw group
    leftClawGroup.position.set(0.4, 0.15, -0.6);
    leftClawGroup.rotation.y = -Math.PI / 6; // Angle outward slightly
    group.add(leftClawGroup);

    // Right claw (mirror of left)
    const rightClawGroup = leftClawGroup.clone();
    rightClawGroup.position.set(-0.4, 0.15, -0.6);
    rightClawGroup.rotation.y = Math.PI / 6; // Angle outward in opposite direction
    group.add(rightClawGroup);

    // Improved legs (more of them and better positioned)
    const legGeo = new THREE.BoxGeometry(0.05, 0.1, 0.25, 2, 2, 2);
    const legMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.8
    });

    // Create 4 pairs of legs (8 total)
    const legPositions = [
        { x: 0.35, z: -0.3 },
        { x: 0.35, z: 0 },
        { x: 0.35, z: 0.3 },
        { x: 0.35, z: 0.6 }
    ];

    legPositions.forEach(pos => {
        // Left leg
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(pos.x, 0.1, pos.z);
        leftLeg.rotation.z = Math.PI / 4; // Angle outward
        group.add(leftLeg);

        // Right leg (mirror)
        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(-pos.x, 0.1, pos.z);
        rightLeg.rotation.z = -Math.PI / 4; // Angle outward
        group.add(rightLeg);
    });

    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}


/**
 * Creates an improved buzzard model mesh group with facial features.
 * @returns {THREE.Group}
 */
export function createBuzzardModel(properties) {
    const group = new THREE.Group();
    const color = 0x333333; // Dark grey/black

    // Improved body using an ellipsoid shape
    const bodyGeo = new THREE.SphereGeometry(0.5, 12, 8);
    bodyGeo.scale(1, 0.7, 2); // Scale to make it elliptical

    const bodyMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.8
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    // Add a head
    const headGeo = new THREE.SphereGeometry(0.3, 10, 8);
    const headMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    head.position.set(0, 0.1, -0.8); // Position at front of body
    group.add(head);

    // Add eyes
    const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({
        color: 0xFFFF00, // Yellow eyes for buzzard
        roughness: 0.3,
        metalness: 0.2
    });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.15, 0.2, -0.9);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.15, 0.2, -0.9);
    group.add(rightEye);

    // Add beak
    const beakGeo = new THREE.ConeGeometry(0.1, 0.4, 8);
    const beakMat = new THREE.MeshStandardMaterial({
        color: 0x888888, // Grey beak
        roughness: 0.7
    });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.castShadow = true;
    beak.rotation.x = -Math.PI / 2; // Point downward
    beak.position.set(0, 0.05, -1.1); // Position at front of head
    group.add(beak);

    // Improved wings with multiple segments for better shape
    const wingColor = color;

    // Left wing group
    const leftWingGroup = new THREE.Group();

    // Create wing segments with varying sizes for a more natural shape
    const wingSegments = 3;
    const wingLength = 3.0;
    const segmentLength = wingLength / wingSegments;

    for (let i = 0; i < wingSegments; i++) {
        // Make segments narrower toward the tip
        const width = 0.8 * (1 - i * 0.2);
        const segmentGeo = new THREE.BoxGeometry(segmentLength, 0.05, width, 2, 1, 2);
        const segmentMat = new THREE.MeshStandardMaterial({
            color: wingColor,
            roughness: 0.8
        });

        const segment = new THREE.Mesh(segmentGeo, segmentMat);
        segment.castShadow = true;

        // Position each segment
        segment.position.set(-segmentLength/2 - i*segmentLength, 0, 0);

        // Angle segments progressively more for a curved wing
        segment.rotation.z = Math.PI / 12 * (i + 1);

        leftWingGroup.add(segment);
    }

    // Add feather details
    const featherGeo = new THREE.BoxGeometry(0.4, 0.02, 0.15, 1, 1, 1);
    const featherMat = new THREE.MeshStandardMaterial({
        color: 0x222222, // Slightly different color for feathers
        roughness: 0.9
    });

    // Add some feather details to the wing tips
    for (let i = 0; i < 5; i++) {
        const feather = new THREE.Mesh(featherGeo, featherMat);
        feather.castShadow = true;
        feather.position.set(-2.8, 0, -0.3 + i * 0.15);
        feather.rotation.z = Math.PI / 6;
        leftWingGroup.add(feather);
    }

    // Position the entire wing group
    leftWingGroup.position.set(0, 0, 0);
    group.add(leftWingGroup);

    // Right wing (mirror of left)
    const rightWingGroup = leftWingGroup.clone();
    rightWingGroup.scale.x = -1; // Mirror along x-axis
    group.add(rightWingGroup);

    // Add a tail
    const tailGeo = new THREE.BoxGeometry(0.6, 0.1, 0.8, 2, 1, 2);
    const tailMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.8
    });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.castShadow = true;
    tail.position.set(0, 0, 1.0); // At back of body
    group.add(tail);

    group.traverse(child => { if (child.isMesh) { child.castShadow = true; } });
    return group;
}



// TODO: Add factory functions for other desert objects/enemies in Phase 2

/**
 * Creates a horseshoe magnet model.
 * @param {object} properties - Properties for the magnet (size, color).
 * @returns {THREE.Group} A group containing the magnet model.
 */
export function createMagnetModel(properties) {
    const group = new THREE.Group();
    const size = properties?.size || 0.8;
    const color = properties?.color || 0xF60000; // Default red color

    // Create the magnet material
    const magnetMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: 0x330000,
        metalness: 0.8,
        roughness: 0.10
    });

    // Create white tip material with enhanced properties
    const whiteTipMat = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0x444444,
        metalness: 0.8,
        roughness: 0.10
    });

    // Create the horseshoe shape (U-shape)
    // Base/bottom of the horseshoe
    const baseWidth = size * 1.5;
    const baseHeight = size * 0.4;
    const baseDepth = size * 0.4;
    const baseGeo = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
    const base = new THREE.Mesh(baseGeo, magnetMat);
    base.position.set(0, 0, 0);
    group.add(base);

    // Left arm of the horseshoe
    const armWidth = size * 0.4;
    const armHeight = size * 1.5;
    const armDepth = size * 0.4;
    const leftArmGeo = new THREE.BoxGeometry(armWidth, armHeight, armDepth);
    const leftArm = new THREE.Mesh(leftArmGeo, magnetMat);
    leftArm.position.set(-baseWidth/2 + armWidth/2, armHeight/2, 0);
    group.add(leftArm);

    // Right arm of the horseshoe
    const rightArmGeo = new THREE.BoxGeometry(armWidth, armHeight, armDepth);
    const rightArm = new THREE.Mesh(rightArmGeo, magnetMat);
    rightArm.position.set(baseWidth/2 - armWidth/2, armHeight/2, 0);
    group.add(rightArm);

    // Add white tips to the magnet poles - larger and more prominent
    const tipRadius = size * 0.3; // Increased from 0.25
    const tipHeight = size * 0.25; // Increased from 0.2

    // Left (North) tip - white
    const leftTipGeo = new THREE.CylinderGeometry(tipRadius, tipRadius, tipHeight, 16);
    const leftTip = new THREE.Mesh(leftTipGeo, whiteTipMat);
    leftTip.rotation.x = Math.PI/2;
    leftTip.position.set(-baseWidth/2 + armWidth/2, armHeight + tipHeight/2, 0);
    group.add(leftTip);

    // Right (South) tip - white
    const rightTipGeo = new THREE.CylinderGeometry(tipRadius, tipRadius, tipHeight, 16);
    const rightTip = new THREE.Mesh(rightTipGeo, whiteTipMat);
    rightTip.rotation.x = Math.PI/2;
    rightTip.position.set(baseWidth/2 - armWidth/2, armHeight + tipHeight/2, 0);
    group.add(rightTip);

    // Create a container group to apply additional rotation for tilt
    const tiltedGroup = new THREE.Group();
    tiltedGroup.add(group);

    // Rotate the magnet to face forward
    group.rotation.x = Math.PI/2;

    // Add a more pronounced tilt to make the magnet more dynamic
    tiltedGroup.rotation.z = Math.PI/8; // 22.5-degree tilt (increased from 15 degrees)
    tiltedGroup.rotation.y = Math.PI/16; // Slight rotation on Y axis for perspective

    // Set shadows
    tiltedGroup.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return tiltedGroup;
}

/**
 * Disposes of assets loaded for the current level.
 * Call this before loading a new level.
 */
export function disposeLevelAssets() {
    console.log("[AssetManager] Disposing current level assets...");
    Object.keys(levelAssets).forEach(key => {
        const asset = levelAssets[key];
        if (asset) {
            if (asset.dispose) { // Materials and Geometries have dispose()
                // console.log(`[AssetManager] Disposing ${key}`);
                asset.dispose();
            } else if (asset instanceof THREE.Texture) { // Handle textures if added later
                 asset.dispose();
            }
        }
    });
    levelAssets = {}; // Clear the storage object
    console.log("[AssetManager] Level assets disposed.");
}
