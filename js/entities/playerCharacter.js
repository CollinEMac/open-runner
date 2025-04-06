// js/entities/playerCharacter.js
import * as THREE from 'three';
// Import specific constants
import {
    PLAYER_HEAD_SIZE, PLAYER_TORSO_HEIGHT, PLAYER_TORSO_WIDTH, PLAYER_TORSO_DEPTH,
    PLAYER_LIMB_WIDTH, PLAYER_JOINT_RADIUS,
    PLAYER_UPPER_ARM_LENGTH, PLAYER_FOREARM_LENGTH, PLAYER_THIGH_LENGTH, PLAYER_CALF_LENGTH,
    PLAYER_ANIMATION_BASE_SPEED, PLAYER_MAX_ANIMATION_SPEED_FACTOR, // Used in animatePlayerCharacter
    PLAYER_ARM_SWING_AMPLITUDE, PLAYER_LEG_SWING_AMPLITUDE,
    PLAYER_ELBOW_BEND_AMPLITUDE, PLAYER_KNEE_BEND_AMPLITUDE,
    PLAYER_DEFAULT_COLOR, PLAYER_DEFAULT_ROUGHNESS, PLAYER_DEFAULT_METALNESS, // New material constants
    PLAYER_JOINT_SEGMENTS_W, PLAYER_JOINT_SEGMENTS_H, PLAYER_LIMB_OFFSET_FACTOR // New geometry/offset constants
} from '../config/config.js'; // Moved to config


/**
 * Creates a low-poly blocky character model with references to animatable limb groups and joint groups.
 * The model uses a nested structure:
 * - characterGroup (overall container, origin at torso center)
 *   - headMesh
 *   - torsoMesh
 *   - leftArmGroup (pivots at shoulder)
 *     - leftUpperArmMesh
 *     - leftElbowGroup (pivots at elbow)
 *       - leftElbowMesh (sphere)
 *       - leftForearmMesh
 *   - rightArmGroup (pivots at shoulder)
 *     - ... (similar structure)
 *   - leftLegGroup (pivots at hip)
 *     - leftThighMesh
 *     - leftKneeGroup (pivots at knee)
 *       - leftKneeMesh (sphere)
 *       - leftCalfMesh
 *   - rightLegGroup (pivots at hip)
 *     - ... (similar structure)
 * @returns {object} An object containing the main character group and references to limb/joint groups:
 *                   {
 *                       characterGroup: THREE.Group,
 *                       leftArmGroup: THREE.Group, rightArmGroup: THREE.Group,
 *                       leftLegGroup: THREE.Group, rightLegGroup: THREE.Group,
 *                       leftElbowGroup: THREE.Group, rightElbowGroup: THREE.Group, // Groups containing forearm+elbow, pivot at elbow
 *                       leftKneeGroup: THREE.Group, rightKneeGroup: THREE.Group    // Groups containing calf+knee, pivot at knee
 *                   }
 */
// Material - Use constants for default material
export const grayMaterial = new THREE.MeshStandardMaterial({
    color: PLAYER_DEFAULT_COLOR,
    roughness: PLAYER_DEFAULT_ROUGHNESS,
    metalness: PLAYER_DEFAULT_METALNESS
});

