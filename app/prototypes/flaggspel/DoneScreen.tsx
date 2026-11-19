"use client";

import { Button } from "@/components/ui/button";

import { flagUrl, ROUND } from "./data";
import { countText, doneTitle } from "./game";
import type { Country } from "./types";

type Props = { got: Country[]; onAgain: () => void; onLevels: () => void };

/** Whole trip on the map behind; collected flags, empty slots for misses. */
export function DoneScreen({ got, onAgain, onLevels }: Props) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="fs-rise w-full max-w-lg rounded-3xl border bg-background/70 p-6 text-center backdrop-blur">
        <h2 className="text-3xl font-semibold tracking-tight text-balance">{doneTitle(got.length)}</h2>
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {Array.from({ length: ROUND }, (_, i) => {
            const f = got[i];
            return (
              <li key={i} className="fs-pop size-9 overflow-hidden rounded-full ring-1 ring-border" style={{ animationDelay: `${i * 60}ms` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static flag SVG */}
                {f ? <img src={flagUrl(f.c)} alt={f.n} className="size-full object-cover" /> : <span className="block size-full bg-muted" />}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-lg">Ni flög till {countText(got.length)}.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button className="h-14 rounded-2xl text-lg" onClick={onAgain}>
            Res igen
          </Button>
          <Button variant="outline" className="h-14 rounded-2xl text-lg" onClick={onLevels}>
            Byt nivå
          </Button>
        </div>
      </div>
    </div>
  );
}
