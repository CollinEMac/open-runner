// js/rendering/modelFactory.js
import * as THREE from 'three'; // Re-enabled THREE import
import * as AssetManager from '../managers/assetManager.js'; // Moved to managers
import { createLogger } from '../utils/logger.js'; // Stays in utils
import * as C from '../config/config.js'; // Import all config constants

const logger = createLogger('ModelFactory'); // Create logger instance

// --- Helper Functions ---

/**
 * Helper Function to create a basic box part with standard material.
 * @param {number} width
 * @param {number} height
 * @param {number} depth
 * @param {number|string} color
 * @param {number} [roughness=0.7]
 * @returns {THREE.Mesh}
 */
function createBoxPart(width, height, depth, color, roughness = 0.7) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: roughness
    });
    const part = new THREE.Mesh(geometry, material);
    part.castShadow = true;
    // part.receiveShadow = true; // Optional
    return part;
}

/**
 * Helper function to create detailed eyes for animals.
 * @param {number} headWidth
 * @param {THREE.Vector3} headPosition - Position of the head center.
 * @param {number|string} [color=C.MODELS.HELPER_EYE_COLOR] - Pupil color.
 * @param {number} [size=C.MODELS.HELPER_EYE_SIZE_FACTOR] - Pupil size factor relative to head width.
 * @returns {THREE.Group}
 */
function createEyes(headWidth, headPosition, color = C.MODELS.HELPER_EYE_COLOR, size = C.MODELS.HELPER_EYE_SIZE_FACTOR) {
    const group = new THREE.Group();
    const pupilSize = headWidth * size; // Calculate actual size
    const whiteSize = pupilSize * C.MODELS.HELPER_EYE_WHITE_SIZE_FACTOR;
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: C.MODELS.HELPER_EYE_ROUGHNESS, metalness: C.MODELS.HELPER_EYE_METALNESS });
    const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ color: C.MODELS.HELPER_EYE_WHITE_COLOR, roughness: C.MODELS.HELPER_EYE_WHITE_ROUGHNESS, metalness: C.MODELS.HELPER_EYE_WHITE_METALNESS });
    const eyeGeometry = new THREE.SphereGeometry(pupilSize, 12, 12); // Use calculated size
    const eyeWhiteGeometry = new THREE.SphereGeometry(whiteSize, 12, 12); // Use calculated size
    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
    const rightEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    const eyeOffset = headWidth * C.MODELS.HELPER_EYE_OFFSET_FACTOR;
    const eyeDepth = headPosition.z - headWidth * C.MODELS.HELPER_EYE_DEPTH_FACTOR;
    leftEyeWhite.position.set(-eyeOffset, headPosition.y, eyeDepth);
    rightEyeWhite.position.set(eyeOffset, headPosition.y, eyeDepth);
    leftEye.position.set(-eyeOffset, headPosition.y, eyeDepth - pupilSize * C.MODELS.HELPER_EYE_PUPIL_DEPTH_FACTOR);
    rightEye.position.set(eyeOffset, headPosition.y, eyeDepth - pupilSize * C.MODELS.HELPER_EYE_PUPIL_DEPTH_FACTOR);
    group.add(leftEyeWhite, rightEyeWhite, leftEye, rightEye);
    return group;
}

/**
 * Helper function to create a more detailed snout/nose for animals.
 * @param {THREE.Vector3} headPosition - Position of the head center.
 * @param {number|string} color - Base color (will be darkened).
 * @param {number} [width=0.3]
 * @param {number} [height=0.3]
 * @param {number} [depth=0.3]
 * @returns {THREE.Group}
 */
function createSnout(headPosition, color, width = 0.3, height = 0.3, depth = 0.3) {
    const group = new THREE.Group();
    const snoutColor = new THREE.Color(color).multiplyScalar(C.MODELS.HELPER_SNOUT_COLOR_MULTIPLIER);
    const noseTipColor = new THREE.Color(color).multiplyScalar(C.MODELS.HELPER_SNOUT_TIP_COLOR_MULTIPLIER);
    const snoutGeometry = new THREE.BoxGeometry(width, height, depth, 3, 3, 3);
    const snoutMaterial = new THREE.MeshStandardMaterial({ color: snoutColor.getHex(), roughness: C.MODELS.HELPER_SNOUT_ROUGHNESS });
    const snout = new THREE.Mesh(snoutGeometry, snoutMaterial);
    snout.castShadow = true;
    const noseTipGeometry = new THREE.SphereGeometry(width * C.MODELS.HELPER_SNOUT_TIP_SIZE_FACTOR, 8, 8);
    const noseTipMaterial = new THREE.MeshStandardMaterial({ color: noseTipColor.getHex(), roughness: C.MODELS.HELPER_SNOUT_TIP_ROUGHNESS });
    const noseTip = new THREE.Mesh(noseTipGeometry, noseTipMaterial);
    noseTip.position.set(0, 0, -depth * C.MODELS.HELPER_SNOUT_TIP_DEPTH_FACTOR);
    noseTip.castShadow = true;
    snout.add(noseTip);
    snout.position.set(0, headPosition.y - height * C.MODELS.HELPER_SNOUT_Y_OFFSET_FACTOR, headPosition.z - depth * C.MODELS.HELPER_SNOUT_Z_OFFSET_FACTOR);
    group.add(snout);
    return group;
}

/**
 * Helper function to create more detailed ears for animals.
 * @param {number} headWidth
 * @param {number} headHeight
 * @param {THREE.Vector3} headPosition - Position of the head center.
 * @param {number|string} color - Base color (will be darkened).
 * @param {boolean} [pointy=false] - If true, creates cone-shaped ears.
 * @returns {THREE.Group}
 */
