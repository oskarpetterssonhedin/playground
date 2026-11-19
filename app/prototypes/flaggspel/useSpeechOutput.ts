"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Natural/neural/online 3, premium/enhanced/Siri 2, Google 1, else 0. */
export function voiceScore(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  if (/natural|neural|online/.test(n)) return 3;
  if (/premium|förbättrad|enhanced|siri/.test(n)) return 2;
  if (/google/.test(n)) return 1;
  return 0;
}

export const NO_VOICE = "none";

type Options = {
  voiceId: string;
  rate: number;
  /** Called right before speaking starts (to stop listening). */
  onStart?: () => void;
};

/**
 * Swedish text-to-speech. `say()` resolves when speech ends, with a fallback
 * timer in case `onend` never fires. With "Ingen röst" the text is shown as a
 * caption instead.
 */
export function useSpeechOutput({ voiceId, rate, onStart }: Options) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [caption, setCaption] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const opts = useRef({ voiceId, rate, onStart, voices });
  useEffect(() => {
    opts.current = { voiceId, rate, onStart, voices };
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => {
      try {
        setVoices(
          speechSynthesis
            .getVoices()
            .filter((v) => /^sv/i.test(v.lang))
            .sort((a, b) => voiceScore(b) - voiceScore(a)),
        );
      } catch {
        setVoices([]);
      }
    };
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const cancel = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {}
  }, []);

  const say = useCallback((text: string) => {
    return new Promise<void>((resolve) => {
      const { voiceId: id, rate: r, onStart: start, voices: list } = opts.current;
      start?.();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        speakingRef.current = false;
        setSpeaking(false);
        resolve();
      };
      speakingRef.current = true;
      setSpeaking(true);
      const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
      const voice = list.find((v) => v.voiceURI === id) ?? list[0];
      // No Swedish voice at all reads like "Ingen röst": show the text instead.
      if (id === NO_VOICE || !synth || !voice) {
        setCaption(text);
        setTimeout(finish, 1400 + text.length * 55);
        return;
      }
      setCaption(null);
      try {
        synth.cancel();
      } catch {}
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "sv-SE";
      u.voice = voice;
      u.rate = r;
      u.pitch = 1;
      u.onend = finish;
      u.onerror = finish;
      setTimeout(finish, 2500 + text.length * 110);
      setTimeout(() => {
        try {
          synth.speak(u);
        } catch {
          finish();
        }
      }, 60);
    });
  }, []);

  return { voices, caption, speaking, speakingRef, say, cancel };
}
