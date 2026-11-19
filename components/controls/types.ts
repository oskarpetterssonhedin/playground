/**
 * Control schema types. Define a schema with `defineControls({...})` so literal
 * types (select options, defaults) are preserved and `useControls` returns
 * precisely typed values.
 */

/** Theme tokens a color control can pick from. Resolved at runtime from CSS variables. */
export const COLOR_TOKENS = [
  "foreground",
  "primary",
  "muted-foreground",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "destructive",
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

type BaseControl = {
  label: string;
  /** Set false to keep this control fixed when Randomize is pressed. */
  randomize?: boolean;
};

export type SliderControl = BaseControl & {
  type: "slider";
  min: number;
  max: number;
  step?: number;
  default: number;
  /** Shown after the value, e.g. "px", "%", "×". */
  unit?: string;
};

export type NumberControl = BaseControl & {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
  default: number;
};

export type ToggleControl = BaseControl & {
  type: "toggle";
  default: boolean;
};

export type SelectOption = string | { value: string; label: string };

export type SelectControl = BaseControl & {
  type: "select";
  options: readonly SelectOption[];
  default: string;
};

export type ColorControl = BaseControl & {
  type: "color";
  default: ColorToken;
  /** Subset of COLOR_TOKENS to offer. Defaults to all. */
  palette?: readonly ColorToken[];
};

export type Control = SliderControl | NumberControl | ToggleControl | SelectControl | ColorControl;

export type ControlSchema = Record<string, Control>;

type OptionValue<O> = O extends string ? O : O extends { value: infer V } ? V : never;

export type ControlValue<C> = C extends { type: "slider" | "number" }
  ? number
  : C extends { type: "toggle" }
    ? boolean
    : C extends { type: "select"; options: readonly (infer O)[] }
      ? OptionValue<O>
      : C extends { type: "color" }
        ? ColorToken
        : never;

export type ControlValues<S extends ControlSchema> = { -readonly [K in keyof S]: ControlValue<S[K]> };

/** Identity helper that keeps literal types. */
export function defineControls<const S extends ControlSchema>(schema: S): S {
  return schema;
}