function createEars(headWidth, headHeight, headPosition, color, pointy = false) {
    const group = new THREE.Group();
    const earColor = new THREE.Color(color).multiplyScalar(C.MODELS.HELPER_EAR_COLOR_MULTIPLIER);
    const innerEarColor = new THREE.Color(C.MODELS.HELPER_INNER_EAR_COLOR);
    let leftEar, rightEar, leftInnerEar, rightInnerEar;

    if (pointy) {
        const earGeometry = new THREE.ConeGeometry(headWidth * C.MODELS.HELPER_POINTY_EAR_RADIUS_FACTOR, headHeight * C.MODELS.HELPER_POINTY_EAR_HEIGHT_FACTOR, 8);
        const innerEarGeometry = new THREE.ConeGeometry(headWidth * C.MODELS.HELPER_POINTY_INNER_EAR_RADIUS_FACTOR, headHeight * C.MODELS.HELPER_POINTY_INNER_EAR_HEIGHT_FACTOR, 8);
        leftEar = new THREE.Mesh(earGeometry, new THREE.MeshStandardMaterial({ color: earColor.getHex(), roughness: C.MODELS.HELPER_EAR_ROUGHNESS }));
        rightEar = new THREE.Mesh(earGeometry, new THREE.MeshStandardMaterial({ color: earColor.getHex(), roughness: C.MODELS.HELPER_EAR_ROUGHNESS }));
        leftInnerEar = new THREE.Mesh(innerEarGeometry, new THREE.MeshStandardMaterial({ color: innerEarColor.getHex(), roughness: C.MODELS.HELPER_INNER_EAR_ROUGHNESS }));
        rightInnerEar = new THREE.Mesh(innerEarGeometry, new THREE.MeshStandardMaterial({ color: innerEarColor.getHex(), roughness: C.MODELS.HELPER_INNER_EAR_ROUGHNESS }));
        leftInnerEar.position.z = C.MODELS.HELPER_INNER_EAR_Z_OFFSET;
        rightInnerEar.position.z = C.MODELS.HELPER_INNER_EAR_Z_OFFSET;
        leftEar.add(leftInnerEar);
        rightEar.add(rightInnerEar);
        leftEar.rotation.z = C.MODELS.HELPER_POINTY_EAR_ROTATION_Z;
        rightEar.rotation.z = -C.MODELS.HELPER_POINTY_EAR_ROTATION_Z;
    } else {
        const earGeometry = new THREE.SphereGeometry(headWidth * C.MODELS.HELPER_ROUND_EAR_RADIUS_FACTOR, 12, 12);
        const innerEarGeometry = new THREE.SphereGeometry(headWidth * C.MODELS.HELPER_ROUND_INNER_EAR_RADIUS_FACTOR, 10, 10);
        leftEar = new THREE.Mesh(earGeometry, new THREE.MeshStandardMaterial({ color: earColor.getHex(), roughness: C.MODELS.HELPER_EAR_ROUGHNESS }));
        rightEar = new THREE.Mesh(earGeometry, new THREE.MeshStandardMaterial({ color: earColor.getHex(), roughness: C.MODELS.HELPER_EAR_ROUGHNESS }));
        leftEar.scale.set(1, C.MODELS.HELPER_ROUND_EAR_SCALE_Y, C.MODELS.HELPER_ROUND_EAR_SCALE_Z);
        rightEar.scale.set(1, C.MODELS.HELPER_ROUND_EAR_SCALE_Y, C.MODELS.HELPER_ROUND_EAR_SCALE_Z);
        leftInnerEar = new THREE.Mesh(innerEarGeometry, new THREE.MeshStandardMaterial({ color: innerEarColor.getHex(), roughness: C.MODELS.HELPER_INNER_EAR_ROUGHNESS }));
        rightInnerEar = new THREE.Mesh(innerEarGeometry, new THREE.MeshStandardMaterial({ color: innerEarColor.getHex(), roughness: C.MODELS.HELPER_INNER_EAR_ROUGHNESS }));
        leftInnerEar.scale.set(1, C.MODELS.HELPER_ROUND_EAR_SCALE_Y, C.MODELS.HELPER_ROUND_EAR_SCALE_Z);
        rightInnerEar.scale.set(1, C.MODELS.HELPER_ROUND_EAR_SCALE_Y, C.MODELS.HELPER_ROUND_EAR_SCALE_Z);
        leftInnerEar.position.z = C.MODELS.HELPER_INNER_EAR_Z_OFFSET;
        rightInnerEar.position.z = C.MODELS.HELPER_INNER_EAR_Z_OFFSET;
        leftEar.add(leftInnerEar);
        rightEar.add(rightInnerEar);
    }

    const earOffset = headWidth * C.MODELS.HELPER_EAR_OFFSET_FACTOR;
    leftEar.position.set(-earOffset, headPosition.y + headHeight * C.MODELS.HELPER_EAR_Y_OFFSET_FACTOR, headPosition.z);
    rightEar.position.set(earOffset, headPosition.y + headHeight * C.MODELS.HELPER_EAR_Y_OFFSET_FACTOR, headPosition.z);
    leftEar.castShadow = true;
    rightEar.castShadow = true;
    group.add(leftEar, rightEar);
    return group;
}

/**
 * Helper function to create an improved tail (potentially curved).
 * @param {THREE.Vector3} basePosition - Starting position of the tail base.
 * @param {number|string} color
 * @param {number} [length=1.0]
 * @param {number} [width=0.3]
 * @param {boolean} [curved=true]
 * @returns {THREE.Group}
 */
function createImprovedTail(basePosition, color, length = 1.0, width = 0.3, curved = true) {
    const group = new THREE.Group();
    if (curved) {
        const segments = C.MODELS.HELPER_TAIL_SEGMENTS;
        const segmentLength = length / segments;
        const segmentWidth = width;
        let currentPos = new THREE.Vector3().copy(basePosition);
        let currentAngle = 0;
        for (let i = 0; i < segments; i++) {
            const segment = createBoxPart(segmentWidth, segmentWidth, segmentLength, color);
            segment.position.copy(currentPos);
            const curveAngle = C.MODELS.HELPER_TAIL_CURVE_FACTOR * (i / segments);
            segment.rotation.x = currentAngle;
            group.add(segment);
            currentPos.z += Math.cos(currentAngle) * segmentLength;
            currentPos.y += Math.sin(currentAngle) * segmentLength;
            currentAngle += curveAngle;
        }
    } else {
        const tail = createBoxPart(width, width, length, color);
        tail.position.copy(basePosition);
        group.add(tail);
    }
    return group;
}


/**
 * Creates a procedural pine tree mesh.
 * Uses materials from AssetManager if available, otherwise creates fallbacks.
 * @returns {THREE.Group} The tree model group.
 */
export function createTreeMesh() {
    const treeGroup = new THREE.Group();
    const config = C.MODELS.TREE_PINE; // Use config object
    treeGroup.name = config.GROUP_NAME;
    const trunkHeight = config.TRUNK_HEIGHT;
    const trunkRadius = config.TRUNK_RADIUS;
    const foliageHeight = config.FOLIAGE_HEIGHT;
    const foliageRadius = config.FOLIAGE_RADIUS;

    let trunkMaterial = AssetManager.getAsset(config.TRUNK_MATERIAL_KEY);
    let foliageMaterial = AssetManager.getAsset(config.FOLIAGE_MATERIAL_KEY);

    if (!trunkMaterial || !foliageMaterial) {
        logger.error('Missing tree materials:', !trunkMaterial ? config.TRUNK_MATERIAL_KEY : '', !foliageMaterial ? config.FOLIAGE_MATERIAL_KEY : '');
        if (!trunkMaterial) {
            logger.warn('Creating fallback trunk material');
            trunkMaterial = new THREE.MeshStandardMaterial({ color: config.FALLBACK_TRUNK_COLOR, roughness: config.FALLBACK_TRUNK_ROUGHNESS });
        }
        if (!foliageMaterial) {
            logger.warn('Creating fallback foliage material');
            foliageMaterial = new THREE.MeshStandardMaterial({ color: config.FALLBACK_FOLIAGE_COLOR, roughness: config.FALLBACK_FOLIAGE_ROUGHNESS });
        }
    }

    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius, trunkHeight, config.TRUNK_SEGMENTS);
    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunkMesh.position.y = trunkHeight / 2;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    trunkMesh.name = config.TRUNK_NAME;
    treeGroup.add(trunkMesh);

    const foliageGeometry = new THREE.ConeGeometry(foliageRadius, foliageHeight, config.FOLIAGE_SEGMENTS);
    const foliageMesh = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliageMesh.position.y = trunkHeight + foliageHeight / 2;
    foliageMesh.castShadow = true;
    foliageMesh.receiveShadow = true;
    foliageMesh.name = config.FOLIAGE_NAME;
    treeGroup.add(foliageMesh);

    if (treeGroup.children.length !== 2) {
        logger.warn(`Tree has ${treeGroup.children.length} parts instead of 2`);
    }

    treeGroup.userData.isCompleteTree = true;
    treeGroup.userData.objectType = config.OBJECT_TYPE;
    return treeGroup;
}

/**
 * Creates a procedural bear model.
 * @param {object} [properties] - Optional properties (e.g., color).
 * @returns {THREE.Group} The bear model group.
 */
