import { CANVAS_W } from './types';

export class HUD {
  render(
    ctx: CanvasRenderingContext2D,
    score: number,
    lives: number,
    highScore: number
  ): void {
    ctx.save();
    ctx.font = '16px "Courier New", monospace';
    ctx.textBaseline = 'top';

    // Score (left)
    ctx.fillStyle = '#00ccff';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${score.toString().padStart(6, '0')}`, 16, 12);

    // High score (center)
    ctx.fillStyle = '#ffcc00';
    ctx.textAlign = 'center';
    ctx.fillText(`HI ${highScore.toString().padStart(6, '0')}`, CANVAS_W / 2, 12);

    // Lives (right)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00ff88';
    const livesText = '\u25C6'.repeat(Math.max(0, lives));
    ctx.fillText(`LIVES ${livesText}`, CANVAS_W - 16, 12);

    ctx.restore();
  }

  drawCenteredText(
    ctx: CanvasRenderingContext2D,
    text: string,
    y: number,
    size: number,
    color: string
  ): void {
    ctx.save();
    ctx.font = `${size}px "Courier New", monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, CANVAS_W / 2, y);
    ctx.restore();
  }
}
