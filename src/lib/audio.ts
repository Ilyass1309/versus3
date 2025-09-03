type SfxName = "attack" | "defend" | "charge" | "win" | "lose";

interface AudioCtorWindow {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private volume = 0.6;

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
  }

  private ensureCtx() {
    if (!this.ctx) {
      const w = window as unknown as AudioCtorWindow;
      const Ctor = w.AudioContext || w.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
    }
  }

  play(name: SfxName) {
    try {
      this.ensureCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      let freq = 440;
      switch (name) {
        case "attack": freq = 320; break;
        case "defend": freq = 180; break;
        case "charge": freq = 520; break;
        case "win": freq = 640; break;
        case "lose": freq = 140; break;
      }
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(this.volume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc.type = name === "defend" ? "triangle" : name === "charge" ? "sawtooth" : "square";
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch {
      /* ignore */
    }
  }
}

export const audio = new AudioManager();