export function createBearModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.BEAR; // Use config object
    const color = properties?.color || config.DEFAULT_COLOR; // Use constant
    const torsoWidth = config.TORSO_WIDTH, torsoHeight = config.TORSO_HEIGHT, torsoDepth = config.TORSO_DEPTH; // Use constant
    const headWidth = config.HEAD_WIDTH, headHeight = config.HEAD_HEIGHT, headDepth = config.HEAD_DEPTH; // Use constant
    const legWidth = config.LEG_WIDTH, legHeight = config.LEG_HEIGHT, legDepth = config.LEG_DEPTH; // Use constant

    const torsoGeometry = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const torsoMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: config.TORSO_ROUGHNESS });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.castShadow = true;
    const torsoY = legHeight / 2 + torsoHeight / 2 + config.TORSO_Y_OFFSET_FACTOR; // Use factor
    torso.position.y = torsoY;
    group.add(torso);

    const headGeometry = new THREE.BoxGeometry(headWidth, headHeight, headDepth, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const headMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: config.HEAD_ROUGHNESS }); // Use HEAD_ROUGHNESS
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.castShadow = true;
    head.position.set(0, torsoY + torsoHeight * config.HEAD_Y_OFFSET_FACTOR, -torsoDepth / 2 - headDepth * config.HEAD_Z_OFFSET_FACTOR);
    group.add(head);

    const eyes = createEyes(headWidth, head.position, C.MODELS.HELPER_EYE_COLOR, config.EYE_SIZE / headWidth); // Pass size factor
    group.add(eyes);
    const snout = createSnout(head.position, color, config.SNOUT_WIDTH, config.SNOUT_HEIGHT, config.SNOUT_DEPTH);
    group.add(snout);
    const ears = createEars(headWidth, headHeight, head.position, color, false); // Pointy = false for bear
    group.add(ears);

    const legY = legHeight * config.LEG_Y_OFFSET_FACTOR;
    const legXOffset = torsoWidth / 2 - legWidth * config.LEG_X_OFFSET_FACTOR;
    const frontLegZ = -torsoDepth / 2 + legDepth * config.FRONT_LEG_Z_FACTOR;
    const backLegZ = torsoDepth / 2 - legDepth * config.BACK_LEG_Z_FACTOR;
    const legGeometry = new THREE.BoxGeometry(legWidth, legHeight, legDepth, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const legMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: config.LEG_ROUGHNESS });

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

    group.userData.legs = { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg };
    group.userData.legHeight = legHeight;
    return group;
}

/**
 * Creates a procedural squirrel model.
 * @param {object} [properties] - Optional properties (e.g., color).
 * @returns {THREE.Group} The squirrel model group.
 */
export function createSquirrelModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.SQUIRREL; // Use config object
    const color = properties?.color || config.DEFAULT_COLOR; // Use constant
    const torsoWidth = config.TORSO_WIDTH, torsoHeight = config.TORSO_HEIGHT, torsoDepth = config.TORSO_DEPTH; // Use constant
    const headWidth = config.HEAD_WIDTH, headHeight = config.HEAD_HEIGHT, headDepth = config.HEAD_DEPTH; // Use constant
    const legWidth = config.LEG_WIDTH, legHeight = config.LEG_HEIGHT, legDepth = config.LEG_DEPTH; // Use constant

    const torsoGeometry = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const torsoMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.castShadow = true;
    torso.position.y = config.TORSO_Y_POS;
    group.add(torso);

    const headGeometry = new THREE.BoxGeometry(headWidth, headHeight, headDepth, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const headMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.castShadow = true;
    head.position.set(0, torso.position.y + config.HEAD_Y_OFFSET, config.HEAD_Z_OFFSET);
    group.add(head);

    const eyes = createEyes(headWidth, head.position, C.MODELS.HELPER_EYE_COLOR, config.EYE_SIZE / headWidth); // Pass size factor
    group.add(eyes);
    const snout = createSnout(head.position, color, config.SNOUT_WIDTH, config.SNOUT_HEIGHT, config.SNOUT_DEPTH);
    group.add(snout);
    const ears = createEars(headWidth, headHeight, head.position, color, true); // Pointy = true for squirrel
    group.add(ears);

    const legY = config.LEG_Y_POS;
    const legGeometry = new THREE.BoxGeometry(legWidth, legHeight, legDepth, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const legMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });

    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.castShadow = true;
    frontLeftLeg.position.set(-torsoWidth / 2 + config.LEG_X_OFFSET_FACTOR, legY, -torsoDepth / 2 + config.FRONT_LEG_Z_OFFSET_FACTOR);
    group.add(frontLeftLeg);
    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.castShadow = true;
    frontRightLeg.position.set(torsoWidth / 2 - config.LEG_X_OFFSET_FACTOR, legY, -torsoDepth / 2 + config.FRONT_LEG_Z_OFFSET_FACTOR);
    group.add(frontRightLeg);
    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.castShadow = true;
    backLeftLeg.position.set(-torsoWidth / 2 + config.LEG_X_OFFSET_FACTOR, legY, torsoDepth / 2 - config.BACK_LEG_Z_OFFSET_FACTOR);
    group.add(backLeftLeg);
    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.castShadow = true;
    backRightLeg.position.set(torsoWidth / 2 - config.LEG_X_OFFSET_FACTOR, legY, torsoDepth / 2 - config.BACK_LEG_Z_OFFSET_FACTOR);
    group.add(backRightLeg);

    const tailBasePosition = new THREE.Vector3(0, torso.position.y + config.TAIL_BASE_Y_OFFSET, torsoDepth / 2 + config.TAIL_BASE_Z_OFFSET_FACTOR);
    const tailSegments = config.TAIL_SEGMENTS;
    const tailWidth = config.TAIL_WIDTH;
    const tailSegmentLength = config.TAIL_SEGMENT_LENGTH;
    const tailCurve = config.TAIL_CURVE;
    let currentPos = new THREE.Vector3().copy(tailBasePosition);
    let currentAngle = config.TAIL_INITIAL_ANGLE;
    for (let i = 0; i < tailSegments; i++) {
        const segmentWidth = tailWidth * (i === 0 || i === tailSegments - 1 ? config.TAIL_SEGMENT_WIDTH_FACTOR : 1.0);
        const segment = createBoxPart(segmentWidth, segmentWidth, tailSegmentLength, color);
        segment.position.copy(currentPos);
        segment.rotation.x = currentAngle;
        group.add(segment);
        currentPos.z += Math.cos(currentAngle) * tailSegmentLength;
        currentPos.y += Math.sin(currentAngle) * tailSegmentLength;
        currentAngle -= tailCurve / tailSegments;
    }

    group.userData.legs = { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg };
    group.userData.legHeight = legHeight;
    return group;
}

/**
 * Creates a procedural deer model.
 * @param {object} [properties] - Optional properties (e.g., color).
 * @returns {THREE.Group} The deer model group.
 */
