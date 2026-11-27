# Ted och Adams flaggspel

## What It Does

A voice-driven flag quiz for two small kids. A flag appears, the kids say the country, and on a right answer a little plane flies there on a world map, the country lights up and a flag pin is placed. After ten flags the whole trip is shown.

## Architecture

```
StartScreen ──level tap (unlocks audio + mic)──► useGame.start()
                                                     │
            ┌────────────────────────────────────────┤ mutable game ref (turn, round, deck, …)
            │                                        │ publish() → React state for rendering
            ▼                                        ▼
  useSpeechOutput.say() ──mute()──► useSpeechInput   game.ts (deck, choices, hint steps, lines)
   (sv-SE TTS, caption fallback)     │ fresh SpeechRecognition per listen, same mic track
                                     │ onResult(fin, mid)
                                     ▼
                       matching.ts judgeFree / judgeChoices
                                     │ right / wrong / hint / skip / notUnderstood
                                     ▼
                       win(): card flies → WorldMap.animateTo (viewBox, rAF, refs)
                              → WorldMap.fly (arc + route) → land (pin, visited) → nextFlag()
```

## Frontend

- **Flow** (brief §2): start → 10 questions → done. Right answer: check badge + chord (0 ms), name + camera zoom + card flies to the country (650 ms, 1000 ms), plane flight `min(2200, 900 + dist × 4)` ms, then pin, progress dot, 700 ms, next. Wrong: shake + low tones + spoken correction (part-of / has-part / plain). Two wrongs or two "didn't hear" → three choices. Hints step through continent (camera zooms there), first letter, choices, fun fact (or first syllable), answer (country pulses).
- **State**: `useGame.ts` keeps the game in a ref so async steps see current values, and copies it into React state with `publish()`. Every async step captures `turn`/`round` and stops if the game moved on (new flag, new round, back to start).
- **Speech in** (`useSpeechInput.ts`): mic opened once per game (`echoCancellation`, no `noiseSuppression`), every session started on that track (`start(track)`, falls back to `start()`), a fresh recognizer per listen with stale events ignored, never listening while speaking (restart 250 ms after speech), `sv-SE`, continuous, interim, 10 alternatives, auto-restart 200 ms after `onend`. On-device recognition with boosted phrases (3, or 6 for the three choices) when `available()` says so; "Ladda ner" in the Vuxen panel when `downloadable`. `not-allowed` → mic off, choices on every question. `audio-capture` on the track → retry without it.
- **Speech out** (`useSpeechOutput.ts`): Swedish voices sorted natural/neural/online, premium/enhanced/Siri, Google, rest; the two best groups marked "(bäst)". "Ingen röst, en vuxen läser" shows a caption instead. Fallback timer 2.5 s + 110 ms/char.
- **Map** (`WorldMap.tsx`, `mapView.ts`): SVG with a viewBox camera animated by `requestAnimationFrame` through refs (log width, linear center, ease-in-out). Pins, plane and ping live in an HTML layer placed with `toScreen()` on every view change. Dot grid over the sea fades out when zoomed in.
- **Shortcuts**: R right, L hint, N skip. Tap the flag to hear the question again.
- **Responsive**: full-bleed under the playground header. Top bar icons-only below `sm`. Kid buttons keep their labels on all sizes. Choices stack on mobile, sit in a row from `sm`. The flag card shrinks when choices are shown and caps its height for tall flags.
- **Motion**: decelerating curves only. `prefers-reduced-motion`: camera jumps, no flight or card fly, no particles.
- **Settings** (Vuxen sheet, right on desktop, bottom on mobile): level, always three choices, voice + test + tempo, mic status + on-device recognition, new trip. Saved as `flaggspel:level|voice|rate|alwaysChoices`.

## Public

Public since 2026-11-27 (Oskar asked): `/p/flaggspel` works without the password, with og:title/description from metadata and `flaggspel-og.jpg` as og:image. Flags load from `/assets/`, which is outside the gate.

## Approved Exceptions to CLAUDE.md

1. **Full screen** instead of `max-w-2xl`.
2. **Kid buttons keep text labels on mobile** ("Prata"/"Jag lyssnar", "Ledtråd").
3. **No control panel / Randomize**: the Vuxen panel is settings, not tunable parameters.
4. **Flags in `public/assets/flaggspel/flags/`**, shown with `<img>`. `proxy.ts` excludes `/assets/` from the password gate so the public link shows them.

Also: particle colors in the celebration come from the flag SVG's own fills (data, not design colors), set inline.

## Key Dependencies

- Web Speech API (SpeechRecognition, speechSynthesis), Web Audio API, Web Animations API
- `components/ui`: Button, Sheet, Select, Slider, Checkbox, Label
- `lucide-react` icons (Plane, Mic, Lightbulb, …)

## Component Tree

```
page.tsx (dynamic, ssr: false)
└── Game
    ├── WorldMap (SVG + pins/plane/ping layer)
    ├── Celebration (ring + particles at the country)
    ├── TopBar (progress dots, Rätt / Hoppa över / Vuxen)
    ├── FlagCard
    ├── HintChips
    ├── AnswerChoices
    ├── KidControls (mic, hint, "Jag hörde: …")
    ├── StartScreen / DoneScreen
    └── SettingsSheet
```

## Error Handling

- Every optional browser API (on-device recognition, phrases, `start(track)`, voices, AudioContext, `animate`) is feature-detected inside try/catch. The game is always playable with taps alone.
- `SpeechRecognition.available()` is only called after a tap (start or Vuxen), capped at 1.5 s: it crashed headless Chromium's renderer on page load.
- Wrong answers and "didn't hear" are throttled to one per 2.5 s. More than four words or under two letters is ignored (adults talking).
- localStorage access is wrapped and read on mount; invalid values fall back to defaults.

## Tests

`pnpm test` runs `matching.test.ts`: every case in `data/matching-cases.json` (41 free answers, 4 with choices).

## File Structure

```
flaggspel/
├── page.tsx              loads Game on the client
├── Game.tsx              layout + keyboard shortcuts
├── useGame.ts            game flow (ported from the reference)
├── useSpeechInput.ts     recognition, mic track, on-device phrases
├── useSpeechOutput.ts    TTS, voice ranking, caption fallback
├── game.ts               deck, choices, hint steps, lines (pure)
├── matching.ts           norm, phon, lev, judging (pure) + matching.test.ts
├── mapView.ts            camera math (pure)
├── data.ts               countries, map, levels, lines, timings
├── types.ts, storage.ts, sound.ts, flaggspel.css
├── WorldMap.tsx FlagCard.tsx Celebration.tsx AnswerChoices.tsx HintChips.tsx
├── KidControls.tsx TopBar.tsx StartScreen.tsx DoneScreen.tsx SettingsSheet.tsx
└── data/ countries.json, map.json, matching-cases.json
public/assets/flaggspel/flags/<code>.svg
```