export function createPlayerCharacter() {

    const characterGroup = new THREE.Group(); // Overall group for the character model

    // Dimensions from imported constants
    const headSize = PLAYER_HEAD_SIZE;
    const torsoHeight = PLAYER_TORSO_HEIGHT;
    const torsoWidth = PLAYER_TORSO_WIDTH;
    const torsoDepth = PLAYER_TORSO_DEPTH;
    const limbWidth = PLAYER_LIMB_WIDTH;
    // Remove commented out unused variables
    const jointRadius = PLAYER_JOINT_RADIUS;

    // Limb segment lengths from imported constants
    const upperArmLength = PLAYER_UPPER_ARM_LENGTH;
    const forearmLength = PLAYER_FOREARM_LENGTH;
    const thighLength = PLAYER_THIGH_LENGTH;
    const calfLength = PLAYER_CALF_LENGTH;

    // Head
    const headGeometry = new THREE.BoxGeometry(headSize, headSize, headSize);
    const headMesh = new THREE.Mesh(headGeometry, grayMaterial);
    headMesh.position.y = torsoHeight / 2 + headSize / 2; // Position on top of torso
    characterGroup.add(headMesh);

    // Torso
    const torsoGeometry = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth);
    const torsoMesh = new THREE.Mesh(torsoGeometry, grayMaterial);
    // Torso is the center, position y=0 relative to the characterGroup's origin
    characterGroup.add(torsoMesh);

    // --- Limb Geometries & Joint Geometry ---
    const upperArmGeometry = new THREE.BoxGeometry(limbWidth, upperArmLength, limbWidth);
    const forearmGeometry = new THREE.BoxGeometry(limbWidth, forearmLength, limbWidth);
    const thighGeometry = new THREE.BoxGeometry(limbWidth, thighLength, limbWidth);
    const calfGeometry = new THREE.BoxGeometry(limbWidth, calfLength, limbWidth);
    const jointGeometry = new THREE.SphereGeometry(jointRadius, PLAYER_JOINT_SEGMENTS_W, PLAYER_JOINT_SEGMENTS_H); // Use constants

    // --- Limb Groups (for overall swing) ---
    const leftArmGroup = new THREE.Group(); // Pivots at shoulder
    const rightArmGroup = new THREE.Group(); // Pivots at shoulder
    const leftLegGroup = new THREE.Group(); // Pivots at hip
    const rightLegGroup = new THREE.Group(); // Pivots at hip

    // --- Joint Groups (for bending) ---
    const leftElbowGroup = new THREE.Group(); // Contains forearm+elbow, pivots at elbow
    const rightElbowGroup = new THREE.Group(); // Contains forearm+elbow, pivots at elbow
    const leftKneeGroup = new THREE.Group(); // Contains calf+knee, pivots at knee
    const rightKneeGroup = new THREE.Group(); // Contains calf+knee, pivots at knee

    // --- Positioning Constants ---
    const shoulderY = torsoHeight / 2;
    const shoulderX = torsoWidth / 2 + limbWidth / 2;
    const hipY = -torsoHeight / 2;
    const hipX = torsoWidth / 4;
    const elbowOffsetY = -upperArmLength; // Y offset from shoulder to elbow pivot
    const kneeOffsetY = -thighLength; // Y offset from hip pivot to knee pivot

    // --- Left Arm ---
    const leftUpperArmMesh = new THREE.Mesh(upperArmGeometry, grayMaterial);
    const leftElbowMesh = new THREE.Mesh(jointGeometry, grayMaterial); // Elbow sphere
    const leftForearmMesh = new THREE.Mesh(forearmGeometry, grayMaterial);

    // Position upper arm relative to shoulder pivot
    leftUpperArmMesh.position.y = -upperArmLength / 2;
    leftArmGroup.add(leftUpperArmMesh);

    // Position elbow group relative to shoulder pivot (at the end of upper arm)
    leftElbowGroup.position.y = elbowOffsetY;
    leftArmGroup.add(leftElbowGroup); // Add elbow group to the main arm group

    // Position elbow sphere and forearm relative to the elbow pivot
    // Elbow sphere sits at the pivot
    leftElbowMesh.position.y = 0; // Centered at the elbow group's origin
    // Forearm hangs below the elbow pivot
    leftForearmMesh.position.y = -forearmLength / 2 - jointRadius * 0.5; // Adjusted offset

    leftElbowGroup.add(leftElbowMesh);
    leftElbowGroup.add(leftForearmMesh);

    // Position the entire arm group relative to the character's torso center
    leftArmGroup.position.set(-shoulderX, shoulderY, 0);
    characterGroup.add(leftArmGroup);

    // --- Right Arm ---
    const rightUpperArmMesh = new THREE.Mesh(upperArmGeometry, grayMaterial);
    const rightElbowMesh = new THREE.Mesh(jointGeometry, grayMaterial); // Elbow sphere
    const rightForearmMesh = new THREE.Mesh(forearmGeometry, grayMaterial);

    rightUpperArmMesh.position.y = -upperArmLength / 2;
    rightArmGroup.add(rightUpperArmMesh);

    rightElbowGroup.position.y = elbowOffsetY;
    rightArmGroup.add(rightElbowGroup);

    rightElbowMesh.position.y = 0;
    rightForearmMesh.position.y = -forearmLength / 2 - jointRadius * PLAYER_LIMB_OFFSET_FACTOR; // Use constant factor

    rightElbowGroup.add(rightElbowMesh);
    rightElbowGroup.add(rightForearmMesh);

    // Position the entire arm group relative to the character's torso center
    rightArmGroup.position.set(shoulderX, shoulderY, 0);
    characterGroup.add(rightArmGroup);

    // --- Left Leg ---
    const leftThighMesh = new THREE.Mesh(thighGeometry, grayMaterial);
    const leftKneeMesh = new THREE.Mesh(jointGeometry, grayMaterial); // Knee sphere
    const leftCalfMesh = new THREE.Mesh(calfGeometry, grayMaterial);

    leftThighMesh.position.y = -thighLength / 2;
    leftLegGroup.add(leftThighMesh);

    leftKneeGroup.position.y = kneeOffsetY;
    leftLegGroup.add(leftKneeGroup);

    leftKneeMesh.position.y = 0;
    leftCalfMesh.position.y = -calfLength / 2 - jointRadius * PLAYER_LIMB_OFFSET_FACTOR; // Use constant factor

    leftKneeGroup.add(leftKneeMesh);
    leftKneeGroup.add(leftCalfMesh);

    // Position the entire leg group relative to the character's torso center
    leftLegGroup.position.set(-hipX, hipY, 0);
    characterGroup.add(leftLegGroup);

    // --- Right Leg ---
    const rightThighMesh = new THREE.Mesh(thighGeometry, grayMaterial);
    const rightKneeMesh = new THREE.Mesh(jointGeometry, grayMaterial); // Knee sphere
    const rightCalfMesh = new THREE.Mesh(calfGeometry, grayMaterial);

    rightThighMesh.position.y = -thighLength / 2;
    rightLegGroup.add(rightThighMesh);

    rightKneeGroup.position.y = kneeOffsetY;
    rightLegGroup.add(rightKneeGroup);

    rightKneeMesh.position.y = 0;
    rightCalfMesh.position.y = -calfLength / 2 - jointRadius * PLAYER_LIMB_OFFSET_FACTOR; // Use constant factor

    rightKneeGroup.add(rightKneeMesh);
    rightKneeGroup.add(rightCalfMesh);

    // Position the entire leg group relative to the character's torso center
    rightLegGroup.position.set(hipX, hipY, 0);
    characterGroup.add(rightLegGroup);

    // The characterGroup's origin remains at the center of the torso.
    // The overall world position is handled in main.js.

    // Return the main group and references to the limb and joint groups for animation
    return {
        characterGroup,
        leftArmGroup, rightArmGroup,
        leftLegGroup, rightLegGroup,
        leftElbowGroup, rightElbowGroup,
        leftKneeGroup, rightKneeGroup
    };
}