export function createDeerModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.DEER; // Use config object
    const color = properties?.color || config.DEFAULT_COLOR;
    const torsoWidth = config.TORSO_WIDTH, torsoHeight = config.TORSO_HEIGHT, torsoDepth = config.TORSO_DEPTH;
    const headWidth = config.HEAD_WIDTH, headHeight = config.HEAD_HEIGHT, headDepth = config.HEAD_DEPTH;
    const neckWidth = config.NECK_WIDTH, neckHeight = config.NECK_HEIGHT, neckDepth = config.NECK_DEPTH;
    const legWidth = config.LEG_WIDTH, legHeight = config.LEG_HEIGHT, legDepth = config.LEG_DEPTH;

    const torsoGeometry = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const torsoMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.castShadow = true;
    torso.position.y = config.TORSO_Y_POS;
    group.add(torso);

    const headGeometry = new THREE.BoxGeometry(headWidth, headHeight, headDepth, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const headMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.castShadow = true;
    head.position.set(0, torso.position.y + config.HEAD_Y_OFFSET, config.HEAD_Z_OFFSET);
    group.add(head);

    const eyes = createEyes(headWidth, head.position, C.MODELS.HELPER_EYE_COLOR, config.EYE_SIZE / headWidth); // Pass size factor
    group.add(eyes);
    const snout = createSnout(head.position, color, config.SNOUT_WIDTH, config.SNOUT_HEIGHT, config.SNOUT_DEPTH);
    group.add(snout);
    const ears = createEars(headWidth, headHeight, head.position, color, true); // Pointy = true for deer
    group.add(ears);

    const neckGeometry = new THREE.BoxGeometry(neckWidth, neckHeight, neckDepth, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const neckMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });
    const neck = new THREE.Mesh(neckGeometry, neckMaterial);
    neck.castShadow = true;
    neck.position.set(0, torso.position.y + config.NECK_Y_OFFSET, config.NECK_Z_OFFSET);
    neck.rotation.x = config.NECK_ROTATION_X;
    group.add(neck);

    const legY = config.LEG_Y_POS;
    const legGeometry = new THREE.BoxGeometry(legWidth, legHeight, legDepth, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const legMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });

    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.castShadow = true;
    frontLeftLeg.position.set(-config.LEG_X_OFFSET, legY, config.FRONT_LEG_Z);
    group.add(frontLeftLeg);
    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.castShadow = true;
    frontRightLeg.position.set(config.LEG_X_OFFSET, legY, config.FRONT_LEG_Z);
    group.add(frontRightLeg);
    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.castShadow = true;
    backLeftLeg.position.set(-config.LEG_X_OFFSET, legY, config.BACK_LEG_Z);
    group.add(backLeftLeg);
    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.castShadow = true;
    backRightLeg.position.set(config.LEG_X_OFFSET, legY, config.BACK_LEG_Z);
    group.add(backRightLeg);

    const antlerColor = config.ANTLER_COLOR;
    const leftAntlerGroup = new THREE.Group();
    const mainBranchGeo = new THREE.CylinderGeometry(config.ANTLER_MAIN_RADIUS_BOTTOM, config.ANTLER_MAIN_RADIUS_TOP, config.ANTLER_MAIN_HEIGHT, config.ANTLER_MAIN_SEGMENTS);
    const antlerMaterial = new THREE.MeshStandardMaterial({ color: antlerColor, roughness: config.ANTLER_ROUGHNESS });
    const leftMainBranch = new THREE.Mesh(mainBranchGeo, antlerMaterial);
    leftMainBranch.position.set(0, config.ANTLER_MAIN_Y_OFFSET, 0);
    leftMainBranch.rotation.z = config.ANTLER_MAIN_ROTATION_Z;
    leftAntlerGroup.add(leftMainBranch);
    const secondaryBranchGeo = new THREE.CylinderGeometry(config.ANTLER_SECONDARY_RADIUS_BOTTOM, config.ANTLER_SECONDARY_RADIUS_TOP, config.ANTLER_SECONDARY_HEIGHT, config.ANTLER_SECONDARY_SEGMENTS);
    const leftBranch1 = new THREE.Mesh(secondaryBranchGeo, antlerMaterial);
    leftBranch1.position.set(config.ANTLER_BRANCH1_X_OFFSET, config.ANTLER_BRANCH1_Y_OFFSET, 0);
    leftBranch1.rotation.z = config.ANTLER_BRANCH1_ROTATION_Z;
    leftAntlerGroup.add(leftBranch1);
    const leftBranch2 = new THREE.Mesh(secondaryBranchGeo, antlerMaterial);
    leftBranch2.position.set(config.ANTLER_BRANCH2_X_OFFSET, config.ANTLER_BRANCH2_Y_OFFSET, 0);
    leftBranch2.rotation.z = config.ANTLER_BRANCH2_ROTATION_Z;
    leftAntlerGroup.add(leftBranch2);
    leftAntlerGroup.position.set(-config.ANTLER_GROUP_X_OFFSET, head.position.y + config.ANTLER_GROUP_Y_OFFSET, head.position.z);
    group.add(leftAntlerGroup);
    const rightAntlerGroup = leftAntlerGroup.clone();
    rightAntlerGroup.position.set(config.ANTLER_GROUP_X_OFFSET, head.position.y + config.ANTLER_GROUP_Y_OFFSET, head.position.z);
    rightAntlerGroup.rotation.y = config.ANTLER_RIGHT_ROTATION_Y;
    group.add(rightAntlerGroup);

    group.userData.legs = { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg };
    group.userData.legHeight = legHeight;
    return group;
}

/**
 * Creates a desert rock model using assets.
 * @param {object} [properties] - Optional properties (not currently used).
 * @returns {THREE.Group} The rock model group.
 */
export function createRockDesertModel(properties) {
     const group = new THREE.Group();
     const config = C.MODELS.ROCK_DESERT;
     const geo = AssetManager.getAsset(config.GEO_KEY);
     const mat = AssetManager.getAsset(config.MATERIAL_KEY);
     if (geo && mat) {
         const mesh = new THREE.Mesh(geo, mat);
         mesh.castShadow = true;
         mesh.receiveShadow = true;
         group.add(mesh);
     } else {
         logger.warn(`Missing geometry (${config.GEO_KEY}) or material (${config.MATERIAL_KEY}) for rock_desert`);
     }
     return group;
}

/**
 * Creates a procedural Saguaro cactus model.
 * @param {object} [properties] - Optional properties (not currently used).
 * @returns {THREE.Group} The cactus model group.
 */
export function createCactusSaguaroModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.CACTUS_SAGUARO;
    const mat = AssetManager.getAsset(config.MATERIAL_KEY);
    if (!mat) { logger.warn(`Missing ${config.MATERIAL_KEY}`); return group; }
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(config.TRUNK_RADIUS_BOTTOM, config.TRUNK_RADIUS_TOP, config.TRUNK_HEIGHT, config.TRUNK_SEGMENTS), mat);
    trunk.position.y = config.TRUNK_Y_POS;
    group.add(trunk);
    const armGeo = new THREE.CylinderGeometry(config.ARM_RADIUS_BOTTOM, config.ARM_RADIUS_TOP, config.ARM_HEIGHT, config.ARM_SEGMENTS);
    const arm1 = new THREE.Mesh(armGeo, mat);
    arm1.position.set(config.ARM1_X_POS, config.ARM1_Y_POS, 0);
    arm1.rotation.z = config.ARM1_Z_ROT;
    arm1.rotation.y = config.ARM1_Y_ROT;
    group.add(arm1);
    const arm2 = new THREE.Mesh(armGeo, mat);
    arm2.position.set(config.ARM2_X_POS, config.ARM2_Y_POS, 0);
    arm2.rotation.z = config.ARM2_Z_ROT;
    arm2.rotation.y = config.ARM2_Y_ROT;
    group.add(arm2);
    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}

/**
 * Creates a procedural Barrel cactus model.
 * @param {object} [properties] - Optional properties (not currently used).
 * @returns {THREE.Group} The cactus model group.
 */
export function createCactusBarrelModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.CACTUS_BARREL;
    const mat = AssetManager.getAsset(config.MATERIAL_KEY);
    if (!mat) { logger.warn(`Missing ${config.MATERIAL_KEY}`); return group; }
    const geo = AssetManager.getAsset(config.GEO_KEY) || new THREE.CylinderGeometry(config.FALLBACK_RADIUS_BOTTOM, config.FALLBACK_RADIUS_TOP, config.FALLBACK_HEIGHT, config.FALLBACK_SEGMENTS); // Use asset or fallback
    const mesh = new THREE.Mesh(geo, mat);
    // Calculate Y position based on geometry height
    const height = (geo.parameters.height !== undefined) ? geo.parameters.height : config.FALLBACK_HEIGHT;
    mesh.position.y = height * config.Y_POS_FACTOR;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
}

/**
 * Creates a procedural Saloon model.
 * @param {object} [properties] - Optional properties (not currently used).
 * @returns {THREE.Group} The saloon model group.
 */
