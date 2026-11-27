"use client";

import { Lightbulb, Mic, MicOff } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  heard: string | null;
  listening: boolean;
  micOff: boolean;
  /** Listening only starts on tap (iPhone). */
  tapToTalk: boolean;
  onMic: () => void;
  onHint: () => void;
};

/** The kids' buttons: big mic (88 px) and hint (64 px), with labels on every screen size. */
export function KidControls({ heard, listening, micOff, tapToTalk, onMic, onHint }: Props) {
  const label = micOff ? "Mikrofon av" : listening ? "Jag lyssnar" : tapToTalk ? "Tryck och prata" : "Prata";
  return (
    <div className="flex flex-col items-center gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <p
        className={cn(
          "h-6 max-w-[90vw] truncate rounded-full bg-background/70 px-3 text-sm text-muted-foreground backdrop-blur transition-opacity duration-300",
          heard ? "opacity-100" : "opacity-0",
        )}
        aria-live="polite"
      >
        {heard}
      </p>
      <div className="flex items-end gap-8">
        <button type="button" onClick={onMic} className="group flex flex-col items-center gap-1.5 outline-none" aria-label={label}>
          <span className="relative flex size-[88px] items-center justify-center">
            {listening && <span className="fs-listen absolute inset-0 rounded-full bg-primary" />}
            <span
              className={cn(
                "relative flex size-[88px] items-center justify-center rounded-full shadow-lg transition-transform duration-200 ease-out group-active:scale-95 group-focus-visible:ring-[3px] group-focus-visible:ring-ring/50",
                micOff ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
              )}
            >
              {micOff ? <MicOff className="size-9" /> : <Mic className="size-9" />}
            </span>
          </span>
          <span className="text-sm font-medium">{label}</span>
        </button>
        <button type="button" onClick={onHint} className="group flex flex-col items-center gap-1.5 outline-none" aria-label="Ledtråd">
          <span className="flex size-16 items-center justify-center rounded-full border bg-secondary text-secondary-foreground shadow-md transition-transform duration-200 ease-out group-active:scale-95 group-focus-visible:ring-[3px] group-focus-visible:ring-ring/50">
            <Lightbulb className="size-7" />
          </span>
          <span className="text-sm font-medium">Ledtråd</span>
        </button>
      </div>
    </div>
  );
}
