/**
 * Procedural ambient bed (Web Audio) — no asset download.
 * Low drone + soft noise; gain swells with fold progress.
 * Must be started from a user gesture (browser autoplay policy).
 */

export interface AmbientBed {
  start: () => Promise<void>;
  stop: () => void;
  setProgress: (progress: number) => void;
  setMuted: (muted: boolean) => void;
  readonly started: boolean;
}

export function createAmbientBed(): AmbientBed {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let drone: OscillatorNode | null = null;
  let drone2: OscillatorNode | null = null;
  let noise: AudioBufferSourceNode | null = null;
  let filter: BiquadFilterNode | null = null;
  let started = false;
  let muted = false;
  let progress = 0;

  const applyGain = () => {
    if (!master) return;
    if (muted) {
      master.gain.setTargetAtTime(0, ctx!.currentTime, 0.08);
      return;
    }
    // Base bed + swell through fold (0.35–0.8)
    const swell = Math.min(1, Math.max(0, (progress - 0.3) / 0.5));
    const target = 0.03 + swell * 0.07;
    master.gain.setTargetAtTime(target, ctx!.currentTime, 0.2);
  };

  return {
    get started() {
      return started;
    },
    async start() {
      if (started) return;
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      // Warm low drones
      drone = ctx.createOscillator();
      drone.type = "sine";
      drone.frequency.value = 55;
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.35;
      drone.connect(droneGain);
      droneGain.connect(master);

      drone2 = ctx.createOscillator();
      drone2.type = "triangle";
      drone2.frequency.value = 82.5;
      const drone2Gain = ctx.createGain();
      drone2Gain.gain.value = 0.12;
      drone2.connect(drone2Gain);
      drone2Gain.connect(master);

      // Soft noise bed
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.4;
      }
      noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 400;
      filter.Q.value = 0.7;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.15;
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(master);

      drone.start();
      drone2.start();
      noise.start();
      started = true;
      if (ctx.state === "suspended") await ctx.resume();
      applyGain();
    },
    stop() {
      try {
        drone?.stop();
        drone2?.stop();
        noise?.stop();
        void ctx?.close();
      } catch {
        // already stopped
      }
      ctx = null;
      master = null;
      drone = null;
      drone2 = null;
      noise = null;
      filter = null;
      started = false;
    },
    setProgress(p: number) {
      progress = p;
      if (filter && ctx) {
        const swell = Math.min(1, Math.max(0, (p - 0.3) / 0.5));
        filter.frequency.setTargetAtTime(380 + swell * 520, ctx.currentTime, 0.3);
      }
      applyGain();
    },
    setMuted(m: boolean) {
      muted = m;
      applyGain();
    },
  };
}
