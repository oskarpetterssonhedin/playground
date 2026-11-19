"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import { AnswerChoices } from "./AnswerChoices";
import { Celebration } from "./Celebration";
import { DoneScreen } from "./DoneScreen";
import { FlagCard } from "./FlagCard";
import { HintChips } from "./HintChips";
import { KidControls } from "./KidControls";
import { SettingsSheet } from "./SettingsSheet";
import { StartScreen } from "./StartScreen";
import { TopBar } from "./TopBar";
import { useGame } from "./useGame";
import { WorldMap, type WorldMapHandle } from "./WorldMap";

import "./flaggspel.css";

/** Full-screen game: map underneath, HUD on top. */
export default function Game() {
  const map = useRef<WorldMapHandle>(null);
  const cardImg = useRef<HTMLImageElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const game = useGame({ map, cardImg, area });
  const { ui, actions } = game;
  const micOff = game.mic === "blocked" || game.mic === "unsupported";

  // Gentle pan behind the start screen.
  useEffect(() => {
    map.current?.drift();
  }, []);

  // Adult shortcuts: R right, L hint, N skip.
  const keys = useRef(actions);
  useEffect(() => {
    keys.current = actions;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input,select,textarea,[role=dialog]")) return;
      const k = e.key.toLowerCase();
      if (k === "r") keys.current.right();
      else if (k === "l") keys.current.hint();
      else if (k === "n") keys.current.skip();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={area} className="flaggspel relative flex-1 overflow-hidden select-none">
      <WorldMap ref={map} reduced={game.reduced} />

      {ui.celebrate && !game.reduced && <Celebration key={ui.celebrate.key} code={ui.celebrate.code} at={ui.celebrate.at} />}

      {ui.screen !== "start" && (
        <div className="absolute inset-0 flex flex-col">
          <TopBar
            got={ui.got}
            playing={ui.phase === "ask"}
            onRight={actions.right}
            onSkip={actions.skip}
            onSettings={actions.openSettings}
          />
          <div className="flex flex-col items-center gap-2 px-4 pt-2">
            {game.caption && (
              <p className="fs-rise max-w-xl rounded-2xl border bg-background/70 px-4 py-2 text-center text-base backdrop-blur" aria-live="polite">
                {game.caption}
              </p>
            )}
            {micOff && ui.screen === "play" && (
              <p className="rounded-full border bg-background/70 px-4 py-1.5 text-center text-sm text-muted-foreground backdrop-blur">
                Mikrofonen är avstängd. Tryck på rätt land, eller{" "}
                <button type="button" className="underline underline-offset-2" onClick={actions.openSettings}>
                  få igång rösten
                </button>
                .
              </p>
            )}
          </div>

          {ui.screen === "play" && (
            <>
              <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 py-2">
                {ui.cur && (
                  <FlagCard
                    country={ui.cur}
                    animKey={ui.cardKey}
                    mode={ui.cardMode}
                    index={ui.index}
                    compact={!!ui.choices}
                    onTap={actions.repeat}
                    imgRef={cardImg}
                  />
                )}
                <p
                  className={cn(
                    "text-center text-5xl font-semibold tracking-tight transition-opacity duration-300 ease-out sm:text-6xl",
                    ui.cheer ? "opacity-100" : "h-0 opacity-0",
                  )}
                  aria-live="polite"
                >
                  {ui.cheer}
                </p>
                <HintChips hints={ui.hints} />
                {ui.choices && ui.phase === "ask" && (
                  <AnswerChoices choices={ui.choices} disabled={ui.disabled} onPick={actions.pickChoice} />
                )}
              </main>
              <KidControls
                heard={ui.heard}
                listening={game.listening}
                micOff={micOff}
                onMic={actions.mic}
                onHint={actions.hint}
              />
            </>
          )}
        </div>
      )}

      {ui.screen === "start" && <StartScreen onStart={actions.start} onSettings={actions.openSettings} />}
      {ui.screen === "done" && <DoneScreen got={ui.got} onAgain={actions.again} onLevels={actions.toLevels} />}

      <SettingsSheet
        open={game.settingsOpen}
        onOpenChange={(open) => (open ? actions.openSettings() : actions.closeSettings())}
        settings={game.settings}
        voices={game.voices}
        mic={game.mic}
        local={game.local}
        onLevel={actions.changeLevel}
        onChange={actions.changeSetting}
        onTestVoice={actions.testVoice}
        onInstallLocal={() => void game.installLocal()}
        onNewTrip={actions.newTrip}
      />
    </div>
  );
}
