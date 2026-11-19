/** Pure schema logic: defaults, validation of stored values, randomization. No React. */
import { COLOR_TOKENS, type Control, type ControlSchema, type ControlValues, type SelectOption } from "./types";

export function optionValue(option: SelectOption): string {
  return typeof option === "string" ? option : option.value;
}

export function optionLabel(option: SelectOption): string {
  return typeof option === "string" ? option : option.label;
}

export function paletteOf(control: Extract<Control, { type: "color" }>) {
  return control.palette ?? COLOR_TOKENS;
}

export function getDefaults<S extends ControlSchema>(schema: S): ControlValues<S> {
  const values: Record<string, unknown> = {};
  for (const [key, control] of Object.entries(schema)) values[key] = control.default;
  return values as ControlValues<S>;
}

function clamp(n: number, min = -Infinity, max = Infinity) {
  return Math.min(max, Math.max(min, n));
}

/** Returns the value if valid for the control, otherwise undefined. */
export function sanitizeValue(control: Control, value: unknown): unknown {
  switch (control.type) {
    case "slider":
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? clamp(value, control.min, control.max)
        : undefined;
    case "toggle":
      return typeof value === "boolean" ? value : undefined;
    case "select":
      return control.options.some((o) => optionValue(o) === value) ? value : undefined;
    case "color":
      return (paletteOf(control) as readonly unknown[]).includes(value) ? value : undefined;
  }
}

/** Merge untrusted stored data over defaults, dropping unknown keys and invalid values. */
export function sanitizeValues<S extends ControlSchema>(schema: S, raw: unknown): ControlValues<S> {
  const values = getDefaults(schema) as Record<string, unknown>;
  if (raw && typeof raw === "object") {
    for (const [key, control] of Object.entries(schema)) {
      const v = sanitizeValue(control, (raw as Record<string, unknown>)[key]);
      if (v !== undefined) values[key] = v;
    }
  }
  return values as ControlValues<S>;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInRange(min: number, max: number, step?: number) {
  const raw = min + Math.random() * (max - min);
  if (!step) return raw;
  const snapped = min + Math.round((raw - min) / step) * step;
  // Avoid float noise like 0.30000000000000004.
  const decimals = (String(step).split(".")[1] ?? "").length;
  return clamp(Number(snapped.toFixed(decimals)), min, max);
}

export function randomValue(control: Control, current: unknown): unknown {
  if (control.randomize === false) return current;
  switch (control.type) {
    case "slider":
      return randomInRange(control.min, control.max, control.step);
    case "number":
      return control.min !== undefined && control.max !== undefined
        ? randomInRange(control.min, control.max, control.step ?? 1)
        : current;
    case "toggle":
      return Math.random() < 0.5;
    case "select":
      return optionValue(pick(control.options));
    case "color":
      return pick(paletteOf(control));
  }
}

export function randomizeValues<S extends ControlSchema>(schema: S, current: ControlValues<S>): ControlValues<S> {
  const next: Record<string, unknown> = { ...current };
  for (const [key, control] of Object.entries(schema)) next[key] = randomValue(control, next[key]);
  return next as ControlValues<S>;
}

/** Format a numeric value for display using the step's precision. */
export function formatNumber(value: number, step?: number) {
  const decimals = step ? (String(step).split(".")[1] ?? "").length : 2;
  return value.toFixed(Math.min(decimals, 4));
}
