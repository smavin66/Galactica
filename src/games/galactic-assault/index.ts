import { Game, CANVAS_W, CANVAS_H } from '../../engine/types';
import { InputManager } from '../../engine/InputManager';
import { StarField } from '../../engine/StarField';
import { ParticleSystem } from '../../engine/Particles';
import { HUD } from '../../engine/HUD';
import { ScreenShake } from '../../engine/ScreenShake';
import { AudioManager } from '../../engine/AudioManager';
import { rectOverlap } from '../../engine/Collision';
import { Player } from './Player';
import { BulletManager } from './Bullets';
import { AlienFormation } from './AlienFormation';
import { PowerUpManager } from './PowerUp';

type GameState = 'ready' | 'playing' | 'dying' | 'gameover' | 'victory';

export class GalacticAssault implements Game {
  private input = new InputManager();
  private stars = new StarField();
  private particles = new ParticleSystem();
  private hud = new HUD();
  private shake = new ScreenShake();
  private audio = new AudioManager();

  private player = new Player();
  private bullets = new BulletManager();
  private aliens = new AlienFormation();
  private powerUps = new PowerUpManager();

  private score = 0;
  private highScore = 0;
  private state: GameState = 'ready';
  private stateTimer = 0;
  private dyingTimer = 0;
  private onExit: (() => void) | null = null;

  setOnExit(cb: () => void): void {
    this.onExit = cb;
  }

  init(_ctx: CanvasRenderingContext2D): void {
    this.input.init();
    this.loadHighScore();
    this.resetGame();
    this.state = 'ready';
    this.stateTimer = 0;
  }

  private resetGame(): void {
    this.player.reset();
    this.bullets.reset();
    this.aliens.init();
    this.powerUps.reset();
    this.particles.clear();
    this.score = 0;
  }

  update(dt: number): void {
    this.stars.update(dt);
    this.particles.update(dt);
    this.shake.update(dt);

    // Escape to exit
    if (this.input.justPressed('Escape')) {
      this.onExit?.();
      this.input.endFrame();
      return;
    }

    switch (this.state) {
      case 'ready':
        this.stateTimer += dt;
        if (this.input.justPressed('Space') || this.stateTimer > 3) {
          this.state = 'playing';
        }
        break;

      case 'playing':
        this.updatePlaying(dt);
        break;

      case 'dying':
        this.dyingTimer -= dt;
        if (this.dyingTimer <= 0) {
          if (this.player.lives <= 0) {
            this.state = 'gameover';
            this.stateTimer = 0;
            this.saveHighScore();
            this.audio.gameOver();
          } else {
            this.state = 'playing';
          }
        }
        break;

      case 'gameover':
        this.stateTimer += dt;
        if (this.input.justPressed('Space') && this.stateTimer > 1) {
          this.resetGame();
          this.state = 'ready';
          this.stateTimer = 0;
        }
        break;

      case 'victory':
        this.stateTimer += dt;
        if (this.input.justPressed('Space') && this.stateTimer > 1) {
          this.resetGame();
          this.state = 'ready';
          this.stateTimer = 0;
        }
        break;
    }

    this.input.endFrame();
  }

  private updatePlaying(dt: number): void {
    this.player.update(dt, this.input);

    // Shooting
    if (
      (this.input.isDown('Space') || this.input.isDown('ArrowUp')) &&
      this.player.canShoot()
    ) {
      this.player.onShoot();
      this.audio.shoot();
      if (this.player.powerUp === 'spread') {
        this.bullets.spawnPlayerBullet(this.player.x, this.player.y - this.player.height / 2, -80, -480);
        this.bullets.spawnPlayerBullet(this.player.x, this.player.y - this.player.height / 2, 0, -500);
        this.bullets.spawnPlayerBullet(this.player.x, this.player.y - this.player.height / 2, 80, -480);
      } else {
        this.bullets.spawnPlayerBullet(this.player.x, this.player.y - this.player.height / 2);
      }
    }

    this.bullets.update(dt);
    this.aliens.update(dt, this.bullets, this.player.x);
    this.powerUps.update(dt);

    this.checkCollisions();

    // Victory check
    if (this.aliens.aliveCount === 0) {
      this.state = 'victory';
      this.stateTimer = 0;
      this.saveHighScore();
    }
  }

