"use client";

import { Home, Plane } from "lucide-react";
import { memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";

import { flagUrl, HOME, MAP } from "./data";
import {
  arc,
  arcPath,
  bezier,
  countryBox,
  easeInOutCubic,
  fitBox,
  lerpView,
  tripView,
  worldView,
  type Screen,
} from "./mapView";
import type { Box, Country, View } from "./types";

type P = { x: number; y: number };

export type WorldMapHandle = {
  worldView: () => View;
  fitBox: (b: Box, minW?: number) => View;
  tripView: (b: Box) => View;
  countryBox: (f: Country) => Box;
  /** Animate the camera. Resolves when done (or when superseded). */
  animateTo: (to: View, ms: number) => Promise<void>;
  /** Slow pan behind the start screen; stops on the next animateTo. */
  drift: () => void;
  resetTrip: () => void;
  /** Fly the plane along an arc, drawing the route. */
  fly: (from: P, to: P, ms: number) => Promise<void>;
  /** Park the plane next to a point. */
  parkPlane: (at: P) => void;
  land: (f: Country) => void;
  ping: (f: Country | null) => void;
  /** Map point → px relative to the map container, for a given (or the current) view. */
  toScreen: (x: number, y: number, v?: View) => [number, number];
};

/** All land shapes, rendered once. */
const Land = memo(function Land() {
  return (
    <g className="fs-land">
      {Object.entries(MAP.shapes).map(([id, s]) => (
        <path key={id} d={s.d} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
});

type Pin = { code: string; x: number; y: number };

/**
 * SVG world map. The camera is the SVG viewBox, animated with
 * requestAnimationFrame through refs, never React state. Pins, plane and
 * ping live in an HTML layer positioned with toScreen() on every view change.
 */
export function WorldMap({ ref, reduced }: { ref: React.Ref<WorldMapHandle>; reduced: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const dotsRef = useRef<SVGRectElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const pingRef = useRef<HTMLDivElement>(null);
  const pinEls = useRef(new Map<string, HTMLDivElement>());

  const [pins, setPins] = useState<Pin[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [pingAt, setPingAt] = useState<{ key: number; x: number; y: number } | null>(null);

  const m = useRef({
    view: { x: 0, y: 0, w: MAP.W } as View,
    scr: { w: 1, h: 1 } as Screen,
    anim: 0,
    segs: [] as string[],
    live: "",
    plane: { x: HOME.x, y: HOME.y, a: -30 },
    pins: [] as Pin[],
    ping: null as P | null,
    drifting: false,
  });

  const measure = useCallback(() => {
    const r = boxRef.current?.getBoundingClientRect();
    m.current.scr = { w: r?.width || window.innerWidth, h: r?.height || window.innerHeight };
    return m.current.scr;
  }, []);

  const toScreen = useCallback((x: number, y: number, v?: View): [number, number] => {
    const s = m.current;
    const view = v ?? s.view;
    const k = s.scr.w / view.w;
    return [(x - view.x) * k, (y - view.y) * k];
  }, []);

  const layout = useCallback(() => {
    const s = m.current;
    const place = (el: HTMLElement | null, x: number, y: number, extra = "") => {
      if (!el) return;
      const [sx, sy] = toScreen(x, y);
      el.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)${extra}`;
    };
    place(pinEls.current.get("home") ?? null, HOME.x, HOME.y);
    for (const p of s.pins) place(pinEls.current.get(p.code) ?? null, p.x, p.y);
    place(planeRef.current, s.plane.x, s.plane.y, ` rotate(${s.plane.a.toFixed(1)}deg)`);
    if (s.ping) place(pingRef.current, s.ping.x, s.ping.y);
  }, [toScreen]);

  const apply = useCallback(() => {
    const s = m.current;
    const h = (s.view.w * s.scr.h) / s.scr.w;
    svgRef.current?.setAttribute(
      "viewBox",
      `${s.view.x.toFixed(2)} ${s.view.y.toFixed(2)} ${s.view.w.toFixed(2)} ${h.toFixed(2)}`,
    );
    // The dot grid fades out when zoomed in, where it would look coarse.
    if (dotsRef.current) {
      dotsRef.current.style.opacity = Math.max(0, Math.min(1, (s.view.w - 150) / 350)).toFixed(2);
    }
    layout();
  }, [layout]);

  const drawRoute = useCallback(() => {
    const s = m.current;
    routeRef.current?.setAttribute("d", s.segs.join("") + s.live || "M0 0");
  }, []);

  const animateTo = useCallback(
    (to: View, ms: number) => {
      const s = m.current;
      measure();
      s.anim++;
      s.drifting = false;
      const from = { ...s.view };
      if (reduced || !ms) {
        s.view = to;
        apply();
        return Promise.resolve();
      }
      const id = s.anim;
      const t0 = performance.now();
      const k = s.scr.h / s.scr.w;
      return new Promise<void>((resolve) => {
        const step = (now: number) => {
          if (id !== s.anim) return resolve();
          const t = Math.min(1, (now - t0) / ms);
          s.view = lerpView(from, to, easeInOutCubic(t), k);
          apply();
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    },
    [apply, measure, reduced],
  );

  const handle: WorldMapHandle = {
    worldView: () => worldView(measure(), HOME, MAP.W, MAP.H),
    fitBox: (b, minW) => fitBox(measure(), b, minW),
    tripView: (b) => tripView(measure(), b),
    countryBox: (f) => countryBox(f, f.pt.s ? MAP.shapes[f.pt.s]?.box ?? null : null),
    animateTo,
    drift: () => {
      const s = m.current;
      const base = worldView(measure(), HOME, MAP.W, MAP.H);
      s.anim++;
      if (reduced) {
        s.view = base;
        apply();
        return;
      }
      const id = s.anim;
      s.drifting = true;
      const t0 = performance.now();
      const step = (now: number) => {
        if (id !== s.anim || !s.drifting) return;
        const t = (now - t0) / 1000;
        s.view = { x: base.x + Math.sin(t * 0.08) * base.w * 0.22, y: base.y + Math.sin(t * 0.11) * 20, w: base.w * 0.82 };
        apply();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    resetTrip: () => {
      const s = m.current;
      s.segs = [];
      s.live = "";
      s.pins = [];
      s.ping = null;
      s.plane = { x: HOME.x, y: HOME.y, a: -30 };
      setPins([]);
      setVisited([]);
      setPingAt(null);
      drawRoute();
      layout();
    },
    fly: (p0, p1, ms) => {
      const s = m.current;
      const c = arc(p0, p1);
      if (reduced) {
        s.segs.push(arcPath(p0, c, p1, 1));
        s.live = "";
        s.plane = { ...s.plane, x: p1.x, y: p1.y };
        drawRoute();
        layout();
        return Promise.resolve();
      }
      const t0 = performance.now();
      return new Promise<void>((resolve) => {
        const step = (now: number) => {
          const t = Math.min(1, (now - t0) / ms);
          const e = easeInOutCubic(t);
          const b = bezier(p0, c, p1, e);
          const b2 = bezier(p0, c, p1, Math.min(1, e + 0.01));
          // lucide Plane points up-right (45°); rotate to the direction of travel.
          const a = e < 0.99 ? (Math.atan2(b2.y - b.y, b2.x - b.x) * 180) / Math.PI + 45 : s.plane.a;
          s.plane = { x: b.x, y: b.y, a };
          s.live = arcPath(p0, c, p1, e);
          drawRoute();
          layout();
          if (t < 1) requestAnimationFrame(step);
          else {
            s.segs.push(arcPath(p0, c, p1, 1));
            s.live = "";
            drawRoute();
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    },
    parkPlane: (at) => {
      const s = m.current;
      const k = s.scr.w / s.view.w;
      s.plane = { x: at.x + 22 / k, y: at.y - 6 / k, a: s.plane.a };
      layout();
    },
    land: (f) => {
      const s = m.current;
      const pin = { code: f.c, x: f.pt.x, y: f.pt.y };
      s.pins = [...s.pins, pin];
      setPins(s.pins);
      if (f.pt.s) setVisited((v) => [...v, f.pt.s!]);
    },
    ping: (f) => {
      const s = m.current;
      s.ping = f ? { x: f.pt.x, y: f.pt.y } : null;
      setPingAt(f ? { key: performance.now(), x: f.pt.x, y: f.pt.y } : null);
    },
    toScreen,
  };
  useImperativeHandle(ref, () => handle);

  // Position newly rendered pins / ping immediately.
  useLayoutEffect(() => {
    layout();
  }, [pins, pingAt, layout]);

  useEffect(() => {
    measure();
    m.current.view = worldView(m.current.scr, HOME, MAP.W, MAP.H);
    apply();
    const onResize = () => {
      measure();
      apply();
    };
    const ro = new ResizeObserver(onResize);
    if (boxRef.current) ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, [apply, measure]);

  return (
    <div ref={boxRef} className="absolute inset-0 overflow-hidden bg-(--map-sea)" aria-hidden="true">
      <svg ref={svgRef} className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="fs-dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="0.55" className="fill-(--map-dot)" />
          </pattern>
          <clipPath id="fs-sphere">
            <path d={MAP.sphere} />
          </clipPath>
        </defs>
        <rect
          ref={dotsRef}
          x="0"
          y="0"
          width={MAP.W}
          height={MAP.H}
          fill="url(#fs-dots)"
          clipPath="url(#fs-sphere)"
        />
        <Land />
        <g className="fs-visited">
          {visited.map((id, i) => (
            <path key={`${id}-${i}`} d={MAP.shapes[id]?.d} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
        <path ref={routeRef} className="fs-route" vectorEffect="non-scaling-stroke" d="M0 0" />
      </svg>

      <div className="pointer-events-none absolute inset-0">
        <div
          ref={(el) => {
            if (el) pinEls.current.set("home", el);
          }}
          className="absolute top-0 left-0"
        >
          <div className="flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background ring-1 ring-border">
            <Home className="size-3.5 text-foreground" />
          </div>
        </div>
        {pins.map((p) => (
          <div
            key={p.code}
            ref={(el) => {
              if (el) pinEls.current.set(p.code, el);
              else pinEls.current.delete(p.code);
            }}
            className="absolute top-0 left-0"
          >
            <div className="fs-pop flex -translate-x-1/2 -translate-y-[calc(100%+3px)] flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- static flag SVG */}
              <img
                src={flagUrl(p.code)}
                alt=""
                className="size-7 rounded-full object-cover shadow-sm ring-1 ring-background"
              />
            </div>
            <div className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--map-visited)" />
          </div>
        ))}
        {pingAt && (
          <div ref={pingRef} key={pingAt.key} className="absolute top-0 left-0">
            <div className="fs-ring-loop absolute top-0 left-0 size-24 rounded-full border-2 border-(--map-visited)" />
          </div>
        )}
        <div ref={planeRef} className="absolute top-0 left-0">
          <Plane className="size-6 -translate-x-1/2 -translate-y-1/2 fill-foreground text-foreground drop-shadow" />
        </div>
      </div>
    </div>
  );
}
