"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { flyFlag } from "./FlagCard";
import type { CardMode } from "./FlagCard";
import {
  ASK,
  byCode,
  COUNTRIES,
  FIRST_ASK,
  FIRST_ASK_HINT,
  flagUrl,
  flightMs,
  HOME,
  NOT_HEARD,
  pool,
  PRAISE,
  ROUND,
  SETTINGS_DEFAULTS,
  T,
  TRY,
} from "./data";
import { buildDeck, countText, hintStep, listText, pick, pickChoices, wrongLine } from "./game";
import { judgeChoices, judgeFree, syllable } from "./matching";
import { boxOf, contBox } from "./mapView";
import { initAudio, playBlip, playCorrect, playLand, playWhoosh, playWrong } from "./sound";
import { loadSettings, saveSetting } from "./storage";
import type { Country, HintChip, LevelId, Settings } from "./types";
import { useSpeechInput } from "./useSpeechInput";
import { useSpeechOutput } from "./useSpeechOutput";
import type { WorldMapHandle } from "./WorldMap";

type Screen = "start" | "play" | "done";
type Phase = "start" | "ask" | "win" | "skip" | "done";

export type GameUi = {
  screen: Screen;
  phase: Phase;
  cur: Country | null;
  index: number;
  got: Country[];
  hints: HintChip[];
  choices: Country[] | null;
  disabled: string[];
  cardMode: CardMode;
  cardKey: string;
  cheer: string | null;
  celebrate: { code: string; at: [number, number]; key: number } | null;
  heard: string | null;
};

const INITIAL_UI: GameUi = {
  screen: "start",
  phase: "start",
  cur: null,
  index: 0,
  got: [],
  hints: [],
  choices: null,
  disabled: [],
  cardMode: "in",
  cardKey: "",
  cheer: null,
  celebrate: null,
  heard: null,
};

type Flow = {
  win: () => Promise<void>;
  wrong: (other: Country | null) => Promise<void>;
  hint: () => Promise<void>;
  skip: () => Promise<void>;
  notUnderstood: () => Promise<void>;
};
const noop = async () => {};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Refs = {
  map: React.RefObject<WorldMapHandle | null>;
  cardImg: React.RefObject<HTMLImageElement | null>;
  area: React.RefObject<HTMLDivElement | null>;
};

/**
 * The game's flow (brief §2), ported from the reference. Mutable game state
 * lives in a ref so async steps always see the latest values; `publish()`
 * copies it into React state for rendering. Every async step captures `turn`
 * (and `round`) and bails out if the game moved on meanwhile.
 */
