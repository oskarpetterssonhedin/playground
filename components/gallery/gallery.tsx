"use client";

import { useState } from "react";

import type { Prototype } from "@/lib/prototype-schema";

import { filterPrototypes, uniqueTags, type GalleryFilter } from "./filter";
import { GalleryToolbar } from "./gallery-toolbar";
import { PrototypeCard } from "./prototype-card";

export function Gallery({ prototypes }: { prototypes: Prototype[] }) {
  const [filter, setFilter] = useState<GalleryFilter>({ query: "", tag: null, showHidden: false });

  const tags = uniqueTags(filter.showHidden ? prototypes : prototypes.filter((p) => !p.hidden));
  const results = filterPrototypes(prototypes, filter);
  const hiddenCount = prototypes.filter((p) => p.hidden).length;

  return (
    <div className="space-y-6">
      <GalleryToolbar filter={filter} tags={tags} hiddenCount={hiddenCount} onChange={setFilter} />
      {results.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <li key={p.slug} className="animate-in fade-in duration-300 ease-out">
              <PrototypeCard prototype={p} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {prototypes.length ? "Nothing matches." : "No prototypes yet."}
        </p>
      )}
    </div>
  );
}
