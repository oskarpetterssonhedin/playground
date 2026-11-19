import { defineControls } from "@/components/controls";

export const SLUG = "flow-field";

export const controlSchema = defineControls({
  count: { type: "slider", label: "Particles", min: 100, max: 4000, step: 100, default: 1500 },
  speed: { type: "slider", label: "Speed", min: 0.2, max: 4, step: 0.1, default: 1.2 },
  scale: { type: "slider", label: "Field scale", min: 0.5, max: 6, step: 0.1, default: 2 },
  trail: { type: "slider", label: "Trail", min: 0, max: 0.98, step: 0.01, default: 0.94 },
  size: { type: "slider", label: "Size", min: 0.5, max: 4, step: 0.1, default: 1.4, unit: "px" },
  pattern: {
    type: "select",
    label: "Pattern",
    options: [
      { value: "flow", label: "Flow" },
      { value: "swirl", label: "Swirl" },
      { value: "grid", label: "Grid" },
    ],
    default: "flow",
  },
  color: {
    type: "color",
    label: "Color",
    default: "chart-2",
    palette: ["foreground", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
  },
  animate: { type: "toggle", label: "Animate", default: true, randomize: false },
});

/** Frames simulated up front so a still frame (reduced motion, paused) has visible trails. */
export const STILL_FRAMES = 120;
