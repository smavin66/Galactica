const FIXED_DT = 1 / 60;
const MAX_FRAME_TIME = 0.25;

export class GameLoop {
  private accumulator = 0;
  private rafId = 0;
  private lastTime = 0;
  private running = false;

  constructor(
    private updateFn: (dt: number) => void,
    private renderFn: () => void
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now() / 1000;
    this.accumulator = 0;
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private tick = (): void => {
    if (!this.running) return;

    const now = performance.now() / 1000;
    let frameTime = now - this.lastTime;
    this.lastTime = now;

    if (frameTime > MAX_FRAME_TIME) {
      frameTime = MAX_FRAME_TIME;
    }

    this.accumulator += frameTime;

    while (this.accumulator >= FIXED_DT) {
      this.updateFn(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    this.renderFn();
    this.rafId = requestAnimationFrame(this.tick);
  };
}
