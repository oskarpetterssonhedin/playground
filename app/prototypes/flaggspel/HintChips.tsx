import { Globe } from "lucide-react";

import type { HintChip } from "./types";

/** Hints given so far: continent chip, big first letter, fun fact, the answer. */
export function HintChips({ hints }: { hints: HintChip[] }) {
  if (!hints.length) return null;
  return (
    <div className="flex max-w-xl flex-wrap items-center justify-center gap-2 px-4">
      {hints.map((h, i) => {
        const key = `${h.kind}-${i}`;
        switch (h.kind) {
          case "continent":
            return (
              <span key={key} className="fs-rise inline-flex h-10 items-center gap-2 rounded-full border bg-background/70 px-4 text-base font-medium backdrop-blur">
                <Globe className="size-4 text-muted-foreground" />
                {h.text}
              </span>
            );
          case "letter":
            return (
              <span key={key} className="fs-rise inline-flex h-14 min-w-14 items-center justify-center rounded-2xl border bg-background/70 px-3 text-4xl font-semibold tracking-tight backdrop-blur">
                {h.text}
              </span>
            );
          case "fact":
            return (
              <p key={key} className="fs-rise rounded-2xl border bg-background/70 px-4 py-2 text-center text-base text-balance backdrop-blur">
                {h.text}
              </p>
            );
          case "name":
            return (
              <span key={key} className="fs-rise rounded-2xl border bg-background/70 px-4 py-1 text-3xl font-semibold tracking-tight backdrop-blur">
                {h.text}
              </span>
            );
        }
      })}
    </div>
  );
}
