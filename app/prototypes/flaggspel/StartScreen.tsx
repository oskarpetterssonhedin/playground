"use client";

import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { LEVELS, pool } from "./data";
import type { LevelId } from "./types";

const LEVEL_SUB: Record<LevelId, (n: number) => string> = {
  1: (n) => `${n} kända länder`,
  2: (n) => `${n} fler länder`,
  3: (n) => `${n} ovanliga länder`,
  0: () => "hela världen",
};

/** Title, one sentence and four level cards. Choosing a level is the click that unlocks audio and mic. */
export function StartScreen({ onStart, onSettings }: { onStart: (l: LevelId) => void; onSettings: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4">
      <div className="fs-rise w-full max-w-lg rounded-3xl border bg-background/70 p-6 backdrop-blur sm:p-8">
        <p className="text-sm font-medium text-muted-foreground">Ted och Adams</p>
        <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">flaggspel</h2>
        <p className="mt-3 text-base text-muted-foreground text-pretty">
          Titta på flaggan och säg vilket land det är. Säg ledtråd om ni vill ha hjälp.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {LEVELS.map((L) => (
            <button
              key={L.id}
              type="button"
              onClick={() => onStart(L.id)}
              className="flex min-h-24 flex-col items-start justify-between rounded-2xl border bg-card p-4 text-left transition-colors duration-200 ease-out outline-none hover:border-foreground/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98]"
            >
              <span className="text-2xl font-semibold tracking-tight">{L.name}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{LEVEL_SUB[L.id](pool(L.id).length)}</span>
            </button>
          ))}
        </div>
        <Button variant="ghost" className="mt-4 h-11 text-muted-foreground" onClick={onSettings}>
          <Settings2 />
          Röst och mikrofon
        </Button>
      </div>
    </div>
  );
}
