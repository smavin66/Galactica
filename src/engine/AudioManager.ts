export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume = 0.3,
    freqEnd?: number
  ): void {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        freqEnd,
        ctx.currentTime + duration
      );
    }
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  shoot(): void {
    this.playTone(880, 0.1, 'square', 0.15, 440);
  }

  enemyShoot(): void {
    this.playTone(220, 0.15, 'sawtooth', 0.1, 110);
  }

  explosion(): void {
    const ctx = this.ensureContext();
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    source.start();
  }

  powerup(): void {
    this.playTone(523, 0.08, 'sine', 0.2);
    setTimeout(() => this.playTone(659, 0.08, 'sine', 0.2), 80);
    setTimeout(() => this.playTone(784, 0.15, 'sine', 0.2), 160);
  }

  hit(): void {
    this.playTone(200, 0.15, 'square', 0.2, 80);
  }

  gameOver(): void {
    this.playTone(440, 0.3, 'sine', 0.2, 220);
    setTimeout(() => this.playTone(330, 0.3, 'sine', 0.2, 165), 300);
    setTimeout(() => this.playTone(220, 0.5, 'sine', 0.2, 110), 600);
  }

  cleanup(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }
}
