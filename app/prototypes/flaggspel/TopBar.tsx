"use client";

import { Check, Settings2, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { flagUrl, ROUND } from "./data";
import type { Country } from "./types";

type Props = {
  got: (Country | null)[];
  playing: boolean;
  onRight: () => void;
  onSkip: () => void;
  onSettings: () => void;
};

/** Trip progress (10 dots, mini flags when filled) and the adults' buttons. */
export function TopBar({ got, playing, onRight, onSkip, onSettings }: Props) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 pt-2 sm:px-4">
      <ol className="flex items-center gap-1 rounded-full border bg-background/70 px-2.5 py-2 backdrop-blur sm:gap-1.5" aria-label="Resan">
        {Array.from({ length: ROUND }, (_, i) => {
          const f = got[i];
          return (
            <li key={i} className={cn("size-3.5 overflow-hidden rounded-full sm:size-4", f ? "fs-pop ring-1 ring-border" : "bg-foreground/15")}>
              {/* eslint-disable-next-line @next/next/no-img-element -- static flag SVG */}
              {f && <img src={flagUrl(f.c)} alt={f.n} className="size-full object-cover" />}
            </li>
          );
        })}
      </ol>
      <div className="flex items-center rounded-full border bg-background/70 backdrop-blur" aria-label="Knappar för vuxna">
        <Button variant="ghost" className="h-11 rounded-full px-3" onClick={onRight} disabled={!playing} aria-label="Rätt">
          <Check />
          <span className="hidden sm:inline">Rätt</span>
        </Button>
        <Button variant="ghost" className="h-11 rounded-full px-3" onClick={onSkip} disabled={!playing} aria-label="Hoppa över">
          <SkipForward />
          <span className="hidden sm:inline">Hoppa över</span>
        </Button>
        <Button variant="ghost" className="h-11 rounded-full px-3" onClick={onSettings} aria-label="Vuxen">
          <Settings2 />
          <span className="hidden sm:inline">Vuxen</span>
        </Button>
      </div>
    </div>
  );
}