export function createSaloonModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.SALOON;
    const mat = AssetManager.getAsset(config.MATERIAL_KEY);
    if (!mat) { logger.warn(`Missing ${config.MATERIAL_KEY}`); return group; }
    const geo = AssetManager.getAsset(config.GEO_KEY) || new THREE.BoxGeometry(config.FALLBACK_WIDTH, config.FALLBACK_HEIGHT, config.FALLBACK_DEPTH); // Use asset or fallback
    const buildingHeight = (geo.parameters.height !== undefined) ? geo.parameters.height : config.FALLBACK_HEIGHT;
    const buildingDepth = (geo.parameters.depth !== undefined) ? geo.parameters.depth : config.FALLBACK_DEPTH;
    const buildingWidth = (geo.parameters.width !== undefined) ? geo.parameters.width : config.FALLBACK_WIDTH;

    const mainBuilding = new THREE.Mesh(geo, mat);
    mainBuilding.position.y = buildingHeight * config.BUILDING_Y_POS_FACTOR;
    group.add(mainBuilding);
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(buildingWidth * config.ROOF_WIDTH_FACTOR, config.ROOF_HEIGHT, config.ROOF_DEPTH), mat);
    porchRoof.position.set(0, mainBuilding.position.y + buildingHeight * 0.5 + config.ROOF_Y_OFFSET, buildingDepth * config.ROOF_Z_OFFSET_FACTOR);
    group.add(porchRoof);
    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}

/**
 * Creates a procedural Railroad Sign model.
 * @param {object} [properties] - Optional properties (not currently used).
 * @returns {THREE.Group} The sign model group.
 */
export function createRailroadSignModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.RAILROAD_SIGN;
    const woodMat = AssetManager.getAsset(config.WOOD_MATERIAL_KEY);
    const signMat = new THREE.MeshStandardMaterial({ color: config.SIGN_COLOR });
    if (!woodMat) { logger.warn(`Missing ${config.WOOD_MATERIAL_KEY} for railroad sign`); return group; }
    const post = new THREE.Mesh(new THREE.CylinderGeometry(config.POST_RADIUS, config.POST_RADIUS, config.POST_HEIGHT, config.POST_SEGMENTS), woodMat);
    post.position.y = config.POST_HEIGHT * config.POST_Y_POS_FACTOR;
    group.add(post);
    const signGeo = new THREE.BoxGeometry(config.SIGN_WIDTH, config.SIGN_HEIGHT, config.SIGN_DEPTH);
    const cross1 = new THREE.Mesh(signGeo, signMat);
    cross1.position.set(0, config.SIGN_Y_POS, 0);
    cross1.rotation.z = config.SIGN_ROTATION_Z;
    group.add(cross1);
    const cross2 = new THREE.Mesh(signGeo, signMat);
    cross2.position.set(0, config.SIGN_Y_POS, 0);
    cross2.rotation.z = -config.SIGN_ROTATION_Z;
    group.add(cross2);
    group.traverse(child => { if (child.isMesh) { child.castShadow = true; } });
    return group;
}

/**
 * Creates a Skull model using assets or fallback.
 * @param {object} [properties] - Optional properties (not currently used).
 * @returns {THREE.Group} The skull model group.
 */
export function createSkullModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.SKULL;
    const geo = AssetManager.getAsset(config.GEO_KEY) || new THREE.IcosahedronGeometry(config.FALLBACK_RADIUS, config.FALLBACK_DETAIL); // Use asset or fallback
    const mat = new THREE.MeshStandardMaterial({ color: config.COLOR, roughness: config.ROUGHNESS });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);
    return group;
}

/**
 * Creates a Dried Bush model using assets or fallback.
 * @param {object} [properties] - Optional properties (not currently used).
 * @returns {THREE.Group} The bush model group.
 */
export function createDriedBushModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.DRIED_BUSH;
    const geo = AssetManager.getAsset(config.GEO_KEY) || new THREE.IcosahedronGeometry(config.FALLBACK_RADIUS, config.FALLBACK_DETAIL); // Use asset or fallback
    const mat = new THREE.MeshStandardMaterial({ color: config.COLOR, roughness: config.ROUGHNESS });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
}

/**
 * Creates a Wagon Wheel model using assets or fallback.
 * @param {object} [properties] - Optional properties (not currently used).
 * @returns {THREE.Group} The wheel model group.
 */
export function createWagonWheelModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.WAGON_WHEEL;
    const mat = AssetManager.getAsset(config.MATERIAL_KEY);
    if (!mat) { logger.warn(`Missing ${config.MATERIAL_KEY} for wagon wheel`); return group; }
    const geo = AssetManager.getAsset(config.GEO_KEY) || new THREE.TorusGeometry(config.FALLBACK_RADIUS, config.FALLBACK_TUBE_RADIUS, config.FALLBACK_RADIAL_SEGMENTS, config.FALLBACK_TUBULAR_SEGMENTS); // Use asset or fallback
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = config.ROTATION_X;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
}

/**
 * Creates a procedural Mine Entrance model.
 * @param {object} [properties] - Optional properties (not currently used).
 * @returns {THREE.Group} The mine entrance model group.
 */
export function createMineEntranceModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.MINE_ENTRANCE;
    const woodMat = AssetManager.getAsset(config.WOOD_MATERIAL_KEY);
    // const rockMat = AssetManager.getAsset(config.ROCK_MATERIAL_KEY); // Available but not used
    if (!woodMat) { logger.warn(`Missing ${config.WOOD_MATERIAL_KEY} for mine entrance`); return group; }
    const frameSideGeo = new THREE.BoxGeometry(config.FRAME_SIDE_WIDTH, config.FRAME_SIDE_HEIGHT, config.FRAME_SIDE_DEPTH);
    const frameTopGeo = new THREE.BoxGeometry(config.FRAME_TOP_WIDTH, config.FRAME_TOP_HEIGHT, config.FRAME_TOP_DEPTH);
    const leftPost = new THREE.Mesh(frameSideGeo, woodMat);
    leftPost.position.set(-config.FRAME_TOP_WIDTH * config.POST_X_OFFSET_FACTOR, config.FRAME_SIDE_HEIGHT * config.POST_Y_POS_FACTOR, 0);
    group.add(leftPost);
    const rightPost = new THREE.Mesh(frameSideGeo, woodMat);
    rightPost.position.set(config.FRAME_TOP_WIDTH * config.POST_X_OFFSET_FACTOR, config.FRAME_SIDE_HEIGHT * config.POST_Y_POS_FACTOR, 0);
    group.add(rightPost);
    const topBeam = new THREE.Mesh(frameTopGeo, woodMat);
    topBeam.position.set(0, config.FRAME_SIDE_HEIGHT * config.TOP_Y_POS_FACTOR, 0);
    group.add(topBeam);
    const openingMat = new THREE.MeshBasicMaterial({ color: config.OPENING_COLOR });
    const opening = new THREE.Mesh(new THREE.PlaneGeometry(config.FRAME_TOP_WIDTH * config.OPENING_WIDTH_FACTOR, config.FRAME_SIDE_HEIGHT * config.OPENING_HEIGHT_FACTOR), openingMat);
    opening.position.set(0, config.FRAME_SIDE_HEIGHT * config.OPENING_Y_POS_FACTOR, config.OPENING_Z_POS);
    group.add(opening);
    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}

/**
 * Creates a procedural Water Tower model.
 * @param {object} [properties] - Optional properties (not currently used).
 * @returns {THREE.Group} The water tower model group.
 */
export function createWaterTowerModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.WATER_TOWER;
    const woodMat = AssetManager.getAsset(config.WOOD_MATERIAL_KEY);
    if (!woodMat) { logger.warn(`Missing ${config.WOOD_MATERIAL_KEY} for water tower`); return group; }
    const tankGeo = new THREE.CylinderGeometry(config.TANK_RADIUS, config.TANK_RADIUS, config.TANK_HEIGHT, config.TANK_SEGMENTS);
    const tank = new THREE.Mesh(tankGeo, woodMat);
    tank.position.y = config.TANK_Y_POS;
    group.add(tank);
    const legGeo = new THREE.BoxGeometry(config.LEG_WIDTH, config.LEG_HEIGHT, config.LEG_DEPTH);
    const legY = config.LEG_HEIGHT * config.LEG_Y_POS_FACTOR;
    const legOffset = config.LEG_OFFSET;
    const leg1 = new THREE.Mesh(legGeo, woodMat);
    leg1.position.set(legOffset, legY, legOffset);
    group.add(leg1);
    const leg2 = new THREE.Mesh(legGeo, woodMat);
    leg2.position.set(-legOffset, legY, legOffset);
    group.add(leg2);
    const leg3 = new THREE.Mesh(legGeo, woodMat);
    leg3.position.set(legOffset, legY, -legOffset);
    group.add(leg3);
    const leg4 = new THREE.Mesh(legGeo, woodMat);
    leg4.position.set(-legOffset, legY, -legOffset);
    group.add(leg4);
    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}

