// Tiny WebAudio noisemaker for Congères — no audio files to download, so the
// game stays instant to load and works offline in the PWA.

import type { SoundEvent } from "./forest-game";

type Voice = {
  type: OscillatorType;
  freq: number;
  to: number;
  dur: number;
  gain: number;
  noise?: boolean;
};

const VOICES: Record<SoundEvent, Voice> = {
  chop: { type: "square", freq: 180, to: 90, dur: 0.09, gain: 0.16, noise: true },
  fell: { type: "sawtooth", freq: 150, to: 50, dur: 0.4, gain: 0.2, noise: true },
  hit: { type: "square", freq: 260, to: 120, dur: 0.1, gain: 0.16 },
  kill: { type: "sawtooth", freq: 320, to: 60, dur: 0.28, gain: 0.18 },
  hurt: { type: "sawtooth", freq: 220, to: 70, dur: 0.3, gain: 0.24 },
  build: { type: "triangle", freq: 420, to: 620, dur: 0.09, gain: 0.13 },
  cook: { type: "sine", freq: 520, to: 780, dur: 0.16, gain: 0.14 },
  coin: { type: "sine", freq: 880, to: 1320, dur: 0.14, gain: 0.16 },
  join: { type: "triangle", freq: 520, to: 1040, dur: 0.3, gain: 0.18 },
  arrow: { type: "triangle", freq: 900, to: 420, dur: 0.08, gain: 0.08 },
  wave: { type: "sawtooth", freq: 110, to: 220, dur: 0.7, gain: 0.2 },
  buy: { type: "square", freq: 660, to: 990, dur: 0.16, gain: 0.15 },
  over: { type: "sawtooth", freq: 300, to: 40, dur: 1.1, gain: 0.26 },
};

const VIBRATE: Partial<Record<SoundEvent, number | number[]>> = {
  hurt: 55,
  kill: 18,
  fell: [12, 30, 18],
  over: [90, 60, 140],
  wave: [30, 40, 30],
};

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  /** Rate-limits identical sounds so a horde doesn't turn into a buzzsaw. */
  private last: Partial<Record<SoundEvent, number>> = {};
  muted = false;

  /** Must be called from a user gesture — browsers won't start audio otherwise. */
  resume() {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.3);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  play(e: SoundEvent) {
    if (this.muted || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    if (this.last[e] !== undefined && now - (this.last[e] as number) < 0.045) return;
    this.last[e] = now;
    const v = VOICES[e];
    if (!v) return;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(v.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + v.dur);
    gain.connect(this.master);

    const osc = this.ctx.createOscillator();
    osc.type = v.type;
    osc.frequency.setValueAtTime(v.freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, v.to), now + v.dur);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + v.dur + 0.02);

    if (v.noise && this.noiseBuf) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(v.gain * 0.7, now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + v.dur);
      src.connect(ng);
      ng.connect(this.master);
      src.start(now);
      src.stop(now + v.dur + 0.02);
    }
  }

  buzz(e: SoundEvent) {
    if (this.muted) return;
    const pattern = VIBRATE[e];
    if (!pattern) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* vibration unsupported — no big deal */
    }
  }

  handle(e: SoundEvent) {
    this.play(e);
    this.buzz(e);
  }
}
