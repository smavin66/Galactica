export class InputManager {
  private keysDown = new Set<string>();
  private keysJustPressed = new Set<string>();
  private keysJustReleased = new Set<string>();

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.keysDown.has(e.code)) {
      this.keysJustPressed.add(e.code);
    }
    this.keysDown.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
    this.keysJustReleased.add(e.code);
  };

  init(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  cleanup(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  isDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  justPressed(code: string): boolean {
    return this.keysJustPressed.has(code);
  }

  endFrame(): void {
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
  }
}
