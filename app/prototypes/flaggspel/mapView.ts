/** Pure camera math for the world map (brief §6). No React, no DOM. */
import type { Box, Country, MapPoint, View } from "./types";

export type Screen = { w: number; h: number };

/** Whole map. Narrow screens (< 700 px) show at least 420 units, centered near home. */
export function worldView(scr: Screen, home: MapPoint, mapW = 1000, mapH = 520): View {
  const a = scr.w / scr.h;
  let w = a > mapW / mapH ? mapW : mapH * a;
  if (scr.w < 700) w = Math.max(w, 420);
  return { x: home.x - w / 2 + (scr.w < 700 ? 40 : 0), y: 250 - w / a / 2, w };
}

/**
 * A view that shows box `b` (enlarged 1.5×) in the free middle band of the
 * screen: 60 % of the height, centered at 46 %.
 */
export function fitBox(scr: Screen, b: Box, minW = 50): View {
  const a = scr.w / scr.h;
  let bw = Math.max(b[2] - b[0], minW);
  let bh = Math.max(b[3] - b[1], minW * 0.55);
  bw *= 1.5;
  bh *= 1.5;
  const band = 0.6;
  const w = Math.max(bw, (bh / band) * a);
  const h = w / a;
  const cx = (b[0] + b[2]) / 2;
  const cy = (b[1] + b[3]) / 2;
  return { x: cx - w / 2, y: cy - h * 0.46, w };
}

export function boxOf(points: { x: number; y: number }[]): Box {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of points) {
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  return [x0, y0, x1, y1];
}

/** The country's largest part (if the point lies in it), else a small box around the point. */
export function countryBox(f: Country, shapeBox: Box | null): Box {
  const p = f.pt;
  if (shapeBox) {
    const b = shapeBox;
    if (p.x >= b[0] - 12 && p.x <= b[2] + 12 && p.y >= b[1] - 12 && p.y <= b[3] + 12) {
      return [Math.min(b[0], p.x), Math.min(b[1], p.y), Math.max(b[2], p.x), Math.max(b[3], p.y)];
    }
  }
  return [p.x - 8, p.y - 5, p.x + 8, p.y + 5];
}

/** The continent around a country, trimmed of outliers. Russia has its own box. */
export function contBox(f: Country, all: Country[]): Box {
  if (f.c === "ru") return [560, 20, 900, 130];
  const pts = all.filter((x) => x.k === f.k && x.c !== "ru").map((x) => x.pt);
  const xs = pts.map((p) => p.x).sort((a, b) => a - b);
  const ys = pts.map((p) => p.y).sort((a, b) => a - b);
  const q = (arr: number[], t: number) => arr[Math.floor(t * (arr.length - 1))];
  return [q(xs, 0.06), q(ys, 0.06), q(xs, 0.94), q(ys, 0.94)];
}

/** Whole trip with some air, framed in the upper part (done screen). */
export function tripView(scr: Screen, all: Box): View {
  const a = scr.w / scr.h;
  const bw = Math.max(all[2] - all[0], 120) * 1.4;
  const bh = Math.max(all[3] - all[1], 80) * 1.4;
  const w = Math.max(bw, (bh / 0.45) * a);
  return { x: (all[0] + all[2]) / 2 - w / 2, y: (all[1] + all[3]) / 2 - (w / a) * 0.3, w };
}

/** Control point for the flight arc: always bends "up" on the map. */
export function arc(p0: { x: number; y: number }, p1: { x: number; y: number }) {
  const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const L = Math.hypot(dx, dy) || 1;
  let nx = -dy / L, ny = dx / L;
  if (ny > 0) { nx = -nx; ny = -ny; }
  const k = Math.min(L * 0.28, 90);
  return { x: mx + nx * k, y: my + ny * k };
}

type P = { x: number; y: number };

/** Point on the quadratic Bézier p0 → c → p1 at t. */
export function bezier(p0: P, c: P, p1: P, t: number): P {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
}

/** SVG path for the part of the arc from 0 to t (de Casteljau split). */
export function arcPath(p0: P, c: P, p1: P, t: number): string {
  const q0 = { x: p0.x + (c.x - p0.x) * t, y: p0.y + (c.y - p0.y) * t };
  const b = bezier(p0, c, p1, t);
  return `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)}Q${q0.x.toFixed(1)} ${q0.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Interpolate between two views: width logarithmically, center linearly.
 * `k` is screen height / width.
 */
export function lerpView(from: View, to: View, e: number, k: number): View {
  const fcx = from.x + from.w / 2, fcy = from.y + (from.w * k) / 2;
  const tcx = to.x + to.w / 2, tcy = to.y + (to.w * k) / 2;
  const w = from.w * Math.pow(to.w / from.w, e);
  const cx = fcx + (tcx - fcx) * e, cy = fcy + (tcy - fcy) * e;
  return { x: cx - w / 2, y: cy - (w * k) / 2, w };
}
