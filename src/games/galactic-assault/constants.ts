// Formation layout
export const FORMATION_COLS = 8;
export const FORMATION_ROWS = 5;
export const ALIEN_WIDTH = 34;
export const ALIEN_HEIGHT = 28;
export const FORMATION_SPACING_X = 50;
export const FORMATION_SPACING_Y = 42;
export const FORMATION_TOP = 60;
export const ALIEN_POINTS = [50, 40, 30, 20, 10] as const;

// Wave difficulty scaling
export const BASE_SWAY_SPEED = 40;
export const SWAY_SPEED_PER_WAVE = 8;
export const BASE_SHOOT_INTERVAL = 1.5;
export const SHOOT_INTERVAL_PER_WAVE = 0.15;
export const MIN_SHOOT_INTERVAL = 0.4;
export const BASE_DIVE_INTERVAL = 3;
export const DIVE_INTERVAL_PER_WAVE = 0.3;
export const MIN_DIVE_INTERVAL = 1.0;
export const GROUP_DIVE_CHANCE_PER_WAVE = 0.2;
export const MAX_GROUP_DIVE_CHANCE = 0.7;
export const COMMANDER_ARMOR_WAVE = 3;
export const WARRIOR_ARMOR_WAVE = 6;

// Player
export const PLAYER_SPEED = 300;
export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 24;
export const DEFAULT_SHOOT_RATE = 0.3;
export const RAPID_FIRE_MULTIPLIER = 0.4;
export const SHIELD_HITS = 3;
export const POWERUP_DURATION = 5;
export const INVULN_DURATION = 2;
export const DYING_DURATION = 1.5;

// Bullets
export const PLAYER_BULLET_SPEED = -500;
export const ALIEN_BULLET_SPEED = 200;
export const BULLET_OFF_SCREEN_MARGIN = 20;

// Mystery ship
export const MYSTERY_SHIP_Y = 32;
export const MYSTERY_SHIP_WIDTH = 40;
export const MYSTERY_SHIP_HEIGHT = 18;
export const MYSTERY_SHIP_SPAWN_MIN = 18;
export const MYSTERY_SHIP_SPAWN_MAX = 30;
export const MYSTERY_SHIP_SPEED_MIN = 120;
export const MYSTERY_SHIP_SPEED_MAX = 180;
export const MYSTERY_SHIP_POINTS = [200, 300, 500] as const;

// Power-ups
export const POWERUP_SPAWN_CHANCE = 0.25;
export const POWERUP_FALL_SPEED = 80;
export const POWERUP_SIZE = 14;
