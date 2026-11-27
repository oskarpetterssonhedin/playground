"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { LEVELS } from "./data";
import type { LevelId, Settings } from "./types";
import type { LocalState, MicState } from "./useSpeechInput";
import { NO_VOICE, voiceScore } from "./useSpeechOutput";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  voices: SpeechSynthesisVoice[];
  mic: MicState;
  local: LocalState;
  onLevel: (l: LevelId) => void;
  onChange: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  onTestVoice: () => void;
  onInstallLocal: () => void;
  onNewTrip: () => void;
};

const MIC_TEXT: Record<MicState, string> = {
  unknown: "Inte testad än",
  ok: "Mikrofonen fungerar",
  tap: "Mikrofonen fungerar. Tryck på Prata inför varje svar.",
  blocked: "Mikrofonen är avstängd",
  unsupported: "Webbläsaren kan inte lyssna",
};

const LOCAL_TEXT: Partial<Record<LocalState, string>> = {
  available: "Svensk taligenkänning finns i datorn. Spelet förstår landsnamnen bättre.",
  downloadable: "Datorn kan ladda ner svensk taligenkänning som förstår landsnamnen bättre.",
  downloading: "Laddar ner svensk taligenkänning…",
  unavailable: "Datorn har ingen egen svensk taligenkänning. Spelet använder webbläsarens.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t pt-5">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  );
}

/** "Vuxen" panel: level, answer mode, voice, microphone, new trip. */
export function SettingsSheet(p: Props) {
  const mobile = useIsMobile();
  const { settings: s } = p;
  const best = p.voices[0] ? voiceScore(p.voices[0]) : -1;
  const voiceValue = s.voice && (s.voice === NO_VOICE || p.voices.some((v) => v.voiceURI === s.voice)) ? s.voice : p.voices[0]?.voiceURI ?? NO_VOICE;

  return (
    <Sheet open={p.open} onOpenChange={p.onOpenChange}>
      <SheetContent side={mobile ? "bottom" : "right"} className={cn("gap-0 overflow-y-auto", mobile && "max-h-[85dvh] rounded-t-3xl")}>
        <SheetHeader>
          <SheetTitle>Vuxen</SheetTitle>
          <SheetDescription>Kortkommandon: R rätt, L ledtråd, N hoppa över.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Nivå</h3>
            <div className="grid grid-cols-4 gap-1.5">
              {LEVELS.map((L) => (
                <Button key={L.id} variant={s.level === L.id ? "default" : "outline"} className="h-11" onClick={() => p.onLevel(L.id)} aria-pressed={s.level === L.id}>
                  {L.name}
                </Button>
              ))}
            </div>
          </section>

          <Section title="Svar">
            <Label htmlFor="fs-always" className="flex min-h-11 cursor-pointer items-start gap-3 font-normal leading-snug">
              <Checkbox id="fs-always" className="mt-0.5" checked={s.alwaysChoices} onCheckedChange={(v) => p.onChange("alwaysChoices", v === true)} />
              Visa alltid tre svar att välja mellan. Rekommenderas för en fyraåring.
            </Label>
          </Section>

          <Section title="Röst">
            <div className="flex gap-2">
              <Select value={voiceValue} onValueChange={(v) => p.onChange("voice", v)}>
                <SelectTrigger className="h-11! min-w-0 flex-1" aria-label="Välj röst">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {p.voices.map((v) => (
                    <SelectItem key={v.voiceURI} value={v.voiceURI} className="min-h-11">
                      {v.name}
                      {voiceScore(v) >= 2 ? " (bäst)" : ""}
                    </SelectItem>
                  ))}
                  <SelectItem value={NO_VOICE} className="min-h-11">
                    Ingen röst, en vuxen läser
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-11" onClick={p.onTestVoice}>
                Testa
              </Button>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <Label htmlFor="fs-rate">Tempo</Label>
                <span className="text-muted-foreground tabular-nums">{s.rate.toFixed(2)}</span>
              </div>
              <Slider id="fs-rate" className="h-11" min={0.7} max={1.1} step={0.05} value={[s.rate]} onValueChange={([v]) => p.onChange("rate", v)} />
            </div>
            <p className="text-sm text-muted-foreground">
              {!p.voices.length
                ? "Den här webbläsaren har ingen svensk röst. Texten visas på skärmen istället."
                : best >= 2
                  ? "Rösterna märkta \"bäst\" låter mest naturligt."
                  : "För en mjukare röst på Mac: ladda ner Alva (Premium) under System Settings, Accessibility, Read & Speak, System Voice."}
            </p>
          </Section>

          <Section title="Mikrofon">
            <p className="flex items-center gap-2 text-sm">
              <span className={cn("size-2 rounded-full", p.mic === "ok" || p.mic === "tap" ? "bg-(--success)" : p.mic === "unknown" ? "bg-muted-foreground" : "bg-destructive")} />
              {MIC_TEXT[p.mic]}
            </p>
            {p.local && LOCAL_TEXT[p.local] && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{LOCAL_TEXT[p.local]}</p>
                {p.local === "downloadable" && (
                  <Button variant="outline" className="h-11 shrink-0" onClick={p.onInstallLocal}>
                    Ladda ner
                  </Button>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Tillåt mikrofonen när webbläsaren frågar. Fungerar bäst i Chrome. Sitt nära, håll det tyst och låt barnet säga bara landet. På iPhone och iPad: tryck på Prata och säg landet. Fungerar det ändå inte, slå på Diktering under Inställningar, Allmänt, Tangentbord.
            </p>
          </Section>

          <Section title="Ny resa">
            <Button className="h-11 w-full" onClick={p.onNewTrip}>
              Ny resa
            </Button>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
