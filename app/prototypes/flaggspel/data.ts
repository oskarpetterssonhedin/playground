import countriesJson from "./data/countries.json";
import mapJson from "./data/map.json";
import { phon, norm } from "./matching";
import type { Country, CountryRow, LevelId, MapData } from "./types";

export const SLUG = "flaggspel";
export const ROUND = 10;

export const MAP = mapJson as unknown as MapData;
export const HOME = MAP.pts.home;

export const COUNTRIES: Country[] = (countriesJson as CountryRow[]).map((row) => {
  const words = [...new Set([row.n, ...row.a].map((w) => norm(w).trim()).filter(Boolean))];
  return { ...row, words, ph: words.map(phon), pt: MAP.pts[row.c] ?? HOME };
});

export const byCode = (code: string) => COUNTRIES.find((c) => c.c === code);

export const LEVELS: { id: LevelId; name: string; sub: string }[] = [
  { id: 1, name: "Lätt", sub: "kända länder" },
  { id: 2, name: "Mellan", sub: "fler länder" },
  { id: 3, name: "Svår", sub: "ovanliga länder" },
  { id: 0, name: "Alla", sub: "hela världen" },
];

export const pool = (level: LevelId) => (level === 0 ? COUNTRIES : COUNTRIES.filter((c) => c.l === level));

export const flagUrl = (code: string) => `/assets/flaggspel/flags/${code}.svg`;

export const PRAISE = [
  "Ja! Helt rätt!",
  "Wow, vad duktiga ni är!",
  "Rätt! Bra jobbat!",
  "Jippi! Det stämmer!",
  "Toppen! Nu flyger vi dit!",
  "Super! Ni kan ju allt!",
  "Ja! Ett nytt land på kartan!",
];
export const TRY = ["Hmm, inte riktigt. Försök igen!", "Försök en gång till!", "Nej, inte det. Vad tror ni mer?"];
export const ASK = [
  "Och den här då?",
  "Vilket land är det här?",
  "Vilken flagga är det här?",
  "Vart flyger vi nu?",
  "Titta, en ny flagga! Vilket land är det?",
];
export const FIRST_ASK =
  "Hej Ted och Adam! Nu reser vi jorden runt. Vilket land har den här flaggan?";
export const FIRST_ASK_HINT = " Säg ledtråd om ni vill ha hjälp.";
export const NOT_HEARD = ["Jag hörde inte riktigt. Säg det en gång till!", "Hmm, säg det igen!"];

/** Timings in ms (see brief §2). */
export const T = {
  zoomDelay: 650,
  zoom: 1000,
  flightBase: 900,
  flightPerUnit: 4,
  flightMax: 2200,
  afterLanding: 700,
  beforeNext: 250,
  afterSkip: 600,
  worldView: 900,
  continentZoom: 1100,
  countryZoom: 900,
  listenDelay: 250,
  restartDelay: 200,
  wrongThrottle: 2500,
} as const;

export const flightMs = (dist: number) => Math.min(T.flightMax, T.flightBase + dist * T.flightPerUnit);

export const SETTINGS_DEFAULTS = { level: 1 as LevelId, voice: "", rate: 0.9, alwaysChoices: false };
