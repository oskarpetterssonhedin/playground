"use client";

import { useEffect, useRef } from "react";

import { COLOR_TOKENS } from "@/components/controls";
import { rgba, useThemeColors } from "@/lib/theme-colors";

import { STILL_FRAMES } from "./data";
import { resize, spawn, step } from "./field";
import type { FieldSettings, Particle } from "./types";

const TOKENS = COLOR_TOKENS;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Full-bleed canvas. Reads colors from theme tokens; re-inits on theme or size change. */
export function ParticleCanvas({ settings }: { settings: FieldSettings }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colors = useThemeColors(TOKENS);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!container || !canvas || !ctx || !colors) return;

    let w = 0;
    let h = 0;
    let t = 0;
    let frame = 0;
    let particles: Particle[] = [];

    // Fade old trails by erasing alpha (the container's bg-background shows
    // through). Painting the background color instead leaves gray ghosts,
    // because 8-bit blending never quite reaches the target color.
    const fade = (amount: number) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0, 0, 0, ${amount})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    };

    const tick = () => {
      const s = settingsRef.current;
      resize(particles, s.count, w, h);
      fade(1 - s.trail);
      step(particles, { pattern: s.pattern, w, h, scale: s.scale, speed: s.speed, t });
      ctx.strokeStyle = rgba(colors[s.color]);
      ctx.lineWidth = s.size;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (const p of particles) {
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      t += 0.004 * s.speed;
    };

    const loop = () => {
      if (settingsRef.current.animate && !prefersReducedMotion()) tick();
      frame = requestAnimationFrame(loop);
    };

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = container.clientWidth;
      h = container.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: settingsRef.current.count }, () => spawn(w, h));
      ctx.clearRect(0, 0, w, h);
      // Pre-simulate so a still frame (paused or reduced motion) isn't empty.
      for (let i = 0; i < STILL_FRAMES; i++) tick();
    };

    setup();
    frame = requestAnimationFrame(loop);
    const observer = new ResizeObserver(setup);
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [colors]);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-background">
      <canvas ref={canvasRef} className="block size-full" aria-label="Animated particle flow field" role="img" />
    </div>
  );
}
