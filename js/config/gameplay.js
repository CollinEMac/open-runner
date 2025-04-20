// js/config/gameplay.js

// Gameplay configuration
export const gameplayConfig = {
    POWERUP_TYPE_MAGNET: 'magnet',
    POWERUP_TYPE_DOUBLER: 'doubler',
    POWERUP_DURATION: 10, // Duration in seconds
    // Magnet visual effect
    MAGNET_EFFECT_COLOR: 0xff0000,
    MAGNET_EFFECT_EMISSIVE: 0x330000,
    MAGNET_EFFECT_METALNESS: 0.9,
    MAGNET_EFFECT_ROUGHNESS: 0.1,
    // Doubler visual effect
    DOUBLER_EFFECT_COLOR: 0x0088FF,
    DOUBLER_EFFECT_EMISSIVE: 0x002244,
    DOUBLER_EFFECT_METALNESS: 0.7,
    DOUBLER_EFFECT_ROUGHNESS: 0.2,
    
    DEFAULT_COIN_SCORE: 10,
    DOUBLER_MULTIPLIER: 2,
    MAGNET_POWERUP_RADIUS: 80, // For coin attraction
    MAGNET_POWERUP_FORCE: 150, // For coin attraction
    COIN_COLLECTION_RADIUS_FACTOR: 1.5, // Multiplier for coin radius during magnet collection
    PLAYER_SAFE_DISTANCE_FACTOR: 0.2, // Multiplier for player radius for min safe distance
    DOUBLER_COLLISION_RADIUS: 1.0, // Collision radius for doubler powerup
    TREE_COLLISION_BUFFER: 0.2 // Buffer below trunk top for collision
};
