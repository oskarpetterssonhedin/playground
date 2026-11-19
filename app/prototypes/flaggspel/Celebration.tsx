"use client";

import { useEffect, useState } from "react";

import { flagUrl } from "./data";

const cache = new Map<string, string[]>();

/** Up to four fill colors from the flag SVG (they are the flag's own data). */
async function flagColors(code: string): Promise<string[]> {
  const hit = cache.get(code);
  if (hit) return hit;
  try {
    const svg = await (await fetch(flagUrl(code))).text();
    const found = [...svg.matchAll(/fill="(#[0-9a-fA-F]{3,6})"/g)].map((m) => m[1].toLowerCase());
    const colors = [...new Set(found)].slice(0, 4);
    cache.set(code, colors);
    return colors;
  } catch {
    return [];
  }
}

const COUNT = 14;

/**
 * A ring pulsing out from the country plus a few particles in the flag's
 * colors. Positioned at `at` (px in the game area). No full-screen confetti.
 */
export function Celebration({ code, at }: { code: string; at: [number, number] }) {
  const [colors, setColors] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    flagColors(code).then((c) => alive && setColors(c));
    return () => {
      alive = false;
    };
  }, [code]);

  return (
    <div className="pointer-events-none absolute top-0 left-0" style={{ transform: `translate(${at[0]}px, ${at[1]}px)` }}>
      <div className="fs-ring absolute top-0 left-0 size-40 rounded-full border-2 border-(--map-visited)" />
      {colors.length > 0 &&
        Array.from({ length: COUNT }, (_, i) => {
          const angle = (i / COUNT) * Math.PI * 2 + (i % 2) * 0.2;
          const dist = 46 + (i % 3) * 18;
          return (
            <span
              key={i}
              className="fs-particle absolute top-0 left-0 size-2 rounded-full ring-1 ring-background/60"
              style={
                {
                  backgroundColor: colors[i % colors.length],
                  "--dx": `${Math.cos(angle) * dist}px`,
                  "--dy": `${Math.sin(angle) * dist}px`,
                  animationDelay: `${(i % 4) * 30}ms`,
                } as React.CSSProperties
              }
            />
          );
        })}
    </div>
  );
}
