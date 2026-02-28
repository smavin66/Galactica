export class ScreenShake {
  private intensity = 0;
  private duration = 0;
  private elapsed = 0;
  offsetX = 0;
  offsetY = 0;

  trigger(intensity: number, duration: number): void {
    this.intensity = intensity;
    this.duration = duration;
    this.elapsed = 0;
  }

  update(dt: number): void {
    if (this.elapsed >= this.duration) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }
    this.elapsed += dt;
    const remaining = 1 - this.elapsed / this.duration;
    const mag = this.intensity * remaining;
    this.offsetX = (Math.random() - 0.5) * 2 * mag;
    this.offsetY = (Math.random() - 0.5) * 2 * mag;
  }
}
