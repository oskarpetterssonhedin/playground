"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { T } from "./data";

/*
 * Speech recognition, following brief §3 rule by rule:
 * 1. The microphone is opened once per game (no noiseSuppression: it hurts kids' voices).
 * 2. Every session starts on that same track (`start(track)`, Chrome 133+) so the
 *    browser asks for permission once; falls back to `start()`.
 * 3. A fresh SpeechRecognition per listen; events from stale instances are ignored.
 * 4. Never listens while the game speaks: `mute()` before speaking, `listen()` after
 *    (which waits 250 ms).
 * 6. On-device recognition with boosted country names when available.
 * Everything optional is feature-detected inside try/catch.
 */

/** Minimal Web Speech API shape (not in TypeScript's DOM lib). */
type RecResultEvent = { resultIndex: number; results: SpeechRecognitionResultList };
type Rec = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  processLocally?: boolean;
  phrases?: unknown[];
  start: (track?: MediaStreamTrack) => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: RecResultEvent) => void) | null;
};
type RecCtor = {
  new (): Rec;
  available?: (o: { langs: string[]; processLocally: boolean }) => Promise<string>;
  install?: (o: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
};
type PhraseCtor = new (phrase: string, boost: number) => unknown;

/**
 * "tap": permission is granted but the browser refuses to start listening
 * without a fresh tap (iPhone Safari). The game then listens only when
 * "Prata" is pressed.
 */
export type MicState = "unknown" | "ok" | "tap" | "blocked" | "unsupported";
export type LocalState = "" | "available" | "downloadable" | "downloading" | "unavailable";

function getSR(): RecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Options = {
  /** Final and interim transcripts of one result event. */
  onResult: (fin: string[], mid: string[]) => void;
  /** Whether results should be accepted right now (asking, not speaking). */
  canListen: () => boolean;
  /** Phrases to boost and their boost (3, or 6 when choices are shown). */
  phrases: () => { names: string[]; boost: number };
  /** The mic turned out to be unusable. */
  onBlocked: () => void;
};

export function useSpeechInput(options: Options) {
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });

  // Client-only component (ssr: false), so window is available here.
  const [mic, setMic] = useState<MicState>(() => (getSR() ? "unknown" : "unsupported"));
  const [active, setActive] = useState(false);
  const [local, setLocal] = useState<LocalState>("");

  const r = useRef({
    rec: null as Rec | null,
    listening: false,
    track: null as MediaStreamTrack | null,
    trackOK: true,
    localOK: false,
    timer: 0 as ReturnType<typeof setTimeout> | 0,
    mic: (getSR() ? "unknown" : "unsupported") as MicState,
    /** getUserMedia succeeded once this game. */
    permitted: false,
    /** The recognizer started from a tap; its errors are final. */
    tapRec: null as Rec | null,
    /**
     * Keep the mic track open only where recognition can read from it
     * (Chromium: start(track), which ships alongside available()). Elsewhere,
     * notably iPhone Safari, an open track steals the mic from recognition.
     */
    keepTrack: typeof getSR()?.available === "function",
  });

  const setMicState = useCallback((m: MicState) => {
    r.current.mic = m;
    setMic(m);
  }, []);

  const blocked = useCallback(() => {
    setMicState(getSR() ? "blocked" : "unsupported");
    r.current.listening = false;
    dropRec();
    opts.current.onBlocked();
  }, [setMicState]);

  function dropRec() {
    const s = r.current;
    if (s.rec) {
      const old = s.rec;
      s.rec = null;
      try {
        old.abort();
      } catch {}
    }
    setActive(false);
  }

  /** Open the microphone once per game. Safe to call repeatedly. */
  const primeMic = useCallback(async () => {
    const s = r.current;
    if (!getSR()) {
      setMicState("unsupported");
      opts.current.onBlocked();
      return;
    }
    if (s.mic === "blocked") return;
    if (s.permitted && (!s.keepTrack || s.track?.readyState === "live")) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      blocked();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true },
      });
      s.permitted = true;
      if (s.keepTrack) s.track = stream.getAudioTracks()[0] ?? null;
      else stream.getTracks().forEach((t) => t.stop());
      if (s.mic !== "tap") setMicState("ok");
    } catch {
      blocked();
    }
  }, [blocked, setMicState]);

  const refreshLocal = useCallback(async () => {
    const SR = getSR();
    let state: LocalState = "";
    try {
      if (SR && typeof SR.available === "function") {
        state = ((await SR.available({ langs: ["sv-SE"], processLocally: true })) as LocalState) || "";
      }
    } catch {
      state = "";
    }
    r.current.localOK = state === "available";
    setLocal(state);
  }, []);

  const installLocal = useCallback(async () => {
    const SR = getSR();
    setLocal("downloading");
    try {
      await SR?.install?.({ langs: ["sv-SE"], processLocally: true });
    } catch {}
    await refreshLocal();
  }, [refreshLocal]);

  const makeRec = useCallback((): Rec => {
    const SR = getSR()!;
    const s = r.current;
    const rec = new SR();
    rec.lang = "sv-SE";
    rec.interimResults = true;
    rec.maxAlternatives = 10;
    rec.continuous = true;
    if (s.localOK) {
      try {
        rec.processLocally = true;
        const Phrase = (window as unknown as { SpeechRecognitionPhrase?: PhraseCtor }).SpeechRecognitionPhrase;
        if (Phrase) {
          const { names, boost } = opts.current.phrases();
          rec.phrases = names.map((n) => new Phrase(n, boost));
        }
      } catch {}
    }
    rec.onstart = () => {
      if (rec !== s.rec) return;
      if (s.mic !== "tap") setMicState("ok");
      setActive(true);
    };
    rec.onerror = (e) => {
      if (rec !== s.rec) return;
      const err = e.error;
      if (err === "audio-capture" && s.track && s.trackOK) {
        s.trackOK = false;
        return;
      }
      if ((err === "language-not-supported" || err === "phrases-not-supported") && s.localOK) {
        s.localOK = false;
        return;
      }
      if (err === "not-allowed" || err === "service-not-allowed") {
        // Permission was granted but an automatic start was refused: wait for a tap.
        if (s.permitted && rec !== s.tapRec) {
          s.listening = false;
          dropRec();
          setMicState("tap");
          return;
        }
        blocked();
      }
    };
    rec.onend = () => {
      if (rec !== s.rec) return;
      setActive(false);
      // In "tap" mode a timer can't restart it; the next tap will.
      if (s.listening && s.mic !== "blocked" && s.mic !== "tap") {
        setTimeout(() => {
          if (rec === s.rec && s.listening) begin();
        }, T.restartDelay);
      }
    };
    rec.onresult = (e) => {
      if (rec !== s.rec || !s.listening || !opts.current.canListen()) return;
      const fin: string[] = [];
      const mid: string[] = [];
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        for (let j = 0; j < res.length; j++) (res.isFinal ? fin : mid).push(res[j].transcript);
      }
      opts.current.onResult(fin, mid);
    };
    return rec;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- begin is hoisted below and only reads refs
  }, [blocked, setMicState]);

  function begin() {
    const s = r.current;
    if (!getSR() || s.mic === "blocked") return;
    dropRec();
    s.rec = makeRec();
    const live = s.track?.readyState === "live";
    try {
      if (live && s.trackOK) s.rec.start(s.track!);
      else s.rec.start();
    } catch {
      if (live && s.trackOK) {
        s.trackOK = false;
        s.rec = makeRec();
        try {
          s.rec.start();
        } catch {}
      }
    }
    setActive(true);
  }

  /** Stop listening now (before speaking, on win, etc.). */
  const mute = useCallback(() => {
    const s = r.current;
    s.listening = false;
    if (s.timer) clearTimeout(s.timer);
    dropRec();
  }, []);

  /** Start listening 250 ms from now (after speech has ended). */
  const listen = useCallback(() => {
    const s = r.current;
    if (s.mic === "blocked" || s.mic === "unsupported" || s.mic === "tap") return;
    s.listening = true;
    if (s.timer) clearTimeout(s.timer);
    s.timer = setTimeout(async () => {
      if (!s.listening || !opts.current.canListen()) return;
      await primeMic();
      if (s.listening && opts.current.canListen()) begin();
    }, T.listenDelay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primeMic]);

  /** Start listening right now, inside the tap handler (needed on iPhone). */
  const listenNow = useCallback(() => {
    const s = r.current;
    if (s.mic === "blocked" || s.mic === "unsupported") return;
    s.listening = true;
    if (s.timer) clearTimeout(s.timer);
    begin();
    s.tapRec = s.rec;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const s = r.current;
    return () => {
      s.listening = false;
      if (s.timer) clearTimeout(s.timer);
      if (s.rec) {
        try {
          s.rec.abort();
        } catch {}
      }
      s.track?.stop();
    };
  }, []);

  return { mic, active, local, primeMic, listen, listenNow, mute, refreshLocal, installLocal };
}
