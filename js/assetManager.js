// js/assetManager.js
import * as THREE from 'three';
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
        console.error("[AssetManager] Cannot initialize assets without levelConfig!");
        return;
    }

    // --- Coin ---
    // --- Coin --- (Assuming coin visuals might change per level, use config)
    const coinVis = levelConfig.COIN_VISUALS || { radius: 0.75, height: 0.2, color: 0xFFFF00 }; // Fallback defaults
    levelAssets.coinGeometry = new THREE.CylinderGeometry(coinVis.radius, coinVis.radius, coinVis.height, 16);
    levelAssets.coinGeometry.rotateX(Math.PI / 2); // Orient coin flat
    levelAssets.coinMaterial = new THREE.MeshStandardMaterial({ color: coinVis.color, metalness: 0.3, roughness: 0.4 });

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

    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius, trunkHeight, 8);
    const trunkMesh = new THREE.Mesh(trunkGeometry, getAsset('treeTrunkMaterial'));
    trunkMesh.position.y = trunkHeight / 2;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    treeGroup.add(trunkMesh);

    const foliageGeometry = new THREE.ConeGeometry(foliageRadius, foliageHeight, 8);
    const foliageMesh = new THREE.Mesh(foliageGeometry, getAsset('treeFoliageMaterial'));
    foliageMesh.position.y = trunkHeight + foliageHeight / 2;
    foliageMesh.castShadow = true;
    foliageMesh.receiveShadow = true;
    treeGroup.add(foliageMesh);

    return treeGroup;
}



// --- Enemy Model Factory Functions ---

// Helper Function (Internal to AssetManager)
function createBoxPart(width, height, depth, color) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ color: color });
    const part = new THREE.Mesh(geometry, material);
    part.castShadow = true;
    // part.receiveShadow = true; // Optional, might impact performance
    return part;
}

/**
 * Creates a simple bear model mesh group.
 * @returns {THREE.Group}
 */
// Enemy model functions now need the specific enemy's properties (including color)
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

    // Torso
    const torso = createBoxPart(torsoWidth, torsoHeight, torsoDepth, color);
    // Position torso center based on new leg height
    const torsoY = legHeight / 2 + torsoHeight / 2 - 0.2; // Adjust slightly down
    torso.position.y = torsoY;
    group.add(torso);

    // Head
    const head = createBoxPart(headWidth, headHeight, headDepth, color);
    // Position head relative to the front-top of the torso
    head.position.set(0, torsoY + torsoHeight * 0.4, -torsoDepth / 2 - headDepth * 0.3);
    group.add(head);

    // Legs (simple boxes for now)
    const legY = legHeight / 2; // Center leg geometry at half its height, base will be at 0

    // Calculate leg positions based on torso dimensions
    const legXOffset = torsoWidth / 2 - legWidth * 0.4; // Place legs slightly inwards
    const frontLegZ = -torsoDepth / 2 + legDepth * 0.6; // Place front legs forward
    const backLegZ = torsoDepth / 2 - legDepth * 0.6; // Place back legs backward

    const frontLeftLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    frontLeftLeg.position.set(-legXOffset, legY, frontLegZ);
    group.add(frontLeftLeg);

    const frontRightLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    frontRightLeg.position.set(legXOffset, legY, frontLegZ);
    group.add(frontRightLeg);

    const backLeftLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    backLeftLeg.position.set(-legXOffset, legY, backLegZ);
    group.add(backLeftLeg);

    const backRightLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    backRightLeg.position.set(legXOffset, legY, backLegZ);
    group.add(backRightLeg);

    // Store leg references for animation
    group.userData.legs = { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg };
    group.userData.legHeight = legHeight; // Store height for grounding offset

    return group;
}

/**
 * Creates a simple squirrel model mesh group.
 * @returns {THREE.Group}
 */