/**
 * Creates a Tumbleweed model (visual only) using assets or fallback.
 * @param {object} [properties] - Optional properties (not currently used).
 * @returns {THREE.Group} The tumbleweed model group.
 */
export function createTumbleweedModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.TUMBLEWEED_MODEL;
    const geo = AssetManager.getAsset(config.GEO_KEY) || new THREE.IcosahedronGeometry(config.FALLBACK_RADIUS, config.FALLBACK_DETAIL); // Use asset or fallback
    const mat = new THREE.MeshStandardMaterial({ color: config.COLOR, roughness: config.ROUGHNESS });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);
    return group;
}

/**
 * Creates a procedural Coyote model.
 * @param {object} [properties] - Optional properties (e.g., color).
 * @returns {THREE.Group} The coyote model group.
 */
export function createCoyoteModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.COYOTE;
    const color = properties?.color || config.DEFAULT_COLOR;
    const torsoWidth = config.TORSO_WIDTH, torsoHeight = config.TORSO_HEIGHT, torsoDepth = config.TORSO_DEPTH;
    const headWidth = config.HEAD_WIDTH, headHeight = config.HEAD_HEIGHT, headDepth = config.HEAD_DEPTH;
    const neckWidth = config.NECK_WIDTH, neckHeight = config.NECK_HEIGHT, neckDepth = config.NECK_DEPTH;
    const legWidth = config.LEG_WIDTH, legHeight = config.LEG_HEIGHT, legDepth = config.LEG_DEPTH;

    const torsoGeometry = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const torsoMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.castShadow = true;
    torso.position.y = config.TORSO_Y_POS;
    group.add(torso);

    const headGeometry = new THREE.BoxGeometry(headWidth, headHeight, headDepth, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const headMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.castShadow = true;
    head.position.set(0, torso.position.y + config.HEAD_Y_OFFSET, config.HEAD_Z_OFFSET);
    group.add(head);

    const eyes = createEyes(headWidth, head.position, C.MODELS.HELPER_EYE_COLOR, config.EYE_SIZE / headWidth); // Pass size factor
    group.add(eyes);
    const snout = createSnout(head.position, color, config.SNOUT_WIDTH, config.SNOUT_HEIGHT, config.SNOUT_DEPTH);
    group.add(snout);
    const ears = createEars(headWidth, headHeight, head.position, color, true); // Pointy = true for coyote
    group.add(ears);

    const neckGeometry = new THREE.BoxGeometry(neckWidth, neckHeight, neckDepth, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const neckMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });
    const neck = new THREE.Mesh(neckGeometry, neckMaterial);
    neck.castShadow = true;
    neck.position.set(0, torso.position.y + config.NECK_Y_OFFSET, config.NECK_Z_OFFSET);
    neck.rotation.x = config.NECK_ROTATION_X;
    group.add(neck);

    const legY = config.LEG_Y_POS;
    const legGeometry = new THREE.BoxGeometry(legWidth, legHeight, legDepth, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const legMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });

    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.castShadow = true;
    frontLeftLeg.position.set(-config.LEG_X_OFFSET, legY, config.FRONT_LEG_Z);
    group.add(frontLeftLeg);
    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.castShadow = true;
    frontRightLeg.position.set(config.LEG_X_OFFSET, legY, config.FRONT_LEG_Z);
    group.add(frontRightLeg);
    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.castShadow = true;
    backLeftLeg.position.set(-config.LEG_X_OFFSET, legY, config.BACK_LEG_Z);
    group.add(backLeftLeg);
    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.castShadow = true;
    backRightLeg.position.set(config.LEG_X_OFFSET, legY, config.BACK_LEG_Z);
    group.add(backRightLeg);

    const tailBasePosition = new THREE.Vector3(0, torso.position.y + config.TAIL_BASE_Y_OFFSET, config.TAIL_BASE_Z_OFFSET);
    const tailSegments = config.TAIL_SEGMENTS;
    const tailWidth = config.TAIL_WIDTH;
    const tailSegmentLength = config.TAIL_SEGMENT_LENGTH;
    let currentPos = new THREE.Vector3().copy(tailBasePosition);
    let currentAngle = config.TAIL_INITIAL_ANGLE;
    for (let i = 0; i < tailSegments; i++) {
        const segmentWidth = tailWidth * (1 - i * config.TAIL_SEGMENT_WIDTH_FACTOR);
        const segment = createBoxPart(segmentWidth, segmentWidth, tailSegmentLength, color);
        segment.position.copy(currentPos);
        segment.rotation.x = currentAngle;
        group.add(segment);
        currentPos.z += Math.cos(currentAngle) * tailSegmentLength;
        currentPos.y += Math.sin(currentAngle) * tailSegmentLength;
        currentAngle += config.TAIL_ANGLE_INCREMENT;
    }

    group.userData.legs = { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg };
    group.userData.legHeight = legHeight;
    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}

/**
 * Creates a procedural Rattlesnake model.
 * @param {object} [properties] - Optional properties (e.g., color).
 * @returns {THREE.Group} The rattlesnake model group.
 */
export function createRattlesnakeModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.RATTLESNAKE;
    const color = properties?.color || config.DEFAULT_COLOR;

    const segmentMat = new THREE.MeshStandardMaterial({ color: color, roughness: config.SEGMENT_ROUGHNESS });
    const headGeo = new THREE.ConeGeometry(config.HEAD_RADIUS, config.HEAD_HEIGHT, config.HEAD_SEGMENTS);
    const headMat = new THREE.MeshStandardMaterial({ color: color, roughness: config.HEAD_ROUGHNESS });
    const head = new THREE.Mesh(headGeo, headMat);
    head.rotation.x = config.HEAD_ROTATION_X;
    head.position.set(0, config.HEAD_Y_POS, config.HEAD_Z_POS);
    group.add(head);

    const eyeGeo = new THREE.SphereGeometry(config.EYE_RADIUS, config.EYE_SEGMENTS, config.EYE_SEGMENTS);
    const eyeMat = new THREE.MeshStandardMaterial({ color: config.EYE_COLOR, roughness: config.EYE_ROUGHNESS, metalness: config.EYE_METALNESS });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-config.EYE_X_OFFSET, config.EYE_Y_POS, config.EYE_Z_POS);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(config.EYE_X_OFFSET, config.EYE_Y_POS, config.EYE_Z_POS);
    group.add(rightEye);

    const numSegments = config.NUM_BODY_SEGMENTS;
    let currentPos = new THREE.Vector3(0, config.BODY_INITIAL_Y_POS, config.BODY_INITIAL_Z_POS);
    let currentAngle = 0;
    for (let i = 0; i < numSegments; i++) {
        const radius = config.BODY_RADIUS_START - (i * config.BODY_RADIUS_DECREMENT);
        const topRadius = radius * config.BODY_RADIUS_TOP_FACTOR; // Simplified calculation
        const segmentGeo = new THREE.CylinderGeometry(radius, topRadius, config.BODY_SEGMENT_LENGTH, config.BODY_SEGMENTS);
        const segmentColor = i % 2 === 0 ? color : new THREE.Color(color).multiplyScalar(config.BODY_COLOR_MULTIPLIER).getHex();
        const currentSegmentMat = new THREE.MeshStandardMaterial({ color: segmentColor, roughness: config.SEGMENT_ROUGHNESS });
        const segment = new THREE.Mesh(segmentGeo, currentSegmentMat);
        segment.position.copy(currentPos);
        segment.rotation.x = config.BODY_ROTATION_X;
        segment.rotation.y = currentAngle;
        group.add(segment);
        currentPos.z -= config.BODY_Z_DECREMENT;
        currentPos.x += (i % 2 === 0 ? config.BODY_X_OFFSET : -config.BODY_X_OFFSET);
        currentAngle += (i % 2 === 0 ? -config.BODY_ANGLE_INCREMENT : config.BODY_ANGLE_INCREMENT);
    }

    const rattleBasePos = new THREE.Vector3().copy(currentPos);
    rattleBasePos.z += config.RATTLE_BASE_Z_OFFSET; // Adjust based on last segment position
    const rattleSegments = config.RATTLE_SEGMENTS;
    const rattleColor = config.RATTLE_COLOR;
    const rattleMat = new THREE.MeshStandardMaterial({ color: rattleColor, roughness: config.RATTLE_ROUGHNESS });
    for (let i = 0; i < rattleSegments; i++) {
        const rattleSize = config.RATTLE_SIZE_START - (i * config.RATTLE_SIZE_DECREMENT);
        const rattleGeo = new THREE.SphereGeometry(rattleSize, config.RATTLE_SEGMENTS_DETAIL, config.RATTLE_SEGMENTS_DETAIL);
        const rattleSegment = new THREE.Mesh(rattleGeo, rattleMat);
        rattleSegment.position.copy(rattleBasePos);
        rattleSegment.position.z -= i * config.RATTLE_Z_OFFSET_FACTOR;
        group.add(rattleSegment);
    }

    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}

