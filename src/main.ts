import { GameLoop } from './engine/GameLoop';
import { GalacticAssault } from './games/galactic-assault/index';
import type { Game } from './engine/types';

const launcher = document.getElementById('launcher')!;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let currentGame: Game | null = null;
let gameLoop: GameLoop | null = null;

function startGame(game: Game): void {
  launcher.style.display = 'none';
  canvas.style.display = 'block';
  canvas.focus();

  currentGame = game;
  game.init(ctx);

  gameLoop = new GameLoop(
    (dt) => game.update(dt),
    () => game.render(ctx)
  );
  gameLoop.start();
}

function exitToLauncher(): void {
  if (gameLoop) {
    gameLoop.stop();
    gameLoop = null;
  }
  if (currentGame) {
    currentGame.cleanup();
    currentGame = null;
  }
  canvas.style.display = 'none';
  launcher.style.display = 'block';
}

// Game card click handlers
document.getElementById('card-galactic-assault')?.addEventListener('click', () => {
  const game = new GalacticAssault();
  game.setOnExit(exitToLauncher);
  startGame(game);
});
