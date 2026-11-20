"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { flagUrl, ROUND } from "./data";
import type { Country } from "./types";

export type CardMode = "in" | "shake" | "win" | "gone";

type Props = {
  country: Country;
  /** Changes on every new flag and every wrong answer, to replay the animation. */
  animKey: string;
  mode: CardMode;
  index: number;
  compact: boolean;
  onTap: () => void;
  imgRef: React.Ref<HTMLImageElement>;
};

/** The flag in its true proportions, a thin ring, soft shadow, "Flagga 3 av 10". */
export function FlagCard({ country, animKey, mode, index, compact, onTap, imgRef }: Props) {
  // Width is capped both directly and by a max height (tall flags like Nepal).
  const maxW = compact ? "min(56vw, 260px)" : "min(76vw, 380px)";
  const maxH = compact ? "18dvh" : "30dvh";
  return (
    <div
      key={animKey}
      className={cn(
        "flex flex-col items-center gap-2 transition-opacity duration-300",
        // No entry animation once gone: its fill-mode would override opacity-0.
        mode === "shake" && "fs-shake",
        (mode === "in" || mode === "win") && "fs-card-in",
        mode === "gone" && "pointer-events-none opacity-0",
      )}
    >
      <button
        type="button"
        onClick={onTap}
        aria-label="Flaggan. Tryck för att höra frågan igen."
        className="relative rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static flag SVG, sized by its ratio */}
        <img
          ref={imgRef}
          src={flagUrl(country.c)}
          alt=""
          draggable={false}
          className="block rounded-2xl object-cover shadow-xl ring-1 ring-border"
          style={{ aspectRatio: country.ar, width: `min(${maxW}, calc(${maxH} * ${country.ar}))` }}
        />
        {mode === "win" && (
          <span className="fs-pop absolute -top-3 -right-3 flex size-12 items-center justify-center rounded-full bg-(--success) text-(--success-foreground) shadow-lg ring-4 ring-background">
            <Check className="size-7" strokeWidth={3} />
          </span>
        )}
      </button>
      <span className="text-xs text-muted-foreground tabular-nums">
        Flagga {index} av {ROUND}
      </span>
    </div>
  );
}

/**
 * Shrink a copy of the flag from its card into the country's point.
 * `to` is in viewport px. Resolves when done (immediately with reduced motion).
 */
export function flyFlag(img: HTMLImageElement | null, src: string, to: [number, number], reduced: boolean) {
  return new Promise<void>((resolve) => {
    if (!img || reduced || !document.body.animate) return resolve();
    const a = img.getBoundingClientRect();
    const el = document.createElement("img");
    el.src = src;
    el.alt = "";
    el.className = "pointer-events-none fixed top-0 left-0 z-50 rounded-xl object-cover shadow-xl";
    el.style.width = `${a.width}px`;
    el.style.height = `${a.height}px`;
    document.body.appendChild(el);
    const ex = to[0] - a.width / 2;
    const ey = to[1] - a.height / 2;
    const sc = Math.max(0.06, 28 / a.width);
    const anim = el.animate(
      [
        { transform: `translate(${a.left}px,${a.top}px) scale(1)`, opacity: 1 },
        { transform: `translate(${ex}px,${ey}px) scale(${sc})`, opacity: 0.6 },
      ],
      { duration: 1000, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" },
    );
    const done = () => {
      el.remove();
      resolve();
    };
    anim.onfinish = done;
    anim.oncancel = done;
  });
}