/**
 * Creates a procedural Scorpion model.
 * @param {object} [properties] - Optional properties (e.g., color).
 * @returns {THREE.Group} The scorpion model group.
 */
export function createScorpionModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.SCORPION;
    const color = properties?.color || config.DEFAULT_COLOR;

    const bodyGeo = new THREE.BoxGeometry(config.BODY_WIDTH, config.BODY_HEIGHT, config.BODY_DEPTH, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.position.y = config.BODY_Y_POS;
    group.add(body);

    const headGeo = new THREE.BoxGeometry(config.HEAD_WIDTH, config.HEAD_HEIGHT, config.HEAD_DEPTH, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const headMat = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    head.position.set(0, config.HEAD_Y_POS, config.HEAD_Z_OFFSET);
    group.add(head);

    const eyeGeo = new THREE.SphereGeometry(config.EYE_RADIUS, config.EYE_SEGMENTS, config.EYE_SEGMENTS);
    const eyeMat = new THREE.MeshStandardMaterial({ color: config.EYE_COLOR, roughness: config.EYE_ROUGHNESS });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-config.EYE_X_OFFSET, config.EYE_Y_POS, config.EYE_Z_OFFSET);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(config.EYE_X_OFFSET, config.EYE_Y_POS, config.EYE_Z_OFFSET);
    group.add(rightEye);

    let tailY = config.TAIL_INITIAL_Y;
    let tailZ = config.TAIL_INITIAL_Z;
    const tailSegments = config.TAIL_SEGMENTS;
    const tailMat = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });
    for (let i = 0; i < tailSegments; i++) {
        const radius = config.TAIL_RADIUS_START - (i * config.TAIL_RADIUS_DECREMENT);
        const tailSegmentGeo = new THREE.CylinderGeometry(radius, radius, config.TAIL_SEGMENT_LENGTH, config.TAIL_SEGMENT_SEGMENTS);
        const segment = new THREE.Mesh(tailSegmentGeo, tailMat);
        segment.rotation.x = config.TAIL_ROTATION_X;
        segment.position.set(0, tailY, tailZ);
        const curveAngle = config.TAIL_CURVE_FACTOR * (i + 1) / tailSegments;
        segment.rotation.x += curveAngle;
        group.add(segment);
        tailY += config.TAIL_Y_INCREMENT;
        tailZ += config.TAIL_Z_INCREMENT;
    }

    const stingerGeo = new THREE.ConeGeometry(config.STINGER_RADIUS, config.STINGER_HEIGHT, config.STINGER_SEGMENTS);
    const stingerMat = new THREE.MeshStandardMaterial({ color: config.STINGER_COLOR, roughness: config.STINGER_ROUGHNESS, metalness: config.STINGER_METALNESS });
    const stinger = new THREE.Mesh(stingerGeo, stingerMat);
    stinger.position.set(0, tailY, tailZ);
    stinger.rotation.x = config.STINGER_ROTATION_X;
    group.add(stinger);

    const clawBaseGeo = new THREE.BoxGeometry(config.CLAW_BASE_WIDTH, config.CLAW_BASE_HEIGHT, config.CLAW_BASE_DEPTH, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const clawMat = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });
    const pincerGeo = new THREE.BoxGeometry(config.PINCER_WIDTH, config.PINCER_HEIGHT, config.PINCER_DEPTH, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);

    const leftClawGroup = new THREE.Group();
    const leftClawBase = new THREE.Mesh(clawBaseGeo, clawMat);
    leftClawBase.position.set(0, 0, config.CLAW_BASE_Z_OFFSET);
    leftClawGroup.add(leftClawBase);
    const leftPincerUpper = new THREE.Mesh(pincerGeo, clawMat);
    leftPincerUpper.position.set(0, config.PINCER_UPPER_Y_OFFSET, config.PINCER_Z_OFFSET);
    leftClawGroup.add(leftPincerUpper);
    const leftPincerLower = new THREE.Mesh(pincerGeo, clawMat);
    leftPincerLower.position.set(0, config.PINCER_LOWER_Y_OFFSET, config.PINCER_Z_OFFSET);
    leftClawGroup.add(leftPincerLower);
    leftClawGroup.position.set(config.CLAW_GROUP_X_OFFSET, config.CLAW_GROUP_Y_POS, config.CLAW_GROUP_Z_OFFSET);
    leftClawGroup.rotation.y = -config.CLAW_ROTATION_Y;
    group.add(leftClawGroup);

    const rightClawGroup = leftClawGroup.clone();
    rightClawGroup.position.set(-config.CLAW_GROUP_X_OFFSET, config.CLAW_GROUP_Y_POS, config.CLAW_GROUP_Z_OFFSET);
    rightClawGroup.rotation.y = config.CLAW_ROTATION_Y;
    group.add(rightClawGroup);

    const legGeo = new THREE.BoxGeometry(config.LEG_WIDTH, config.LEG_HEIGHT, config.LEG_DEPTH, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL, config.GEOMETRY_DETAIL);
    const legMat = new THREE.MeshStandardMaterial({ color: color, roughness: config.MATERIAL_ROUGHNESS });
    const legPositions = config.LEG_POSITIONS;
    legPositions.forEach(pos => {
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(pos.x, config.LEG_Y_POS, pos.z);
        leftLeg.rotation.z = config.LEG_ROTATION_Z;
        group.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(-pos.x, config.LEG_Y_POS, pos.z);
        rightLeg.rotation.z = -config.LEG_ROTATION_Z;
        group.add(rightLeg);
    });

    group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return group;
}

/**
 * Creates a procedural Buzzard model.
 * @param {object} [properties] - Optional properties (not currently used).
 * @returns {THREE.Group} The buzzard model group.
 */
