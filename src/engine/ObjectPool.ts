export class ObjectPool<T> {
  private items: T[];
  private activeFlags: boolean[];
  private _activeCount = 0;

  constructor(size: number, factory: () => T) {
    this.items = Array.from({ length: size }, factory);
    this.activeFlags = new Array(size).fill(false);
  }

  acquire(): T | null {
    for (let i = 0; i < this.items.length; i++) {
      if (!this.activeFlags[i]) {
        this.activeFlags[i] = true;
        this._activeCount++;
        return this.items[i];
      }
    }
    return null;
  }

  release(item: T): void {
    const idx = this.items.indexOf(item);
    if (idx >= 0 && this.activeFlags[idx]) {
      this.activeFlags[idx] = false;
      this._activeCount--;
    }
  }

  forEachActive(fn: (item: T, index: number) => void): void {
    for (let i = 0; i < this.items.length; i++) {
      if (this.activeFlags[i]) {
        fn(this.items[i], i);
      }
    }
  }

  releaseIf(predicate: (item: T) => boolean): void {
    for (let i = 0; i < this.items.length; i++) {
      if (this.activeFlags[i] && predicate(this.items[i])) {
        this.activeFlags[i] = false;
        this._activeCount--;
      }
    }
  }

  releaseAll(): void {
    this.activeFlags.fill(false);
    this._activeCount = 0;
  }

  get activeCount(): number {
    return this._activeCount;
  }
}
