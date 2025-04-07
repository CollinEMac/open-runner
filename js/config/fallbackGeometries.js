// js/config/fallbackGeometries.js

// Fallback Geometry Parameters (used if assets fail to load or aren't defined)
export const fallbackGeometriesConfig = {
    COIN: { RADIUS: 0.75, HEIGHT: 0.2, SEGMENTS: 16 },
    ROCK_SMALL: { RADIUS: 1, DETAIL: 0 }, // Using Icosahedron/Dodecahedron detail param
    ROCK_LARGE: { RADIUS: 2.5, DETAIL: 0 },
    LOG_FALLEN: { RADIUS: 0.5, HEIGHT: 5, SEGMENTS: 8 },
    CABIN: { WIDTH: 8, HEIGHT: 6, DEPTH: 10 },
    ROCK_DESERT: { RADIUS: 1.5, DETAIL: 0 },
    CACTUS_BARREL: { RAD_BOT: 1.0, RAD_TOP: 1.2, HEIGHT: 1.5, SEGMENTS: 12 },
    SALOON: { WIDTH: 12, HEIGHT: 8, DEPTH: 15 },
    SKULL: { RADIUS: 0.5, DETAIL: 0 },
    DRIED_BUSH: { RADIUS: 0.8, DETAIL: 0 },
    WAGON_WHEEL: { RADIUS: 1.0, TUBE: 0.15, RAD_SEG: 6, TUB_SEG: 12 },
    TUMBLEWEED: { RADIUS: 1.0, DETAIL: 1 }
};