export function createBuzzardModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.BUZZARD;
    const color = config.BODY_COLOR; // Use config color

    const bodyGeo = new THREE.SphereGeometry(config.BODY_RADIUS, config.BODY_SEGMENTS_W, config.BODY_SEGMENTS_H);
    bodyGeo.scale(1, config.BODY_SCALE_Y, config.BODY_SCALE_Z);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: config.BODY_ROUGHNESS });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(config.HEAD_RADIUS, config.HEAD_SEGMENTS_W, config.HEAD_SEGMENTS_H);
    const headMat = new THREE.MeshStandardMaterial({ color: config.HEAD_COLOR, roughness: config.HEAD_ROUGHNESS });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    head.position.set(0, config.HEAD_Y_OFFSET, config.HEAD_Z_OFFSET);
    group.add(head);

    const eyeGeo = new THREE.SphereGeometry(config.EYE_RADIUS, config.EYE_SEGMENTS, config.EYE_SEGMENTS);
    const eyeMat = new THREE.MeshStandardMaterial({ color: config.EYE_COLOR, roughness: config.EYE_ROUGHNESS, metalness: config.EYE_METALNESS });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-config.EYE_X_OFFSET, config.EYE_Y_POS, config.EYE_Z_OFFSET);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(config.EYE_X_OFFSET, config.EYE_Y_POS, config.EYE_Z_OFFSET);
    group.add(rightEye);

    const beakGeo = new THREE.ConeGeometry(config.BEAK_RADIUS, config.BEAK_HEIGHT, config.BEAK_SEGMENTS);
    const beakMat = new THREE.MeshStandardMaterial({ color: config.BEAK_COLOR, roughness: config.BEAK_ROUGHNESS });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.castShadow = true;
    beak.rotation.x = config.BEAK_ROTATION_X;
    beak.position.set(0, config.BEAK_Y_POS, config.BEAK_Z_OFFSET);
    group.add(beak);

    const wingColor = color; // Use body color for wings
    const leftWingGroup = new THREE.Group();
    const wingSegments = config.WING_SEGMENTS;
    const wingLength = config.WING_LENGTH;
    const segmentLength = wingLength / wingSegments;
    const segmentMat = new THREE.MeshStandardMaterial({ color: wingColor, roughness: config.WING_ROUGHNESS });
    for (let i = 0; i < wingSegments; i++) {
        const width = config.WING_SEGMENT_WIDTH_FACTOR * (1 - i * config.WING_SEGMENT_WIDTH_REDUCTION);
        const segmentGeo = new THREE.BoxGeometry(segmentLength, config.WING_SEGMENT_HEIGHT, width, config.GEOMETRY_DETAIL, 1, config.GEOMETRY_DETAIL);
        const segment = new THREE.Mesh(segmentGeo, segmentMat);
        segment.castShadow = true;
        segment.position.set(-segmentLength/2 - i*segmentLength, 0, 0);
        segment.rotation.z = config.WING_SEGMENT_ROTATION_FACTOR * (i + 1);
        leftWingGroup.add(segment);
    }

    const featherGeo = new THREE.BoxGeometry(config.FEATHER_WIDTH, config.FEATHER_HEIGHT, config.FEATHER_DEPTH, 1, 1, 1);
    const featherMat = new THREE.MeshStandardMaterial({ color: config.FEATHER_COLOR, roughness: config.FEATHER_ROUGHNESS });
    for (let i = 0; i < config.FEATHER_COUNT; i++) {
        const feather = new THREE.Mesh(featherGeo, featherMat);
        feather.castShadow = true;
        feather.position.set(config.FEATHER_X_POS, 0, config.FEATHER_Z_START + i * config.FEATHER_Z_INCREMENT);
        feather.rotation.z = config.FEATHER_ROTATION_Z;
        leftWingGroup.add(feather);
    }
    leftWingGroup.position.set(0, 0, 0);
    group.add(leftWingGroup);

    const rightWingGroup = leftWingGroup.clone();
    rightWingGroup.scale.x = -1;
    group.add(rightWingGroup);

    const tailGeo = new THREE.BoxGeometry(config.TAIL_WIDTH, config.TAIL_HEIGHT, config.TAIL_DEPTH, config.GEOMETRY_DETAIL, 1, config.GEOMETRY_DETAIL);
    const tailMat = new THREE.MeshStandardMaterial({ color: color, roughness: config.TAIL_ROUGHNESS });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.castShadow = true;
    tail.position.set(0, config.TAIL_Y_POS, config.TAIL_Z_POS); // Corrected: Y should likely be 0
    group.add(tail);

    group.traverse(child => { if (child.isMesh) { child.castShadow = true; } });
    return group;
}

/**
 * Creates a procedural Magnet powerup model.
 * @param {object} [properties] - Optional properties (e.g., size, color).
 * @returns {THREE.Group} The magnet model group.
 */
export function createMagnetModel(properties) {
    const group = new THREE.Group();
    const config = C.MODELS.MAGNET;
    const size = properties?.size || config.DEFAULT_SIZE;
    const color = properties?.color || config.DEFAULT_COLOR;
    const magnetMat = new THREE.MeshStandardMaterial({ color: color, emissive: config.MAGNET_EMISSIVE, metalness: config.MAGNET_METALNESS, roughness: config.MAGNET_ROUGHNESS });
    const whiteTipMat = new THREE.MeshStandardMaterial({ color: config.TIP_COLOR, emissive: config.TIP_EMISSIVE, metalness: config.TIP_METALNESS, roughness: config.TIP_ROUGHNESS });
    const baseWidth = size * config.BASE_WIDTH_FACTOR;
    const baseHeight = size * config.BASE_HEIGHT_FACTOR;
    const baseGeo = new THREE.TorusGeometry(baseWidth/2, baseHeight/2, config.BASE_SEGMENTS, config.BASE_SEGMENTS, config.BASE_ARC);
    const base = new THREE.Mesh(baseGeo, magnetMat);
    base.rotation.x = config.GROUP_ROTATION_X; // Apply rotation here if needed, or to tiltedGroup later
    base.position.set(0, 0, 0);
    group.add(base);
    const armWidth = size * config.ARM_WIDTH_FACTOR;
    const armHeight = size * config.ARM_HEIGHT_FACTOR;
    const leftArmGeo = new THREE.CylinderGeometry(armWidth/2, armWidth/2, armHeight, config.ARM_SEGMENTS);
    const leftArm = new THREE.Mesh(leftArmGeo, magnetMat);
    leftArm.position.set(-baseWidth/2 + armWidth/2, armHeight/2, 0);
    group.add(leftArm);
    const rightArmGeo = new THREE.CylinderGeometry(armWidth/2, armWidth/2, armHeight, config.ARM_SEGMENTS);
    const rightArm = new THREE.Mesh(rightArmGeo, magnetMat);
    rightArm.position.set(baseWidth/2 - armWidth/2, armHeight/2, 0);
    group.add(rightArm);
    const tipRadius = size * config.TIP_RADIUS_FACTOR;
    const tipHeight = size * config.TIP_HEIGHT_FACTOR;
    const leftTipGeo = new THREE.CylinderGeometry(tipRadius, tipRadius, tipHeight, config.TIP_SEGMENTS);
    const leftTip = new THREE.Mesh(leftTipGeo, whiteTipMat);
    // leftTip.rotation.x = config.GROUP_ROTATION_X; // Rotation applied to group
    leftTip.position.set(-baseWidth/2 + armWidth/2, armHeight + tipHeight/2, 0);
    group.add(leftTip);
    const rightTipGeo = new THREE.CylinderGeometry(tipRadius, tipRadius, tipHeight, config.TIP_SEGMENTS);
    const rightTip = new THREE.Mesh(rightTipGeo, whiteTipMat);
    // rightTip.rotation.x = config.GROUP_ROTATION_X; // Rotation applied to group
    rightTip.position.set(baseWidth/2 - armWidth/2, armHeight + tipHeight/2, 0);
    group.add(rightTip);
    const tiltedGroup = new THREE.Group();
    tiltedGroup.add(group);
    group.rotation.x = config.GROUP_ROTATION_X; // Rotate inner group
    tiltedGroup.rotation.z = config.TILTED_GROUP_ROTATION_Z;
    tiltedGroup.rotation.y = config.TILTED_GROUP_ROTATION_Y;
    tiltedGroup.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return tiltedGroup;
}