export function useGame({ map, cardImg, area }: Refs) {
  const [settings, setSettings] = useState<Settings>(SETTINGS_DEFAULTS);
  const [reduced, setReduced] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const g = useRef({
    screen: "start" as Screen,
    phase: "start" as Phase,
    level: SETTINGS_DEFAULTS.level as LevelId,
    alwaysChoices: false,
    reduced: false,
    micOff: false,
    deck: [] as Country[],
    deckPos: 0,
    firstEver: true,
    cur: null as Country | null,
    index: 0,
    got: [] as Country[],
    hints: [] as HintChip[],
    choices: null as Country[] | null,
    disabled: [] as string[],
    hintLevel: 0,
    wrongs: 0,
    misses: 0,
    lastWrong: 0,
    turn: 0,
    round: 0,
    cardMode: "in" as CardMode,
    cardKey: "",
    cheer: null as string | null,
    celebrate: null as GameUi["celebrate"],
    heard: null as string | null,
  });

  const snapshot = (): GameUi => {
    const s = g.current;
    return {
      screen: s.screen,
      phase: s.phase,
      cur: s.cur,
      index: s.index,
      got: [...s.got],
      hints: [...s.hints],
      choices: s.choices,
      disabled: [...s.disabled],
      cardMode: s.cardMode,
      cardKey: s.cardKey,
      cheer: s.cheer,
      celebrate: s.celebrate,
      heard: s.heard,
    };
  };
  const [ui, setUi] = useState<GameUi>(INITIAL_UI);
  const publish = useCallback(() => setUi(snapshot()), []);

  // ---- speech ----
  const muteRef = useRef<() => void>(() => {});
  const output = useSpeechOutput({ voiceId: settings.voice, rate: settings.rate, onStart: () => muteRef.current() });
  const say = output.say;

  const flow = useRef<Flow>({ win: noop, wrong: noop, hint: noop, skip: noop, notUnderstood: noop });

  const input = useSpeechInput({
    canListen: () => g.current.phase === "ask" && !output.speakingRef.current,
    phrases: () => {
      const s = g.current;
      const names = new Set(["ledtråd"]);
      (s.choices ?? pool(s.level)).forEach((f) => {
        names.add(f.n.toLowerCase());
        f.a.slice(0, 1).forEach((a) => names.add(a.toLowerCase()));
      });
      return { names: [...names], boost: s.choices ? 6 : 3 };
    },
    onBlocked: () => {
      const s = g.current;
      s.micOff = true;
      if (s.phase === "ask" && !s.choices && s.cur) {
        s.choices = pickChoices(s.cur, pool(s.level));
        publish();
      }
    },
    onNothing: (error) => {
      const s = g.current;
      if (s.phase !== "ask") return;
      s.heard = error ? `Mikrofonen svarade: ${error}. Tryck och prata igen.` : "Jag hörde inget. Tryck och prata igen.";
      publish();
    },
    onResult: (fin, mid) => {
      const s = g.current;
      if (!s.cur || s.phase !== "ask") return;
      const first = (fin[0] || mid[0] || "").trim();
      if (first) {
        s.heard = `Jag hörde: ${first}`;
        publish();
      }
      const canWrong = Date.now() - s.lastWrong >= T.wrongThrottle;
      const base = { all: COUNTRIES, cur: s.cur, fin, mid, canWrong };
      const v = s.choices ? judgeChoices({ ...base, choices: s.choices }) : judgeFree(base);
      switch (v.result) {
        case "right":
          return void flow.current.win();
        case "hint":
          return void flow.current.hint();
        case "skip":
          return void flow.current.skip();
        case "wrong":
          s.lastWrong = Date.now();
          return void flow.current.wrong(byCode(v.heard) ?? null);
        case "notUnderstood":
          s.lastWrong = Date.now();
          return void flow.current.notUnderstood();
      }
    },
  });
  useEffect(() => {
    muteRef.current = input.mute;
  });
  const { listen, listenNow, mute, primeMic } = input;

  const listenIfAsking = (t: number) => {
    if (t === g.current.turn && g.current.phase === "ask") listen();
  };

  // ---- flow ----
  async function nextFlag() {
    const s = g.current;
    if (s.index >= ROUND) return finishRound();
    if (s.deckPos >= s.deck.length) {
      s.deck = buildDeck(pool(s.level), s.firstEver && s.level === 1);
      s.firstEver = false;
      s.deckPos = 0;
    }
    const cur = s.deck[s.deckPos++];
    Object.assign(s, {
      cur,
      index: s.index + 1,
      hintLevel: 0,
      wrongs: 0,
      misses: 0,
      turn: s.turn + 1,
      choices: null,
      disabled: [],
      hints: [],
      cheer: null,
      celebrate: null,
      heard: null,
      phase: "ask",
      cardMode: "in",
    });
    s.cardKey = `${cur.c}-${s.round}-${s.index}`;
    publish();
    map.current?.ping(null);
    playWhoosh();
    map.current?.animateTo(map.current.worldView(), T.worldView);
    const t = s.turn;
    const q = s.index === 1 ? FIRST_ASK : pick(ASK);
    if (s.alwaysChoices || s.micOff) {
      s.choices = pickChoices(cur, pool(s.level));
      publish();
      await say(`${q} Är det ${listText(s.choices)}?`);
    } else {
      await say(q + (s.index === 1 ? FIRST_ASK_HINT : ""));
    }
    listenIfAsking(t);
  }

  async function win() {
    const s = g.current;
    if (s.phase !== "ask" || !s.cur) return;
    s.phase = "win";
    mute();
    s.turn++;
    const round = s.round;
    const f = s.cur;
    const from = s.got.length ? s.got[s.got.length - 1].pt : HOME;
    Object.assign(s, { hints: [], choices: null, cardMode: "win" });
    publish();
    playLand();
    playCorrect();
    const speech = say(`${pick(PRAISE)} Det är ${f.n}!`);
    const trip = (async () => {
      await wait(s.reduced ? 0 : T.zoomDelay);
      if (round !== s.round) return;
      s.cheer = f.n;
      publish();
      const m = map.current;
      if (!m) return;
      const cb = m.countryBox(f);
      const v = m.fitBox(boxOf([from, f.pt, { x: cb[0], y: cb[1] }, { x: cb[2], y: cb[3] }]), 70);
      const [tx, ty] = m.toScreen(f.pt.x, f.pt.y, v);
      const rect = area.current?.getBoundingClientRect();
      const fly = flyFlag(cardImg.current, flagUrl(f.c), [(rect?.left ?? 0) + tx, (rect?.top ?? 0) + ty], s.reduced);
      s.cardMode = "gone";
      publish();
      await Promise.all([m.animateTo(v, T.zoom), fly]);
      if (round !== s.round) return;
      await m.fly(from, f.pt, flightMs(Math.hypot(f.pt.x - from.x, f.pt.y - from.y)));
      if (round !== s.round) return;
      m.land(f);
      m.parkPlane(f.pt);
      s.got.push(f);
      s.celebrate = { code: f.c, at: m.toScreen(f.pt.x, f.pt.y), key: Date.now() };
      publish();
      playLand();
      await wait(T.afterLanding);
    })();
    await Promise.all([speech, trip]);
    await wait(T.beforeNext);
    if (round === s.round && s.phase === "win") nextFlag();
  }

  async function wrong(other: Country | null) {
    const s = g.current;
    if (s.phase !== "ask" || !s.cur) return;
    mute();
    s.wrongs++;
    playWrong();
    s.cardMode = "shake";
    s.cardKey = `${s.cur.c}-${s.round}-${s.index}-w${s.wrongs}`;
    const t = s.turn;
    let msg = wrongLine(other, s.cur, TRY);
    if (other && s.choices?.includes(other) && !s.disabled.includes(other.c)) s.disabled.push(other.c);
    if (!s.choices && s.wrongs >= 2) {
      s.choices = pickChoices(s.cur, pool(s.level));
      msg += ` Är det ${listText(s.choices)}?`;
    }
    publish();
    await say(msg);
    listenIfAsking(t);
  }

  async function notUnderstood() {
    const s = g.current;
    if (s.phase !== "ask" || !s.cur) return;
    s.misses++;
    const t = s.turn;
    if (s.misses >= 2 && !s.choices) {
      s.choices = pickChoices(s.cur, pool(s.level));
      publish();
      await say(`Jag hörde inte riktigt. Är det ${listText(s.choices)}?`);
    } else {
      await say(s.choices ? `Jag hörde inte riktigt. Säg ${listText(s.choices)}.` : pick(NOT_HEARD));
    }
    listenIfAsking(t);
  }

  async function hint() {
    const s = g.current;
    const f = s.cur;
    if (s.phase !== "ask" || !f) return;
    mute();
    const t = s.turn;
    const m = map.current;
    const kind = hintStep(f, s.hintLevel, !!s.choices);
    let text: string;
    if (kind === "continent") {
      s.hints.push({ kind: "continent", text: f.k });
      text = `Ledtråd! Landet finns i ${f.k}. Titta på kartan!`;
      m?.animateTo(m.fitBox(contBox(f, COUNTRIES), 120), T.continentZoom);
    } else if (kind === "letter") {
      s.hints.push({ kind: "letter", text: f.n[0] });
      text = `Det börjar på bokstaven ${f.n[0]}.`;
    } else if (kind === "choices") {
      s.choices = pickChoices(f, pool(s.level));
      text = `Är det ${listText(s.choices)}?`;
    } else if (kind === "fact") {
      s.hints.push({ kind: "fact", text: f.f });
      text = f.f;
    } else if (kind === "syllable") {
      const syl = syllable(f.n);
      s.hints.push({ kind: "letter", text: `${syl}…` });
      text = `Det börjar så här: ${syl}.`;
    } else {
      if (!s.hints.some((h) => h.kind === "name")) s.hints.push({ kind: "name", text: f.n });
      text = `Det är ${f.n}! Kan ni säga ${f.n}?`;
      m?.ping(f);
      m?.animateTo(m.fitBox(m.countryBox(f), 60), T.countryZoom);
    }
    s.hintLevel++;
    publish();
    await say(text);
    listenIfAsking(t);
  }

  async function skip() {
    const s = g.current;
    const f = s.cur;
    if (s.phase !== "ask" || !f) return;
    s.phase = "skip";
    mute();
    s.turn++;
    const round = s.round;
    Object.assign(s, { cheer: f.n, choices: null, hints: [] });
    publish();
    const m = map.current;
    m?.ping(f);
    m?.animateTo(m.fitBox(m.countryBox(f), 60), 1000);
    await say(`Det var ${f.n}. Här ligger det!`);
    await wait(T.afterSkip);
    if (round === s.round && s.phase === "skip") nextFlag();
  }

  async function repeatQuestion() {
    const s = g.current;
    if (s.phase !== "ask") return;
    mute();
    const t = s.turn;
    await say(`Vilket land har den här flaggan?${s.choices ? ` Är det ${listText(s.choices)}?` : ""}`);
    if (t === s.turn) listen();
  }

  async function finishRound() {
    const s = g.current;
    Object.assign(s, { phase: "done", screen: "done", cheer: null, cardMode: "gone", choices: null, hints: [], celebrate: null });
    mute();
    publish();
    const m = map.current;
    m?.ping(null);
    if (m) m.animateTo(m.tripView(boxOf([HOME, ...s.got.map((f) => f.pt)])), 1400);
    playCorrect();
    const n = s.got.length;
    await say(`${n >= 7 ? "Wow Ted och Adam!" : "Bra rest Ted och Adam!"} Ni flög till ${countText(n)}!`);
  }

  function startRound() {
    const s = g.current;
    mute();
    output.cancel();
    Object.assign(s, { round: s.round + 1, index: 0, got: [], screen: "play", phase: "ask", celebrate: null });
    map.current?.resetTrip();
    publish();
    void nextFlag();
  }

  function setLevel(level: LevelId) {
    const s = g.current;
    s.level = level;
    s.deck = buildDeck(pool(level), s.firstEver && level === 1);
    s.firstEver = false;
    s.deckPos = 0;
    setSettings((prev) => ({ ...prev, level }));
    saveSetting("level", level);
  }

  // Latest flow functions for speech callbacks.
  useEffect(() => {
    flow.current = { win, wrong, hint, skip, notUnderstood };
  });

  // ---- mount: settings, reduced motion, start-screen drift ----
  useEffect(() => {
    const loaded = loadSettings();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    Object.assign(g.current, { level: loaded.level, alwaysChoices: loaded.alwaysChoices, reduced: reduce });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- settings are read from localStorage on mount
    setSettings(loaded);
    setReduced(reduce);
  }, []);

  /**
   * On-device recognition check. Only after a user tap, never on page load:
   * `available()` has crashed headless Chromium's renderer. Capped at 1.5 s.
   */
  const checkLocal = () => Promise.race([input.refreshLocal(), wait(1500)]);

  // ---- actions for the UI ----
  const actions = {
    start: (level: LevelId) => {
      initAudio();
      output.unlock();
      input.warmUp();
      setLevel(level);
      g.current.screen = "play";
      g.current.phase = "ask";
      publish();
      void primeMic()
        .then(checkLocal)
        .then(startRound);
    },
    again: () => startRound(),
    toLevels: () => {
      const s = g.current;
      mute();
      output.cancel();
      Object.assign(s, { screen: "start", phase: "start", round: s.round + 1, cardMode: "gone", cheer: null, celebrate: null });
      map.current?.resetTrip();
      map.current?.drift();
      publish();
    },
    right: () => void win(),
    skip: () => void skip(),
    hint: () => {
      initAudio();
      void hint();
    },
    repeat: () => void repeatQuestion(),
    pickChoice: (f: Country) => {
      const s = g.current;
      if (s.phase !== "ask") return;
      initAudio();
      if (f === s.cur) void win();
      else {
        if (!s.disabled.includes(f.c)) s.disabled.push(f.c);
        publish();
        void wrong(f);
      }
    },
    mic: () => {
      const s = g.current;
      if (s.phase !== "ask" || !s.cur) return;
      initAudio();
      if (s.micOff || input.mic === "blocked" || input.mic === "unsupported") {
        if (!s.choices) {
          s.choices = pickChoices(s.cur, pool(s.level));
          publish();
        }
        void repeatQuestion();
        return;
      }
      playBlip();
      output.cancel();
      s.heard = "Nu lyssnar jag!";
      publish();
      // Start inside the tap: iPhone Safari refuses starts from timers.
      listenNow();
    },
    openSettings: () => {
      mute();
      output.cancel();
      setSettingsOpen(true);
      void checkLocal();
    },
    closeSettings: () => {
      setSettingsOpen(false);
      if (g.current.phase === "ask") listen();
    },
    changeLevel: (level: LevelId) => {
      setLevel(level);
      setSettingsOpen(false);
      if (g.current.screen !== "start") startRound();
    },
    changeSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => {
      setSettings((prev) => ({ ...prev, [k]: v }));
      saveSetting(k, v);
      if (k === "alwaysChoices") {
        const s = g.current;
        s.alwaysChoices = v as boolean;
        if (s.alwaysChoices && s.phase === "ask" && !s.choices && s.cur) {
          s.choices = pickChoices(s.cur, pool(s.level));
          publish();
        }
      }
    },
    testVoice: () => {
      initAudio();
      output.unlock();
      void say("Hej Ted och Adam! Vilket land har den här flaggan?");
    },
    newTrip: () => {
      setSettingsOpen(false);
      initAudio();
      output.unlock();
      input.warmUp();
      g.current.screen = "play";
      void primeMic()
        .then(checkLocal)
        .then(startRound);
    },
  };

  const listening = input.active && !output.speaking && ui.phase === "ask";

  return {
    ui,
    settings,
    reduced,
    settingsOpen,
    actions,
    listening,
    mic: input.mic,
    local: input.local,
    installLocal: input.installLocal,
    voices: output.voices,
    caption: output.caption,
  };
}
