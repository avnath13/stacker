// Tiny Web Audio synth: no asset files, just oscillator blips. Lazily created
// on first user gesture so browsers allow playback.

let ctx: AudioContext | null = null;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

// Call from the first input handler to unlock audio on mobile/Safari.
export function unlockAudio(): void {
  const c = ensure();
  if (c && c.state === "suspended") void c.resume();
}

function blip(freq: number, duration: number, type: OscillatorType, gain = 0.2): void {
  const c = ensure();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration + 0.02);
}

// A solid placement: short low thunk.
export function playPlace(): void {
  blip(220, 0.12, "triangle", 0.18);
}

// Perfect drop: rising chime; pitch climbs with the combo for a satisfying run.
export function playPerfect(combo: number): void {
  const base = 440;
  const semis = Math.min(combo, 12);
  const freq = base * Math.pow(2, semis / 12);
  blip(freq, 0.18, "sine", 0.22);
  blip(freq * 1.5, 0.14, "sine", 0.12);
}

// Game over: descending sad tone.
export function playGameOver(): void {
  blip(300, 0.18, "sawtooth", 0.16);
  setTimeout(() => blip(200, 0.28, "sawtooth", 0.16), 90);
}
