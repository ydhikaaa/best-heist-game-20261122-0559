// Midnight Harbor — procedural WebAudio: ambience, footsteps and effects.
// One file, one job: every sound is synthesized here, no audio files exist.
export class HarborAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambientOn = false;
    this.alarmOsc = null;
    this.alarmGain = null;
  }

  // Called from the first user gesture; browsers forbid audio before one.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (err) {
      this.ctx = null;
    }
  }

  startAmbient() {
    this.ensure();
    if (!this.ctx || this.ambientOn) return;
    this.ambientOn = true;
    const ctx = this.ctx;
    // Low harbor drone: two detuned sines + a slow filtered-noise swell.
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.05;
    droneGain.connect(this.master);
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 55;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 55.7;
    o1.connect(droneGain);
    o2.connect(droneGain);
    o1.start();
    o2.start();
    // Distant water: looped noise through a low-pass filter, gain breathing.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 320;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.03;
    noise.connect(filt);
    filt.connect(nGain);
    nGain.connect(this.master);
    noise.start();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(nGain.gain);
    lfo.start();
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx) return;
    try {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch (err) {
      /* audio is cosmetic; never break the game */
    }
  }

  noiseBurst(dur, vol, filterFreq) {
    if (!this.ctx) return;
    try {
      const ctx = this.ctx;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = filterFreq || 1200;
      const g = ctx.createGain();
      g.gain.value = vol || 0.2;
      src.connect(filt);
      filt.connect(g);
      g.connect(this.master);
      src.start();
    } catch (err) {
      /* cosmetic */
    }
  }

  footstep(sprinting) {
    this.noiseBurst(0.07, sprinting ? 0.12 : 0.05, 300);
  }

  coin() {
    this.tone(1900, 0.09, 'triangle', 0.16, 2400);
    setTimeout(() => this.tone(1500, 0.12, 'triangle', 0.12, 1100), 70);
  }

  coinLand() {
    this.tone(900, 0.05, 'square', 0.08, 600);
  }

  pickup() {
    this.tone(660, 0.1, 'sine', 0.18, 990);
    setTimeout(() => this.tone(990, 0.14, 'sine', 0.16, 1320), 80);
  }

  jadePickup() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'sine', 0.18), i * 90));
  }

  smoke() {
    this.noiseBurst(0.5, 0.16, 900);
  }

  emp() {
    this.tone(1400, 0.35, 'sawtooth', 0.12, 120);
    this.noiseBurst(0.3, 0.1, 3000);
  }

  spotted() {
    this.tone(220, 0.16, 'square', 0.14, 330);
  }

  // The getaway surge: three rising siren blasts as the harbor wakes up.
  alarmSurge() {
    [660, 880, 1108].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'sawtooth', 0.16, f * 1.4), i * 160));
    this.setAlarmLevel(60);
  }

  caught() {
    [440, 415, 392, 370].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'sawtooth', 0.16), i * 130));
  }

  levelClear() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.16), i * 110));
  }

  victory() {
    [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.16), i * 140));
  }

  // Alarm siren that follows the alarm meter; call every frame with 0..100.
  setAlarmLevel(level) {
    if (!this.ctx) return;
    if (level < 25) {
      if (this.alarmOsc) {
        try { this.alarmOsc.stop(); } catch (err) {}
        this.alarmOsc = null;
      }
      return;
    }
    try {
      if (!this.alarmOsc) {
        const ctx = this.ctx;
        this.alarmOsc = ctx.createOscillator();
        this.alarmOsc.type = 'sine';
        this.alarmOsc.frequency.value = 620;
        this.alarmGain = ctx.createGain();
        this.alarmGain.gain.value = 0;
        this.alarmOsc.connect(this.alarmGain);
        this.alarmGain.connect(this.master);
        this.alarmOsc.start();
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 1.6;
        const lg = ctx.createGain();
        lg.gain.value = 140;
        lfo.connect(lg);
        lg.connect(this.alarmOsc.frequency);
        lfo.start();
      }
      this.alarmGain.gain.setTargetAtTime(0.02 + (level / 100) * 0.05, this.ctx.currentTime, 0.1);
    } catch (err) {
      /* cosmetic */
    }
  }
}
