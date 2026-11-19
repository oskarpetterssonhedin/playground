"use client";

import { useEffect, useState } from "react";

/**
 * Canvas/WebGL can't use Tailwind classes, so read theme tokens from CSS
 * variables at runtime. Tokens are oklch() strings; they are normalized to RGBA
 * by painting one pixel, which works in every browser that renders the theme.
 */
export type RGBA = { r: number; g: number; b: number; a: number };

let probe: CanvasRenderingContext2D | null = null;

function toRgba(cssColor: string): RGBA {
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe) return { r: 0, g: 0, b: 0, a: 1 };
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#000";
  probe.fillStyle = cssColor;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}

/** Read one token (e.g. "primary", "chart-1", "background") as RGBA. */
export function readThemeColor(token: string): RGBA {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
  return toRgba(value || "transparent");
}

/** `rgba(...)` string, optionally overriding alpha. */
export function rgba({ r, g, b, a }: RGBA, alpha = a): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Resolved RGBA values for the given tokens, updated whenever the theme
 * changes (watches the `class`/`style` attributes on <html>). Returns null
 * until mounted.
 */
export function useThemeColors<const T extends string>(tokens: readonly T[]): Record<T, RGBA> | null {
  const key = tokens.join("|");
  const [colors, setColors] = useState<Record<T, RGBA> | null>(null);

  useEffect(() => {
    const list = key.split("|") as T[];
    const read = () =>
      setColors(Object.fromEntries(list.map((t) => [t, readThemeColor(t)])) as Record<T, RGBA>);
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => observer.disconnect();
  }, [key]);

  return colors;
}
