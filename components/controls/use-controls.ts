"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getDefaults, randomizeValues, sanitizeValues } from "./logic";
import type { ControlSchema, ControlValues } from "./types";

export type Controls<S extends ControlSchema> = {
  slug: string;
  schema: S;
  values: ControlValues<S>;
  set: <K extends keyof S>(key: K, value: ControlValues<S>[K]) => void;
  reset: () => void;
  randomize: () => void;
};

function storageKey(slug: string) {
  return `${slug}:controls`;
}

function save(slug: string, values: unknown) {
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(values));
  } catch {
    // Quota exceeded or storage unavailable: values still work in memory.
  }
}

/**
 * Typed control values with localStorage persistence (`<slug>:controls`).
 * Renders defaults on the server and first paint, then loads stored values on
 * mount. Pass the returned object to <ControlsLayout controls={...}>.
 *
 *   const controls = useControls("my-slug", schema);
 *   controls.values.speed // number
 */
export function useControls<const S extends ControlSchema>(slug: string, schema: S): Controls<S> {
  const [values, setValues] = useState<ControlValues<S>>(() => getDefaults(schema));
  const schemaRef = useRef(schema);
  const valuesRef = useRef(values);

  // Load once on mount (never during server render).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(slug));
      if (raw) {
        const stored = sanitizeValues(schemaRef.current, JSON.parse(raw));
        valuesRef.current = stored;
        setValues(stored);
      }
    } catch {
      // Corrupt JSON or storage unavailable (private mode): keep defaults.
    }
  }, [slug]);

  // Writes happen only on user actions, so mounting can never clobber storage.
  const commit = useCallback(
    (next: ControlValues<S>) => {
      valuesRef.current = next;
      setValues(next);
      save(slug, next);
    },
    [slug],
  );

  const set = useCallback(
    <K extends keyof S>(key: K, value: ControlValues<S>[K]) => commit({ ...valuesRef.current, [key]: value }),
    [commit],
  );
  const reset = useCallback(() => commit(getDefaults(schemaRef.current)), [commit]);
  const randomize = useCallback(
    () => commit(randomizeValues(schemaRef.current, valuesRef.current)),
    [commit],
  );

  return { slug, schema, values, set, reset, randomize };
}
