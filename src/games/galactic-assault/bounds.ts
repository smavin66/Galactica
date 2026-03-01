import { Rect } from '../../engine/types';
import type { Alien } from './AlienFormation';
import type { Bullet } from './Bullets';
import type { PowerUpItem } from './PowerUp';

/** Create a centered bounding rect from position + dimensions */
export function centeredBounds(x: number, y: number, w: number, h: number): Rect {
  return { x: x - w / 2, y: y - h / 2, w, h };
}

export function alienBounds(alien: Alien): Rect {
  return centeredBounds(alien.x, alien.y, alien.width, alien.height);
}

export function bulletBounds(b: Bullet): Rect {
  return centeredBounds(b.x, b.y, b.width, b.height);
}

export function powerUpBounds(p: PowerUpItem): Rect {
  return { x: p.x - p.size, y: p.y - p.size, w: p.size * 2, h: p.size * 2 };
}
