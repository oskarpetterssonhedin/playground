import type { Prototype } from "@/lib/prototype-schema";

export type GalleryFilter = {
  query: string;
  tag: string | null;
  showHidden: boolean;
};

/** Pure filter: hidden toggle, tag, then case-insensitive match on title/description/tags. */
export function filterPrototypes(list: Prototype[], { query, tag, showHidden }: GalleryFilter): Prototype[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter((p) => {
    if (p.hidden && !showHidden) return false;
    if (tag && !p.tags.includes(tag)) return false;
    if (!terms.length) return true;
    const haystack = [p.title, p.description, ...p.tags].join(" ").toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}

/** Every tag in use, alphabetical. */
export function uniqueTags(list: Prototype[]): string[] {
  return [...new Set(list.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b));
}