export function createSquirrelModel(properties) {
    const group = new THREE.Group();
    const color = properties?.color || 0xA0522D; // Use passed color or fallback

    // Torso (Dog-sized - larger than before)
    const torsoWidth = 0.8;
    const torsoHeight = 0.7;
    const torsoDepth = 1.5;
    const torso = createBoxPart(torsoWidth, torsoHeight, torsoDepth, color);
    torso.position.y = 0.5; // Center torso above origin
    group.add(torso);

    // Head
    const head = createBoxPart(0.6, 0.5, 0.5, color);
    head.position.set(0, torso.position.y + 0.2, -0.8); // Front of torso
    group.add(head);

    // Legs (shorter)
    const legWidth = 0.25;
    const legHeight = 0.6;
    const legDepth = 0.25;
    const legY = 0;

    const frontLeftLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    frontLeftLeg.position.set(-torsoWidth / 2 + 0.1, legY, -torsoDepth / 2 + 0.2);
    group.add(frontLeftLeg);

    const frontRightLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    frontRightLeg.position.set(torsoWidth / 2 - 0.1, legY, -torsoDepth / 2 + 0.2);
    group.add(frontRightLeg);

    const backLeftLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    backLeftLeg.position.set(-torsoWidth / 2 + 0.1, legY, torsoDepth / 2 - 0.2);
    group.add(backLeftLeg);

    const backRightLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    backRightLeg.position.set(torsoWidth / 2 - 0.1, legY, torsoDepth / 2 - 0.2);
    group.add(backRightLeg);

    // Tail (Bushy - represented by a larger box)
    const tail = createBoxPart(0.4, 1.2, 0.4, color);
    tail.position.set(0, torso.position.y + 0.3, torsoDepth / 2 + 0.2);
    tail.rotation.x = -Math.PI / 6; // Angle tail up slightly
    group.add(tail);

    // Store leg references for animation
    group.userData.legs = { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg };
    group.userData.legHeight = legHeight; // Store height for grounding offset

    return group;
}

/**
 * Creates a simple deer model mesh group.
 * @returns {THREE.Group}
 */
export function createDeerModel(properties) {
    const group = new THREE.Group();
    const color = properties?.color || 0xD2B48C; // Use passed color or fallback

    // Torso (Longer and thinner than bear)
    const torso = createBoxPart(1.2, 1.3, 2.8, color);
    torso.position.y = 1.0; // Higher off ground
    group.add(torso);

    // Head (Smaller)
    const head = createBoxPart(0.8, 0.8, 0.9, color);
    head.position.set(0, torso.position.y + 0.5, -1.6); // Front of torso
    group.add(head);

    // Neck (Simple box connecting head and torso)
    const neck = createBoxPart(0.5, 0.5, 0.8, color);
    neck.position.set(0, torso.position.y + 0.3, -1.1);
    neck.rotation.x = Math.PI / 6; // Angle neck slightly
    group.add(neck);

    // Legs (Longer and thinner)
    const legWidth = 0.3;
    const legHeight = 1.5;
    const legDepth = 0.3;
    const legY = 0;

    const frontLeftLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    frontLeftLeg.position.set(-0.4, legY, -1.0);
    group.add(frontLeftLeg);

    const frontRightLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    frontRightLeg.position.set(0.4, legY, -1.0);
    group.add(frontRightLeg);

    const backLeftLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    backLeftLeg.position.set(-0.4, legY, 1.0);
    group.add(backLeftLeg);

    const backRightLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    backRightLeg.position.set(0.4, legY, 1.0);
    group.add(backRightLeg);

    // Antlers (Optional simple representation)
    const antlerColor = 0x654321; // Darker brown
    const antlerBranch = createBoxPart(0.1, 0.6, 0.1, antlerColor);
    antlerBranch.position.set(0.3, head.position.y + 0.4, head.position.z);
    antlerBranch.rotation.z = -Math.PI / 6;
    group.add(antlerBranch); // Add the first antler

    // Create, position, rotate, and add the second antler separately
    const mirroredAntler = antlerBranch.clone();
    mirroredAntler.position.set(-0.3, head.position.y + 0.4, head.position.z);
    mirroredAntler.rotation.z = Math.PI / 3; // Apply rotation after setting position
    group.add(mirroredAntler);

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

export function createCoyoteModel(properties) {
    const group = new THREE.Group();
    const color = properties?.color || 0xAAAAAA; // Fallback grey

    // Similar to deer but maybe slightly smaller/leaner
    const torso = createBoxPart(1.0, 1.1, 2.5, color);
    torso.position.y = 0.8;
    group.add(torso);

    const head = createBoxPart(0.7, 0.7, 0.8, color);
    head.position.set(0, torso.position.y + 0.4, -1.4);
    group.add(head);

    const neck = createBoxPart(0.4, 0.4, 0.6, color);
    neck.position.set(0, torso.position.y + 0.2, -1.0);
    neck.rotation.x = Math.PI / 7;
    group.add(neck);

    const legWidth = 0.25;
    const legHeight = 1.2;
    const legDepth = 0.25;
    const legY = 0;

    const frontLeftLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    frontLeftLeg.position.set(-0.35, legY, -0.8);
    group.add(frontLeftLeg);

    const frontRightLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    frontRightLeg.position.set(0.35, legY, -0.8);
    group.add(frontRightLeg);

    const backLeftLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    backLeftLeg.position.set(-0.35, legY, 0.8);
    group.add(backLeftLeg);

    const backRightLeg = createBoxPart(legWidth, legHeight, legDepth, color);
    backRightLeg.position.set(0.35, legY, 0.8);
    group.add(backRightLeg);

    // Tail
    const tail = createBoxPart(0.2, 0.8, 0.2, color);
    tail.position.set(0, torso.position.y - 0.1, 1.4);
    tail.rotation.x = Math.PI / 5;
    group.add(tail);

    group.userData.legs = { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg };
    group.userData.legHeight = legHeight;
    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}

export function createRattlesnakeModel(properties) {
    const group = new THREE.Group();
    const color = properties?.color || 0xCD853F; // Fallback Peru

    // Simple segmented body using cylinders
    const segmentGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.6, 8);
    const segmentMat = new THREE.MeshStandardMaterial({ color: color });

    const numSegments = 5;
    let currentPos = new THREE.Vector3(0, 0.15, 0); // Start slightly above ground
    let currentAngle = 0;

    for (let i = 0; i < numSegments; i++) {
        const segment = new THREE.Mesh(segmentGeo, segmentMat);
        segment.position.copy(currentPos);
        segment.rotation.x = Math.PI / 2; // Lay flat
        segment.rotation.y = currentAngle;
        group.add(segment);

        // Move position for next segment
        currentPos.z -= 0.5; // Move along Z
        currentPos.x += (i % 2 === 0 ? 0.1 : -0.1); // Slight zig-zag
        currentAngle += (i % 2 === 0 ? -0.1 : 0.1);
    }

    // Rattle (small box)
    const rattle = createBoxPart(0.15, 0.15, 0.3, 0xAAAAAA); // Grey rattle
    rattle.position.copy(currentPos);
    rattle.position.z -= 0.2; // End of tail
    group.add(rattle);

    group.traverse(child => { if (child.isMesh) { child.castShadow = true; } });
    return group;
}

