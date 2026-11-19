import type { ControlValues } from "@/components/controls";

import type { controlSchema } from "./data";

export type FieldSettings = ControlValues<typeof controlSchema>;

export type Pattern = FieldSettings["pattern"];

export type Particle = {
  x: number;
  y: number;
  /** Previous position, for drawing a line segment per step. */
  px: number;
  py: number;
  /** Frames left before respawning somewhere random. */
  life: number;
};
