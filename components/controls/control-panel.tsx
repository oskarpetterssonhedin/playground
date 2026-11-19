"use client";

import { RotateCcw, Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ControlField } from "./control-field";
import type { ControlSchema } from "./types";
import type { Controls } from "./use-controls";

/** The list of fields plus Reset / Randomize. Layout-agnostic. */
export function ControlPanel<S extends ControlSchema>({ controls }: { controls: Controls<S> }) {
  const { slug, schema, values, set, reset, randomize } = controls;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11" onClick={reset} aria-label="Reset">
          <RotateCcw />
          <span className="hidden sm:inline">Reset</span>
        </Button>
        <Button variant="outline" className="h-11" onClick={randomize} aria-label="Randomize">
          <Shuffle />
          <span className="hidden sm:inline">Randomize</span>
        </Button>
      </div>
      {Object.entries(schema).map(([key, control]) => (
        <ControlField
          key={key}
          id={`${slug}-control-${key}`}
          control={control}
          value={values[key]}
          onChange={(v) => set(key, v as never)}
        />
      ))}
    </div>
  );
}