export function createScorpionModel(properties) {
    const group = new THREE.Group();
    const color = properties?.color || 0x444444; // Fallback dark grey

    // Body
    const body = createBoxPart(0.6, 0.3, 1.0, color);
    body.position.y = 0.15;
    group.add(body);

    // Tail (segmented boxes)
    const tailSegmentGeo = new THREE.BoxGeometry(0.2, 0.2, 0.3);
    const tailMat = new THREE.MeshStandardMaterial({ color: color });
    let tailY = 0.2;
    let tailZ = 0.6;
    for (let i = 0; i < 4; i++) {
        const segment = new THREE.Mesh(tailSegmentGeo, tailMat);
        segment.position.set(0, tailY, tailZ);
        segment.rotation.x = -Math.PI / 6 * (i + 1); // Curve tail up
        group.add(segment);
        tailY += 0.15;
        tailZ += 0.2;
    }

    // Stinger
    const stingerGeo = new THREE.ConeGeometry(0.1, 0.3, 6);
    const stinger = new THREE.Mesh(stingerGeo, tailMat);
    stinger.position.set(0, tailY, tailZ);
    stinger.rotation.x = -Math.PI / 2; // Point stinger forward/down
    group.add(stinger);

    // Claws (simple boxes)
    const claw = createBoxPart(0.4, 0.15, 0.2, color);
    claw.position.set(0.4, 0.15, -0.6);
    group.add(claw);
    const claw2 = claw.clone();
    claw2.position.x = -0.4;
    group.add(claw2);

    // Legs (tiny boxes - might not be very visible)
    const leg = createBoxPart(0.05, 0.2, 0.1, color);
    leg.position.set(0.35, 0.1, 0); group.add(leg.clone());
    leg.position.set(-0.35, 0.1, 0); group.add(leg.clone());
    leg.position.set(0.35, 0.1, 0.3); group.add(leg.clone());
    leg.position.set(-0.35, 0.1, 0.3); group.add(leg.clone());


    group.traverse(child => { if (child.isMesh) { child.castShadow = true; } });
    return group;
}
// Removed erroneous closing brace that was here

export function createBuzzardModel(properties) {
    const group = new THREE.Group();
    const color = 0x333333; // Dark grey/black

    // Simple body (cone or elongated sphere)
    const bodyGeo = new THREE.ConeGeometry(0.5, 2.0, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2; // Point cone forward
    group.add(body);

    // Simple wings (flat boxes)
    const wingGeo = new THREE.BoxGeometry(3.0, 0.1, 0.8);
    const wingMat = new THREE.MeshStandardMaterial({ color: color });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-1.5, 0, 0); // Position relative to body center
    leftWing.rotation.z = Math.PI / 12; // Angle slightly up
    group.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.5, 0, 0);
    rightWing.rotation.z = -Math.PI / 12; // Angle slightly up
    group.add(rightWing);

    group.traverse(child => { if (child.isMesh) { child.castShadow = true; } });
    return group;
}

// Removed erroneous closing brace that was here

// TODO: Add factory functions for other desert objects/enemies in Phase 2

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