/**
 * Animates the character model's limbs for a running motion, including joint bending.
 * @param {object} parts - Object containing limb and joint groups { leftArmGroup, rightArmGroup, ..., leftElbowGroup, ..., leftKneeGroup, ... }.
 * @param {number} time - Current time elapsed (e.g., from THREE.Clock.getElapsedTime()).
 * @param {number} runSpeed - The speed factor for the animation frequency.
 */
export function animatePlayerCharacter(parts, animationTime, runSpeed = 10) {
    const {
        leftArmGroup, rightArmGroup, leftLegGroup, rightLegGroup,
        leftElbowGroup, rightElbowGroup, leftKneeGroup, rightKneeGroup
    } = parts;

    // Animation parameters from imported constants
    const frequency = runSpeed; // Keep runSpeed as the dynamic factor
    const armAmplitude = PLAYER_ARM_SWING_AMPLITUDE;
    const legAmplitude = PLAYER_LEG_SWING_AMPLITUDE;
    const elbowBendAmplitude = PLAYER_ELBOW_BEND_AMPLITUDE;
    const kneeBendAmplitude = PLAYER_KNEE_BEND_AMPLITUDE;

    // Calculate base swing angles
    const armSwing = Math.sin(animationTime * frequency) * armAmplitude;
    const legSwing = Math.sin(animationTime * frequency) * legAmplitude;

    // Apply overall limb swing rotations (at shoulder/hip)
    if (leftArmGroup) leftArmGroup.rotation.x = legSwing;
    if (rightArmGroup) rightArmGroup.rotation.x = -legSwing;
    if (leftLegGroup) leftLegGroup.rotation.x = -armSwing; // Opposite arm
    if (rightLegGroup) rightLegGroup.rotation.x = armSwing; // Opposite arm

    // Calculate joint bend angles
    // Knees bend when leg is forward, elbows bend when arm is back
    // Use cosine shifted, ensure bend is always positive (or zero)
    const kneeBend = (Math.cos(animationTime * frequency + Math.PI) + 1) / 2 * kneeBendAmplitude; // Bend amount for right leg (forward)
    const elbowBend = (Math.cos(animationTime * frequency) + 1) / 2 * elbowBendAmplitude; // Bend amount for right arm (backward)

    // Apply joint bend rotations (at elbow/knee)
    // Note: Rotation is applied to the group containing the lower limb segment
    if (leftKneeGroup) leftKneeGroup.rotation.x = -kneeBend; // Left leg is back, less bend? Or sync bend? Let's sync for now.
    if (rightKneeGroup) rightKneeGroup.rotation.x = -kneeBend; // Bend inwards (negative X rotation)

    if (leftElbowGroup) leftElbowGroup.rotation.x = elbowBend; // Left arm is forward, less bend? Or sync bend? Let's sync.
    if (rightElbowGroup) rightElbowGroup.rotation.x = elbowBend; // Bend inwards (positive X rotation)

    // Optional: Add slight up/down bobbing to the main character group?
    // const bobAmplitude = 0.1;
    // const bobFrequency = runSpeed * 2; // Bob twice per cycle
    // characterGroup.position.y += Math.sin(time * bobFrequency) * bobAmplitude;
    // Note: Bobbing needs the characterGroup reference, might require restructuring createPlayerCharacter or passing it in.
    // Let's skip bobbing for now to keep it simpler.
}