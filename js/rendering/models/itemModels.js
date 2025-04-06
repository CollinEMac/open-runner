// js/rendering/models/itemModels.js
import * as THREE from 'three';
import { createLogger } from '../../utils/logger.js';
import { modelsConfig as C_MODELS } from '../../config/models.js';

const logger = createLogger('ItemModels');

/**
 * Creates a procedural Magnet powerup model.
 * @param {object} [properties] - Optional properties (e.g., size, color).
 * @returns {THREE.Group} The magnet model group.
 */
export function createMagnetModel(properties) {
    const group = new THREE.Group();
    const config = C_MODELS.MAGNET;
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