  private checkCollisions(): void {
    const pw = this.player.width;
    const ph = this.player.height;
    const playerRect = {
      x: this.player.x - pw / 2,
      y: this.player.y - ph / 2,
      w: pw,
      h: ph,
    };

    // Player bullets vs aliens
    this.bullets.playerBullets.forEachActive((bullet) => {
      const bulletRect = {
        x: bullet.x - bullet.width / 2,
        y: bullet.y - bullet.height / 2,
        w: bullet.width,
        h: bullet.height,
      };

      for (const alien of this.aliens.aliens) {
        if (!alien.alive) continue;
        const alienRect = {
          x: alien.x - alien.width / 2,
          y: alien.y - alien.height / 2,
          w: alien.width,
          h: alien.height,
        };

        if (rectOverlap(bulletRect, alienRect)) {
          this.bullets.playerBullets.release(bullet);
          alien.alive = false;
          alien.diving = false;
          this.score += this.aliens.getPointsForAlien(alien);
          if (this.score > this.highScore) {
            this.highScore = this.score;
          }
          this.particles.emit(alien.x, alien.y, 15, '#ff8844', 150, 0.4, 4);
          this.particles.emit(alien.x, alien.y, 8, '#ffcc00', 80, 0.3, 2);
          this.audio.explosion();
          this.shake.trigger(3, 0.15);
          this.powerUps.spawn(alien.x, alien.y);
          return;
        }
      }
    });

    // Alien bullets vs player
    this.bullets.alienBullets.forEachActive((bullet) => {
      const bulletRect = {
        x: bullet.x - bullet.width,
        y: bullet.y - bullet.height,
        w: bullet.width * 2,
        h: bullet.height * 2,
      };

      if (rectOverlap(bulletRect, playerRect)) {
        this.bullets.alienBullets.release(bullet);
        this.handlePlayerHit();
      }
    });

    // Diving aliens vs player
    for (const alien of this.aliens.aliens) {
      if (!alien.alive || !alien.diving) continue;
      const alienRect = {
        x: alien.x - alien.width / 2,
        y: alien.y - alien.height / 2,
        w: alien.width,
        h: alien.height,
      };
      if (rectOverlap(alienRect, playerRect)) {
        alien.alive = false;
        this.particles.emit(alien.x, alien.y, 20, '#ff4444', 200, 0.5, 5);
        this.handlePlayerHit();
      }
    }

    // Power-ups vs player
    this.powerUps.pool.forEachActive((p) => {
      const pRect = {
        x: p.x - p.size,
        y: p.y - p.size,
        w: p.size * 2,
        h: p.size * 2,
      };
      if (rectOverlap(pRect, playerRect)) {
        this.powerUps.pool.release(p);
        this.player.applyPowerUp(p.type);
        this.audio.powerup();
        this.particles.emit(p.x, p.y, 10, '#ffffff', 60, 0.3, 2);
      }
    });
  }

  private handlePlayerHit(): void {
    const damaged = this.player.takeDamage();
    if (damaged) {
      this.audio.hit();
      this.shake.trigger(8, 0.3);
      this.particles.emit(this.player.x, this.player.y, 20, '#00ccff', 150, 0.5, 4);
      this.state = 'dying';
      this.dyingTimer = 1.5;
    } else {
      // Shield absorbed
      this.audio.hit();
      this.shake.trigger(3, 0.1);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.shake.offsetX, this.shake.offsetY);

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);
    this.stars.render(ctx);

    // Game objects
    if (this.state !== 'dying') {
      this.player.render(ctx);
    }
    this.aliens.render(ctx);
    this.bullets.render(ctx);
    this.powerUps.render(ctx);
    this.particles.render(ctx);

