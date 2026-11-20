"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Country } from "./types";

type Props = {
  choices: Country[];
  disabled: string[];
  onPick: (f: Country) => void;
};

/** Three big answer buttons. Side by side on desktop, stacked on mobile. */
export function AnswerChoices({ choices, disabled, onPick }: Props) {
  return (
    <div className="fs-rise grid w-full max-w-xl grid-cols-1 gap-2 px-4 sm:grid-cols-3">
      {choices.map((f) => {
        const off = disabled.includes(f.c);
        return (
          <Button
            key={f.c}
            variant="outline"
            disabled={off}
            onClick={() => onPick(f)}
            className={cn(
              "h-auto min-h-14 rounded-2xl bg-background/70 px-4 text-xl font-semibold tracking-tight whitespace-normal backdrop-blur",
              off && "opacity-35",
            )}
          >
            {f.n}
          </Button>
        );
      })}
    </div>
  );
}
