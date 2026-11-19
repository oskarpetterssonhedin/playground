"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ColorToken } from "./types";

// Static class map so Tailwind generates every swatch color from tokens.
const SWATCH_CLASS: Record<ColorToken, string> = {
  foreground: "bg-foreground",
  primary: "bg-primary",
  "muted-foreground": "bg-muted-foreground",
  "chart-1": "bg-chart-1",
  "chart-2": "bg-chart-2",
  "chart-3": "bg-chart-3",
  "chart-4": "bg-chart-4",
  "chart-5": "bg-chart-5",
  destructive: "bg-destructive",
};

type Props = {
  label: string;
  palette: readonly ColorToken[];
  value: ColorToken;
  onChange: (token: ColorToken) => void;
};

export function ColorSwatches({ label, palette, value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
      {palette.map((token) => {
        const selected = token === value;
        return (
          <button
            key={token}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={token}
            onClick={() => onChange(token)}
            className="flex size-11 items-center justify-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full border border-border transition-shadow duration-200 ease-out",
                SWATCH_CLASS[token],
                selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
              )}
            >
              {selected && <Check className="size-3.5 text-background mix-blend-difference" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
