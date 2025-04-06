// js/config/models.js

// Models configuration
export const modelsConfig = {
    // --- Helper Defaults ---
    HELPER_EYE_COLOR: 0x000000,
    HELPER_EYE_SIZE_FACTOR: 0.1, // Relative to head width/height
    HELPER_EYE_ROUGHNESS: 0.3,
    HELPER_EYE_METALNESS: 0.2,
    HELPER_EYE_WHITE_COLOR: 0xFFFFFF,
    HELPER_EYE_WHITE_ROUGHNESS: 0.3,
    HELPER_EYE_WHITE_METALNESS: 0.0,
    HELPER_EYE_WHITE_SIZE_FACTOR: 1.3, // Relative to eye size
    HELPER_EYE_OFFSET_FACTOR: 0.25, // Relative to head width
    HELPER_EYE_DEPTH_FACTOR: 0.4, // Relative to head width
    HELPER_EYE_PUPIL_DEPTH_FACTOR: 0.5, // Relative to eye size
    HELPER_SNOUT_COLOR_MULTIPLIER: 0.9,
    HELPER_SNOUT_TIP_COLOR_MULTIPLIER: 0.7,
    HELPER_SNOUT_TIP_SIZE_FACTOR: 0.3, // Relative to snout width
    HELPER_SNOUT_TIP_DEPTH_FACTOR: 0.6, // Relative to snout depth
    HELPER_SNOUT_ROUGHNESS: 0.9,
    HELPER_SNOUT_TIP_ROUGHNESS: 0.7,
    HELPER_SNOUT_Y_OFFSET_FACTOR: 0.1, // Relative to snout height
    HELPER_SNOUT_Z_OFFSET_FACTOR: 1.2, // Relative to snout depth
    HELPER_EAR_COLOR_MULTIPLIER: 0.9,
    HELPER_INNER_EAR_COLOR: 0xFF9999,
    HELPER_EAR_ROUGHNESS: 0.8,
    HELPER_INNER_EAR_ROUGHNESS: 0.7,
    HELPER_POINTY_EAR_RADIUS_FACTOR: 0.15, // Relative to head width
    HELPER_POINTY_EAR_HEIGHT_FACTOR: 0.5, // Relative to head height
    HELPER_POINTY_INNER_EAR_RADIUS_FACTOR: 0.1, // Relative to head width
    HELPER_POINTY_INNER_EAR_HEIGHT_FACTOR: 0.35, // Relative to head height
    HELPER_ROUND_EAR_RADIUS_FACTOR: 0.2, // Relative to head width
    HELPER_ROUND_INNER_EAR_RADIUS_FACTOR: 0.15, // Relative to head width
    HELPER_ROUND_EAR_SCALE_Y: 1.2,
    HELPER_ROUND_EAR_SCALE_Z: 0.7,
    HELPER_INNER_EAR_Z_OFFSET: -0.05,
    HELPER_POINTY_EAR_ROTATION_Z: Math.PI / 12,
    HELPER_EAR_OFFSET_FACTOR: 0.35, // Relative to head width
    HELPER_EAR_Y_OFFSET_FACTOR: 0.4, // Relative to head height
    HELPER_TAIL_SEGMENTS: 4,
    HELPER_TAIL_CURVE_FACTOR: Math.PI / 8,

    // --- Tree Pine ---
    TREE_PINE: {
        GROUP_NAME: 'tree_pine_group',
        TRUNK_NAME: 'treeTrunk',
        FOLIAGE_NAME: 'treeFoliage',
        OBJECT_TYPE: 'tree_pine',
        TRUNK_HEIGHT: 4,
        TRUNK_RADIUS: 0.5,
        FOLIAGE_HEIGHT: 12,
        FOLIAGE_RADIUS: 3.5,
        TRUNK_SEGMENTS: 8,
        FOLIAGE_SEGMENTS: 8,
        TRUNK_MATERIAL_KEY: 'treeTrunkMaterial',
        FOLIAGE_MATERIAL_KEY: 'treeFoliageMaterial',
        FALLBACK_TRUNK_COLOR: 0x8B4513,
        FALLBACK_TRUNK_ROUGHNESS: 0.9,
        FALLBACK_FOLIAGE_COLOR: 0x228B22,
        FALLBACK_FOLIAGE_ROUGHNESS: 0.7,
        // Collision (Trunk radius used directly from dimensions)
        ALLOW_WALK_UNDER: true // Flag to indicate special collision handling
    },

    // --- Bear ---
    BEAR: {
        DEFAULT_COLOR: 0x8B4513,
        TORSO_WIDTH: 3.5, TORSO_HEIGHT: 2.5, TORSO_DEPTH: 5.0,
        HEAD_WIDTH: 1.8, HEAD_HEIGHT: 1.5, HEAD_DEPTH: 1.5,
        LEG_WIDTH: 0.8, LEG_HEIGHT: 2.0, LEG_DEPTH: 0.8,
        TORSO_ROUGHNESS: 0.8,
        HEAD_ROUGHNESS: 0.7,
        LEG_ROUGHNESS: 0.8,
        TORSO_Y_OFFSET_FACTOR: -0.2, // Relative to leg height + torso height
        HEAD_Y_OFFSET_FACTOR: 0.4, // Relative to torso height
        HEAD_Z_OFFSET_FACTOR: -0.3, // Relative to head depth
        EYE_SIZE: 0.15,
        SNOUT_WIDTH: 0.9, SNOUT_HEIGHT: 0.7, SNOUT_DEPTH: 0.8,
        LEG_Y_OFFSET_FACTOR: 0.5, // Relative to leg height
        LEG_X_OFFSET_FACTOR: 0.4, // Relative to leg width
        FRONT_LEG_Z_FACTOR: 0.6, // Relative to leg depth
        BACK_LEG_Z_FACTOR: 0.6, // Relative to leg depth
        GEOMETRY_DETAIL: 2, // Segments for BoxGeometry
        // Collision (Approximated from dimensions)
        COLLISION_WIDTH_FACTOR: 1.0, // Use full width
        COLLISION_DEPTH_FACTOR: 1.0  // Use full depth
    },

    // --- Squirrel ---
    SQUIRREL: {
        DEFAULT_COLOR: 0xA0522D,
        TORSO_WIDTH: 0.8, TORSO_HEIGHT: 0.7, TORSO_DEPTH: 1.5,
        HEAD_WIDTH: 0.6, HEAD_HEIGHT: 0.5, HEAD_DEPTH: 0.5,
        LEG_WIDTH: 0.25, LEG_HEIGHT: 0.6, LEG_DEPTH: 0.25,
        MATERIAL_ROUGHNESS: 0.7,
        TORSO_Y_POS: 0.5,
        HEAD_Y_OFFSET: 0.2, // Relative to torso pos
        HEAD_Z_OFFSET: -0.8,
        EYE_SIZE: 0.08,
        SNOUT_WIDTH: 0.3, SNOUT_HEIGHT: 0.25, SNOUT_DEPTH: 0.25,
        LEG_Y_POS: 0,
        LEG_X_OFFSET_FACTOR: 0.1, // Relative to torso width
        FRONT_LEG_Z_OFFSET_FACTOR: 0.2, // Relative to torso depth
        BACK_LEG_Z_OFFSET_FACTOR: 0.2, // Relative to torso depth
        TAIL_BASE_Y_OFFSET: 0.3, // Relative to torso pos
        TAIL_BASE_Z_OFFSET_FACTOR: 0.2, // Relative to torso depth
        TAIL_SEGMENTS: 5,
        TAIL_WIDTH: 0.4,
        TAIL_SEGMENT_LENGTH: 0.3,
        TAIL_CURVE: Math.PI / 4,
        TAIL_INITIAL_ANGLE: -Math.PI / 6,
        TAIL_SEGMENT_WIDTH_FACTOR: 0.7, // For first/last segment
        GEOMETRY_DETAIL: 2,
        // Collision (Approximated from dimensions)
        COLLISION_WIDTH_FACTOR: 1.0,
        COLLISION_DEPTH_FACTOR: 1.0
    },

    // --- Deer ---
    DEER: {
        DEFAULT_COLOR: 0xD2B48C,
        TORSO_WIDTH: 1.2, TORSO_HEIGHT: 1.3, TORSO_DEPTH: 2.8,
        HEAD_WIDTH: 0.8, HEAD_HEIGHT: 0.8, HEAD_DEPTH: 0.9,
        NECK_WIDTH: 0.5, NECK_HEIGHT: 0.5, NECK_DEPTH: 0.8,
        LEG_WIDTH: 0.3, LEG_HEIGHT: 1.5, LEG_DEPTH: 0.3,
        MATERIAL_ROUGHNESS: 0.7,
        TORSO_Y_POS: 1.0,
        HEAD_Y_OFFSET: 0.5, // Relative to torso pos
        HEAD_Z_OFFSET: -1.6,
        EYE_SIZE: 0.1,
        SNOUT_WIDTH: 0.4, SNOUT_HEIGHT: 0.3, SNOUT_DEPTH: 0.5,
        NECK_Y_OFFSET: 0.3, // Relative to torso pos
        NECK_Z_OFFSET: -1.1,
        NECK_ROTATION_X: Math.PI / 6,
        LEG_Y_POS: 0,
        LEG_X_OFFSET: 0.4,
        FRONT_LEG_Z: -1.0,
        BACK_LEG_Z: 1.0,
        ANTLER_COLOR: 0x654321,
        ANTLER_ROUGHNESS: 0.9,
        ANTLER_MAIN_RADIUS_BOTTOM: 0.05, ANTLER_MAIN_RADIUS_TOP: 0.08, ANTLER_MAIN_HEIGHT: 0.8, ANTLER_MAIN_SEGMENTS: 5,
        ANTLER_SECONDARY_RADIUS_BOTTOM: 0.03, ANTLER_SECONDARY_RADIUS_TOP: 0.05, ANTLER_SECONDARY_HEIGHT: 0.4, ANTLER_SECONDARY_SEGMENTS: 5,
        ANTLER_MAIN_Y_OFFSET: 0.4,
        ANTLER_MAIN_ROTATION_Z: Math.PI / 12,
        ANTLER_BRANCH1_X_OFFSET: 0.1, ANTLER_BRANCH1_Y_OFFSET: 0.6, ANTLER_BRANCH1_ROTATION_Z: Math.PI / 4,
        ANTLER_BRANCH2_X_OFFSET: -0.1, ANTLER_BRANCH2_Y_OFFSET: 0.7, ANTLER_BRANCH2_ROTATION_Z: -Math.PI / 5,
        ANTLER_GROUP_X_OFFSET: 0.3,
        ANTLER_GROUP_Y_OFFSET: 0.4, // Relative to head pos
        ANTLER_RIGHT_ROTATION_Y: Math.PI,
        GEOMETRY_DETAIL: 2,
        // Collision (Approximated from dimensions)
        COLLISION_WIDTH_FACTOR: 1.0,
        COLLISION_DEPTH_FACTOR: 1.0
    },

    // --- Rock Desert ---
    ROCK_DESERT: {
        GEO_KEY: 'rockDesertGeo',
        MATERIAL_KEY: 'rockMaterial',
        // Collision (Example radius, adjust as needed)
        COLLISION_RADIUS: 1.5 // Generic radius for rocks
    },

    // --- Cactus Saguaro ---
    CACTUS_SAGUARO: {
        MATERIAL_KEY: 'cactusMaterial',
        TRUNK_RADIUS_BOTTOM: 0.5, TRUNK_RADIUS_TOP: 0.6, TRUNK_HEIGHT: 8, TRUNK_SEGMENTS: 8,
        TRUNK_Y_POS: 4,
        ARM_RADIUS_BOTTOM: 0.3, ARM_RADIUS_TOP: 0.4, ARM_HEIGHT: 3, ARM_SEGMENTS: 6,
        ARM1_X_POS: 0.6, ARM1_Y_POS: 5, ARM1_Z_ROT: -Math.PI / 4, ARM1_Y_ROT: Math.PI / 8,
        ARM2_X_POS: -0.6, ARM2_Y_POS: 6, ARM2_Z_ROT: Math.PI / 4, ARM2_Y_ROT: -Math.PI / 8,
        // Collision (Approximated from trunk radius)
        COLLISION_RADIUS: 0.8
    },

    // --- Cactus Barrel ---
    CACTUS_BARREL: {
        MATERIAL_KEY: 'cactusMaterial',
        GEO_KEY: 'cactusBarrelGeo',
        FALLBACK_RADIUS_BOTTOM: 1.0, FALLBACK_RADIUS_TOP: 1.2, FALLBACK_HEIGHT: 1.5, FALLBACK_SEGMENTS: 12,
        Y_POS_FACTOR: 0.5, // Relative to height
        // Collision (Approximated from fallback radius)
        COLLISION_RADIUS: 1.2
    },

    // --- Saloon ---
    SALOON: {
        MATERIAL_KEY: 'saloonMaterial',
        GEO_KEY: 'saloonGeo',
        FALLBACK_WIDTH: 12, FALLBACK_HEIGHT: 8, FALLBACK_DEPTH: 15,
        BUILDING_Y_POS_FACTOR: 0.5, // Relative to height
        ROOF_WIDTH_FACTOR: 1.16, // Relative to building width (14/12)
        ROOF_HEIGHT: 0.5,
        ROOF_DEPTH: 4,
        ROOF_Y_OFFSET: -0.25, // Relative to building height
        ROOF_Z_OFFSET_FACTOR: -0.63, // Relative to building depth (-9.5/15)
        // Collision (Approximated from fallback dimensions)
        COLLISION_RADIUS: 6.0 // Half of width
    },

    // --- Railroad Sign ---
    RAILROAD_SIGN: {
        WOOD_MATERIAL_KEY: 'logMaterial',
        SIGN_COLOR: 0xffffff,
        POST_RADIUS: 0.2, POST_HEIGHT: 5, POST_SEGMENTS: 6,
        POST_Y_POS_FACTOR: 0.5, // Relative to height
        SIGN_WIDTH: 3, SIGN_HEIGHT: 0.5, SIGN_DEPTH: 0.1,
        SIGN_Y_POS: 4.5,
        SIGN_ROTATION_Z: Math.PI / 4,
        // Collision (Approximated from post radius)
        COLLISION_RADIUS: 0.3
    },

    // --- Skull ---
    SKULL: {
        GEO_KEY: 'skullGeo',
        FALLBACK_RADIUS: 0.5, FALLBACK_DETAIL: 0,
        COLOR: 0xFFFACD,
        ROUGHNESS: 0.6,
        // Collision (Approximated from fallback radius)
        COLLISION_RADIUS: 0.5
    },

    // --- Dried Bush ---
    DRIED_BUSH: {
        GEO_KEY: 'driedBushGeo',
        FALLBACK_RADIUS: 0.8, FALLBACK_DETAIL: 0,
        COLOR: 0xBC8F8F,
        ROUGHNESS: 0.9,
        // Collision (Approximated from fallback radius)
        COLLISION_RADIUS: 1.0
    },

    // --- Wagon Wheel ---
    WAGON_WHEEL: {
        MATERIAL_KEY: 'logMaterial',
        GEO_KEY: 'wagonWheelGeo',
        FALLBACK_RADIUS: 1.0, FALLBACK_TUBE_RADIUS: 0.15, FALLBACK_RADIAL_SEGMENTS: 6, FALLBACK_TUBULAR_SEGMENTS: 12,
        ROTATION_X: Math.PI / 2,
        // Collision (Approximated from fallback radius)
        COLLISION_RADIUS: 1.0
    },

    // --- Mine Entrance ---
    MINE_ENTRANCE: {
        WOOD_MATERIAL_KEY: 'logMaterial',
        ROCK_MATERIAL_KEY: 'rockMaterial', // Available but not used in current code
        FRAME_SIDE_WIDTH: 0.5, FRAME_SIDE_HEIGHT: 6, FRAME_SIDE_DEPTH: 0.5,
        FRAME_TOP_WIDTH: 5, FRAME_TOP_HEIGHT: 0.5, FRAME_TOP_DEPTH: 0.5,
        POST_X_OFFSET_FACTOR: 0.45, // Relative to top width (2.25/5)
        POST_Y_POS_FACTOR: 0.5, // Relative to side height
        TOP_Y_POS_FACTOR: 1.04, // Relative to side height (6.25/6)
        OPENING_COLOR: 0x111111,
        OPENING_WIDTH_FACTOR: 0.8, // Relative to top width (4/5)
        OPENING_HEIGHT_FACTOR: 0.917, // Relative to side height (5.5/6)
        OPENING_Y_POS_FACTOR: 0.458, // Relative to side height (2.75/6)
        OPENING_Z_POS: 0.3,
        // Collision (Approximated from frame width)
        COLLISION_RADIUS: 2.5 // Half of top width
    },

    // --- Water Tower ---
    WATER_TOWER: {
        WOOD_MATERIAL_KEY: 'logMaterial',
        TANK_RADIUS: 3, TANK_HEIGHT: 5, TANK_SEGMENTS: 12,
        TANK_Y_POS: 8,
        LEG_WIDTH: 0.4, LEG_HEIGHT: 6, LEG_DEPTH: 0.4,
        LEG_Y_POS_FACTOR: 0.5, // Relative to leg height
        LEG_OFFSET: 2,
        // Collision (Approximated from tank radius)
        COLLISION_RADIUS: 2.5 // Slightly less than tank radius
    },

    // --- Tumbleweed Model (Visual only) ---
    TUMBLEWEED_MODEL: {
        GEO_KEY: 'tumbleweedGeo',
        FALLBACK_RADIUS: 1.0, FALLBACK_DETAIL: 1,
        COLOR: 0xAD8B60,
        ROUGHNESS: 0.8,
        // Collision (Approximated from fallback radius)
        COLLISION_RADIUS: 1.0
    },

    // --- Coyote ---
    COYOTE: {
        DEFAULT_COLOR: 0xAAAAAA,
        TORSO_WIDTH: 1.0, TORSO_HEIGHT: 1.1, TORSO_DEPTH: 2.5,
        HEAD_WIDTH: 0.7, HEAD_HEIGHT: 0.7, HEAD_DEPTH: 0.8,
        NECK_WIDTH: 0.4, NECK_HEIGHT: 0.4, NECK_DEPTH: 0.6,
        LEG_WIDTH: 0.25, LEG_HEIGHT: 1.2, LEG_DEPTH: 0.25,
        MATERIAL_ROUGHNESS: 0.7,
        TORSO_Y_POS: 0.8,
        HEAD_Y_OFFSET: 0.4, // Relative to torso pos
        HEAD_Z_OFFSET: -1.4,
        EYE_SIZE: 0.1,
        SNOUT_WIDTH: 0.4, SNOUT_HEIGHT: 0.3, SNOUT_DEPTH: 0.6,
        NECK_Y_OFFSET: 0.2, // Relative to torso pos
        NECK_Z_OFFSET: -1.0,
        NECK_ROTATION_X: Math.PI / 7,
        LEG_Y_POS: 0,
        LEG_X_OFFSET: 0.35,
        FRONT_LEG_Z: -0.8,
        BACK_LEG_Z: 0.8,
        TAIL_BASE_Y_OFFSET: -0.1, // Relative to torso pos
        TAIL_BASE_Z_OFFSET: 1.4,
        TAIL_SEGMENTS: 4,
        TAIL_WIDTH: 0.2,
        TAIL_SEGMENT_LENGTH: 0.3,
        TAIL_INITIAL_ANGLE: Math.PI / 5,
        TAIL_SEGMENT_WIDTH_FACTOR: 0.15, // Multiplier for width reduction per segment
        TAIL_ANGLE_INCREMENT: Math.PI / 20,
        GEOMETRY_DETAIL: 2,
        // Collision (Approximated from dimensions)
        COLLISION_RADIUS: 0.8
    },

    // --- Rattlesnake ---
    RATTLESNAKE: {
        DEFAULT_COLOR: 0xCD853F,
        SEGMENT_ROUGHNESS: 0.8,
        HEAD_RADIUS: 0.3, HEAD_HEIGHT: 0.7, HEAD_SEGMENTS: 8,
        HEAD_ROUGHNESS: 0.7,
        HEAD_ROTATION_X: -Math.PI / 2,
        HEAD_Y_POS: 0.15, HEAD_Z_POS: 2.0,
        EYE_RADIUS: 0.06, EYE_SEGMENTS: 8,
        EYE_COLOR: 0x000000, EYE_ROUGHNESS: 0.3, EYE_METALNESS: 0.2,
        EYE_X_OFFSET: 0.15, EYE_Y_POS: 0.2, EYE_Z_POS: 1.8,
        NUM_BODY_SEGMENTS: 8,
        BODY_INITIAL_Y_POS: 0.15, BODY_INITIAL_Z_POS: 1.5,
        BODY_RADIUS_START: 0.2, BODY_RADIUS_DECREMENT: 0.01,
        BODY_RADIUS_TOP_FACTOR: 1.25, // Top radius = bottom radius + 0.05 -> (radius + 0.05) / radius
        BODY_SEGMENT_LENGTH: 0.6, BODY_SEGMENTS: 8,
        BODY_COLOR_MULTIPLIER: 0.9, // For alternating segments
        BODY_ROTATION_X: Math.PI / 2,
        BODY_Z_DECREMENT: 0.5,
        BODY_X_OFFSET: 0.15,
        BODY_ANGLE_INCREMENT: 0.15,
        RATTLE_BASE_Z_OFFSET: -0.3,
        RATTLE_SEGMENTS: 3,
        RATTLE_COLOR: 0xAAAAAA, RATTLE_ROUGHNESS: 0.9,
        RATTLE_SIZE_START: 0.15, RATTLE_SIZE_DECREMENT: 0.02, RATTLE_SEGMENTS_DETAIL: 6,
        RATTLE_Z_OFFSET_FACTOR: 0.15, // Distance between rattle segments
        // Collision (Approximated)
        COLLISION_RADIUS: 0.4
    },

    // --- Scorpion ---
    SCORPION: {
        DEFAULT_COLOR: 0x444444,
        BODY_WIDTH: 0.6, BODY_HEIGHT: 0.3, BODY_DEPTH: 1.0,
        HEAD_WIDTH: 0.5, HEAD_HEIGHT: 0.25, HEAD_DEPTH: 0.4,
        MATERIAL_ROUGHNESS: 0.8,
        BODY_Y_POS: 0.15,
        HEAD_Y_POS: 0.15, HEAD_Z_OFFSET: -0.6,
        EYE_RADIUS: 0.04, EYE_SEGMENTS: 6,
        EYE_COLOR: 0x000000, EYE_ROUGHNESS: 0.3,
        EYE_X_OFFSET: 0.1, EYE_Y_POS: 0.2, EYE_Z_OFFSET: -0.8,
        TAIL_INITIAL_Y: 0.2, TAIL_INITIAL_Z: 0.6, TAIL_SEGMENTS: 5,
        TAIL_RADIUS_START: 0.1, TAIL_RADIUS_DECREMENT: 0.01, TAIL_SEGMENT_LENGTH: 0.3, TAIL_SEGMENT_SEGMENTS: 8,
        TAIL_ROTATION_X: Math.PI / 2,
        TAIL_CURVE_FACTOR: -Math.PI / 6,
        TAIL_Y_INCREMENT: 0.15, TAIL_Z_INCREMENT: 0.15,
        STINGER_RADIUS: 0.08, STINGER_HEIGHT: 0.25, STINGER_SEGMENTS: 8,
        STINGER_COLOR: 0x222222, STINGER_ROUGHNESS: 0.7, STINGER_METALNESS: 0.2,
        STINGER_ROTATION_X: -Math.PI / 2,
        CLAW_BASE_WIDTH: 0.15, CLAW_BASE_HEIGHT: 0.15, CLAW_BASE_DEPTH: 0.4,
        PINCER_WIDTH: 0.1, PINCER_HEIGHT: 0.1, PINCER_DEPTH: 0.3,
        CLAW_BASE_Z_OFFSET: 0.2,
        PINCER_UPPER_Y_OFFSET: 0.05, PINCER_LOWER_Y_OFFSET: -0.05, PINCER_Z_OFFSET: -0.15,
        CLAW_GROUP_X_OFFSET: 0.4, CLAW_GROUP_Y_POS: 0.15, CLAW_GROUP_Z_OFFSET: -0.6,
        CLAW_ROTATION_Y: Math.PI / 6,
        LEG_WIDTH: 0.05, LEG_HEIGHT: 0.1, LEG_DEPTH: 0.25,
        LEG_Y_POS: 0.1, LEG_ROTATION_Z: Math.PI / 4,
        LEG_POSITIONS: [ { x: 0.35, z: -0.3 }, { x: 0.35, z: 0 }, { x: 0.35, z: 0.3 }, { x: 0.35, z: 0.6 } ],
        GEOMETRY_DETAIL: 2,
        // Collision (Approximated)
        COLLISION_RADIUS: 0.4
    },

    // --- Buzzard ---
    BUZZARD: {
        BODY_COLOR: 0x333333, BODY_ROUGHNESS: 0.8,
        BODY_RADIUS: 0.5, BODY_SEGMENTS_W: 12, BODY_SEGMENTS_H: 8,
        BODY_SCALE_Y: 0.7, BODY_SCALE_Z: 2.0,
        HEAD_COLOR: 0x333333, HEAD_ROUGHNESS: 0.7,
        HEAD_RADIUS: 0.3, HEAD_SEGMENTS_W: 10, HEAD_SEGMENTS_H: 8,
        HEAD_Y_OFFSET: 0.1, HEAD_Z_OFFSET: -0.8,
        EYE_COLOR: 0xFFFF00, EYE_ROUGHNESS: 0.3, EYE_METALNESS: 0.2,
        EYE_RADIUS: 0.05, EYE_SEGMENTS: 8,
        EYE_X_OFFSET: 0.15, EYE_Y_POS: 0.2, EYE_Z_OFFSET: -0.9,
        BEAK_COLOR: 0x888888, BEAK_ROUGHNESS: 0.7,
        BEAK_RADIUS: 0.1, BEAK_HEIGHT: 0.4, BEAK_SEGMENTS: 8,
        BEAK_ROTATION_X: -Math.PI / 2,
        BEAK_Y_POS: 0.05, BEAK_Z_OFFSET: -1.1,
        WING_SEGMENTS: 3, WING_LENGTH: 3.0, WING_ROUGHNESS: 0.8,
        WING_SEGMENT_WIDTH_FACTOR: 0.8, WING_SEGMENT_WIDTH_REDUCTION: 0.2,
        WING_SEGMENT_HEIGHT: 0.05,
        WING_SEGMENT_ROTATION_FACTOR: Math.PI / 12,
        FEATHER_COLOR: 0x222222, FEATHER_ROUGHNESS: 0.9,
        FEATHER_WIDTH: 0.4, FEATHER_HEIGHT: 0.02, FEATHER_DEPTH: 0.15,
        FEATHER_COUNT: 5, FEATHER_X_POS: -2.8, FEATHER_Z_START: -0.3, FEATHER_Z_INCREMENT: 0.15,
        FEATHER_ROTATION_Z: Math.PI / 6,
        TAIL_WIDTH: 0.6, TAIL_HEIGHT: 0.1, TAIL_DEPTH: 0.8, TAIL_ROUGHNESS: 0.8,
        TAIL_Y_POS: 0, TAIL_Z_POS: 1.0, // Corrected: Y should likely be 0
        GEOMETRY_DETAIL: 2,
        // Collision (Approximated)
        COLLISION_RADIUS: 0.5 // Based on body radius
    },

    // --- Magnet ---
    MAGNET: {
        DEFAULT_SIZE: 0.8,
        DEFAULT_COLOR: 0xF60000,
        MAGNET_EMISSIVE: 0x330000, MAGNET_METALNESS: 0.9, MAGNET_ROUGHNESS: 0.05,
        TIP_COLOR: 0xFFFFFF, TIP_EMISSIVE: 0x666666, TIP_METALNESS: 0.9, TIP_ROUGHNESS: 0.05,
        BASE_WIDTH_FACTOR: 1.6, BASE_HEIGHT_FACTOR: 0.4, BASE_SEGMENTS: 16, BASE_ARC: Math.PI,
        ARM_WIDTH_FACTOR: 0.4, ARM_HEIGHT_FACTOR: 1.6, ARM_SEGMENTS: 16,
        TIP_RADIUS_FACTOR: 0.35, TIP_HEIGHT_FACTOR: 0.3, TIP_SEGMENTS: 16,
        GROUP_ROTATION_X: Math.PI / 2,
        TILTED_GROUP_ROTATION_Z: Math.PI / 6,
        TILTED_GROUP_ROTATION_Y: Math.PI / 12,
        // Collision (Approximated)
        COLLISION_RADIUS: 1.0, // Based on default size
        // Powerup Type (used by collision manager)
        POWERUP_TYPE: 'magnet'
    }
};