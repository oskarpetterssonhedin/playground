import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { Prototype } from "@/lib/prototype-schema";

import { Thumbnail } from "./thumbnail";

export function PrototypeCard({ prototype }: { prototype: Prototype }) {
  const { slug, title, description, tags, hidden, updatedAt } = prototype;
  return (
    <Link
      href={`/prototypes/${slug}`}
      className="group block overflow-hidden rounded-xl border bg-card text-card-foreground transition-colors duration-200 ease-out hover:border-foreground/20 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Thumbnail thumbnails={prototype.thumbnails} title={title} />
      <div className="space-y-2 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="truncate font-medium">{title}</h2>
          <time dateTime={updatedAt} className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {updatedAt.slice(0, 10)}
          </time>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
        {(tags.length > 0 || hidden || prototype.public) && (
          <div className="flex flex-wrap gap-1.5">
            {prototype.public && <Badge variant="secondary">Public</Badge>}
            {hidden && <Badge variant="secondary">Hidden</Badge>}
            {tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
