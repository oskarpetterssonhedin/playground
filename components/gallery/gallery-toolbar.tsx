"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import type { GalleryFilter } from "./filter";

type Props = {
  filter: GalleryFilter;
  tags: string[];
  hiddenCount: number;
  onChange: (next: GalleryFilter) => void;
};

export function GalleryToolbar({ filter, tags, hiddenCount, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={filter.query}
            onChange={(e) => onChange({ ...filter, query: e.target.value })}
            placeholder="Search"
            aria-label="Search prototypes"
            className="h-11 pl-9"
          />
        </div>
        {hiddenCount > 0 && (
          <Label className="flex h-11 shrink-0 cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={filter.showHidden}
              onCheckedChange={(showHidden) => onChange({ ...filter, showHidden })}
            />
            <span className="hidden sm:inline">Show hidden</span>
            <span className="sm:hidden">Hidden</span>
          </Label>
        )}
      </div>
      {tags.length > 0 && (
        <ToggleGroup
          type="single"
          variant="outline"
          value={filter.tag ?? ""}
          onValueChange={(tag) => onChange({ ...filter, tag: tag || null })}
          className="flex w-full flex-wrap justify-start gap-1.5 rounded-none shadow-none"
          aria-label="Filter by tag"
        >
          {tags.map((tag) => (
            <ToggleGroupItem
              key={tag}
              value={tag}
              className="h-9 flex-none rounded-full! border px-3 text-xs data-[spacing=0]:border-l"
            >
              {tag}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    </div>
  );
}
