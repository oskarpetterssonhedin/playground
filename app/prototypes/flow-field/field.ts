/** Pure simulation: no DOM, no React. */
import type { Particle, Pattern } from "./types";

const TAU = Math.PI * 2;

/** Flow direction (radians) at a point. `scale` is cycles across the shorter side. */
export function fieldAngle(pattern: Pattern, x: number, y: number, w: number, h: number, scale: number, t: number) {
  const unit = Math.min(w, h) / scale;
  const nx = x / unit;
  const ny = y / unit;
  switch (pattern) {
    case "flow":
      return (Math.sin(nx * 1.7 + t) + Math.cos(ny * 1.3 - t * 0.7) + Math.sin((nx + ny) * 0.6)) * Math.PI * 0.6;
    case "swirl": {
      const dx = x - w / 2;
      const dy = y - h / 2;
      const r = Math.hypot(dx, dy) / unit;
      return Math.atan2(dy, dx) + Math.PI / 2 + Math.sin(r * 2 - t) * 0.6;
    }
    case "grid":
      return Math.round(((Math.sin(nx * 2 + t * 0.5) + Math.cos(ny * 2)) * 2) % 4) * (TAU / 4);
  }
}

export function spawn(w: number, h: number): Particle {
  const x = Math.random() * w;
  const y = Math.random() * h;
  return { x, y, px: x, py: y, life: 60 + Math.random() * 240 };
}

/** Grow or shrink the particle array in place to `count`. */
export function resize(particles: Particle[], count: number, w: number, h: number) {
  while (particles.length < count) particles.push(spawn(w, h));
  particles.length = count;
}

export function step(
  particles: Particle[],
  opts: { pattern: Pattern; w: number; h: number; scale: number; speed: number; t: number },
) {
  const { pattern, w, h, scale, speed, t } = opts;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const a = fieldAngle(pattern, p.x, p.y, w, h, scale, t);
    p.px = p.x;
    p.py = p.y;
    p.x += Math.cos(a) * speed;
    p.y += Math.sin(a) * speed;
    p.life -= 1;
    if (p.life <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) particles[i] = spawn(w, h);
  }
}