    // HUD
    this.hud.render(ctx, this.score, this.player.lives, this.highScore);

    // State overlays
    switch (this.state) {
      case 'ready':
        this.renderReady(ctx);
        break;
      case 'gameover':
        this.renderGameOver(ctx);
        break;
      case 'victory':
        this.renderVictory(ctx);
        break;
    }

    // Power-up indicator
    if (this.player.powerUp && this.state === 'playing') {
      this.renderPowerUpIndicator(ctx);
    }

    ctx.restore();
  }

  private renderReady(ctx: CanvasRenderingContext2D): void {
    this.hud.drawCenteredText(ctx, 'GALACTIC ASSAULT', CANVAS_H / 2 - 60, 32, '#00ccff');
    this.hud.drawCenteredText(ctx, 'Arrow Keys / WASD to Move', CANVAS_H / 2, 16, '#8888aa');
    this.hud.drawCenteredText(ctx, 'Space to Shoot', CANVAS_H / 2 + 25, 16, '#8888aa');

    if (Math.floor(this.stateTimer * 2) % 2 === 0) {
      this.hud.drawCenteredText(ctx, 'Press SPACE to Start', CANVAS_H / 2 + 70, 18, '#ffcc00');
    }

    this.hud.drawCenteredText(ctx, 'ESC to Exit', CANVAS_H - 40, 12, '#555577');
  }

  private renderGameOver(ctx: CanvasRenderingContext2D): void {
    // Dim overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this.hud.drawCenteredText(ctx, 'GAME OVER', CANVAS_H / 2 - 40, 36, '#ff4444');
    this.hud.drawCenteredText(
      ctx,
      `Score: ${this.score}`,
      CANVAS_H / 2 + 10,
      20,
      '#ffffff'
    );

    if (this.stateTimer > 1 && Math.floor(this.stateTimer * 2) % 2 === 0) {
      this.hud.drawCenteredText(ctx, 'Press SPACE to Retry', CANVAS_H / 2 + 60, 16, '#ffcc00');
    }
  }

  private renderVictory(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this.hud.drawCenteredText(ctx, 'VICTORY!', CANVAS_H / 2 - 40, 36, '#00ff88');
    this.hud.drawCenteredText(
      ctx,
      `Score: ${this.score}`,
      CANVAS_H / 2 + 10,
      20,
      '#ffffff'
    );

    if (this.stateTimer > 1 && Math.floor(this.stateTimer * 2) % 2 === 0) {
      this.hud.drawCenteredText(ctx, 'Press SPACE to Play Again', CANVAS_H / 2 + 60, 16, '#ffcc00');
    }
  }

  private renderPowerUpIndicator(ctx: CanvasRenderingContext2D): void {
    const labels: Record<string, string> = {
      rapid: 'RAPID FIRE',
      shield: 'SHIELD',
      spread: 'SPREAD SHOT',
    };
    const colors: Record<string, string> = {
      rapid: '#ffcc00',
      shield: '#00ff88',
      spread: '#ff66ff',
    };
    const label = labels[this.player.powerUp!];
    const color = colors[this.player.powerUp!];

    ctx.save();
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const timeLeft = Math.ceil(this.player.powerUpTimer);
    const text =
      this.player.powerUp === 'shield'
        ? `${label} [${this.player.shieldHits}]`
        : `${label} ${timeLeft}s`;
    ctx.fillText(text, CANVAS_W / 2, 34);
    ctx.restore();
  }

  cleanup(): void {
    this.input.cleanup();
    this.audio.cleanup();
    this.particles.clear();
  }

  private loadHighScore(): void {
    const saved = localStorage.getItem('galactica_ga_highscore');
    this.highScore = saved ? parseInt(saved, 10) : 0;
  }

  private saveHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
    localStorage.setItem('galactica_ga_highscore', this.highScore.toString());
  }
}
