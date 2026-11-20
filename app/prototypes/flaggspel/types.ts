/** A row in data/countries.json. */
export type CountryRow = {
  /** ISO-ish code, also the flag file name. */
  c: string;
  /** Swedish name. */
  n: string;
  /** Level 1–3. */
  l: 1 | 2 | 3;
  /** Continent (Swedish). */
  k: string;
  /** Aliases the kids might say. */
  a: string[];
  /** Fun hint, may be empty. */
  f: string;
  /** Parent country code ("" if none), e.g. England → gb. */
  p: string;
  /** Flag aspect ratio (width / height). */
  ar: number;
};

export type MapPoint = { x: number; y: number; s: string | null };

export type MapData = {
  W: number;
  H: number;
  sphere: string;
  shapes: Record<string, { d: string; box: [number, number, number, number] }>;
  pts: Record<string, MapPoint>;
};

/** Country prepared for matching and the map. */
export type Country = CountryRow & {
  /** Normalized name + aliases (no padding spaces). */
  words: string[];
  /** Sound keys for `words`. */
  ph: string[];
  pt: MapPoint;
};

export type Box = [number, number, number, number];

/** Map camera: top-left corner and width in map units (height follows the screen). */
export type View = { x: number; y: number; w: number };

export type LevelId = 0 | 1 | 2 | 3;

export type HintChip =
  | { kind: "continent"; text: string }
  | { kind: "letter"; text: string }
  | { kind: "fact"; text: string }
  | { kind: "name"; text: string };

export type Verdict =
  | { result: "right" }
  | { result: "wrong"; heard: string; partOf: string | null }
  | { result: "hint" }
  | { result: "skip" }
  | { result: "notUnderstood" }
  /** Nothing to do (interim only, throttled, or adults talking). */
  | { result: "none" };

export type Settings = {
  level: LevelId;
  voice: string;
  rate: number;
  alwaysChoices: boolean;
};
