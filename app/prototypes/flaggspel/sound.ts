/**
 * Synthesized effects (Web Audio, no files). Softer than the reference:
 * sine/triangle only, lower gain. Call `initAudio()` from a user gesture.
 */
let ac: AudioContext | null = null;

export function initAudio() {
  if (ac) {
    if (ac.state === "suspended") ac.resume().catch(() => {});
    return;
  }
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) ac = new Ctor();
  } catch {
    ac = null;
  }
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = "sine", vol = 0.08) {
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(ac.destination);
  o.start(at);
  o.stop(at + dur + 0.05);
}

/** Right answer: short rising chord. */
export function playCorrect() {
  if (!ac) return;
  const t = ac.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.08, 0.4, "triangle", 0.07));
  [523.25, 783.99].forEach((f) => tone(f, t + 0.36, 0.6, "sine", 0.04));
}

/** Flight: filtered noise sweep. */
export function playWhoosh() {
  if (!ac) return;
  const t = ac.currentTime;
  const n = Math.floor(ac.sampleRate * 0.9);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(1600, t + 0.45);
  f.frequency.exponentialRampToValueAtTime(400, t + 0.9);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.045, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  src.connect(f).connect(g).connect(ac.destination);
  src.start(t);
  src.stop(t + 0.95);
}

/** Landing: soft thud. */
export function playLand() {
  if (!ac) return;
  const t = ac.currentTime;
  tone(140, t, 0.2, "sine", 0.14);
  tone(70, t, 0.28, "sine", 0.1);
}

/** Wrong: two low tones. */
export function playWrong() {
  if (!ac) return;
  const t = ac.currentTime;
  tone(330, t, 0.22, "sine", 0.07);
  tone(262, t + 0.16, 0.3, "sine", 0.07);
}

/** Mic button: short beep. */
export function playBlip() {
  if (!ac) return;
  tone(880, ac.currentTime, 0.12, "sine", 0.06);
}
