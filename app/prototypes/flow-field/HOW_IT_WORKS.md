# Flow Field

## What It Does

Thousands of particles follow a procedural vector field and leave fading trails on a full-bleed canvas. Every parameter is tunable from the shared control panel.

## Architecture

```
useControls("flow-field", controlSchema) ──► values (persisted in localStorage)
        │
        ▼
ControlsLayout ── side panel (md+) / bottom sheet (mobile)
        │
        ▼
ParticleCanvas ── settingsRef (read every frame, no re-init on change)
        │            │
        │            ▼
        │   requestAnimationFrame loop
        │     field.ts: resize() → step() → fieldAngle()
        │            │
        ▼            ▼
useThemeColors(tokens) ──► canvas fill/stroke colors (re-init on theme change)
```

## Frontend

- **State**: control values live in `useControls` (key `flow-field:controls`). The canvas keeps particles in a local array and reads the latest settings through a ref, so tuning never resets the simulation.
- **Controls**: particles, speed, field scale, trail, size, pattern (flow / swirl / grid), color token, animate.
- **Theme**: stroke colors come from CSS variables (`--chart-*`, `--foreground`, …) via `useThemeColors`; the canvas is transparent over `bg-background`. Trails fade with `destination-out` so no gray residue builds up. Switching theme restarts the trails.
- **Responsive**: the canvas fills the subject area and re-initializes on resize (ResizeObserver). Device pixel ratio is capped at 2. On mobile the panel is a bottom sheet opened from the floating button.
- **Motion**: with `prefers-reduced-motion`, or when Animate is off, the canvas shows a still frame made of 120 pre-simulated steps.

## Key Dependencies

- `components/controls` (shared control panel)
- `lib/theme-colors.ts` (token → RGBA for canvas)

## Component Tree

```
FlowFieldPage (page.tsx)
└── ControlsLayout
    ├── ParticleCanvas
    └── ControlPanel (aside on md+, Drawer on mobile)
```

## Error Handling

- If the 2D context is unavailable the effect exits and the token-colored background stays visible.
- Stored control values are validated against the schema on load; invalid or unknown entries fall back to defaults.

## File Structure

```
flow-field/
├── page.tsx             thin composition
├── data.ts              slug, control schema, constants
├── types.ts             Particle, FieldSettings
├── field.ts             pure simulation (angle field, spawn, step)
├── particle-canvas.tsx  canvas + animation loop
├── metadata.json
└── HOW_IT_WORKS.md
```
