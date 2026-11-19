import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

type Props = {
  title?: string;
  /** Show the back link to the gallery (private routes only). */
  backHref?: string;
  children: React.ReactNode;
};

/**
 * Chrome around every prototype: a slim header, then a flex column that fills
 * the rest of the viewport. Full-bleed prototypes use `flex-1` (plus
 * `relative`/`absolute inset-0` for canvases) to fill it. Elements marked
 * `data-chrome` are hidden during thumbnail capture.
 */
export function PrototypeShell({ title, backHref, children }: Props) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header data-chrome className="flex h-12 shrink-0 items-center gap-1 border-b px-1 sm:px-2">
        {backHref ? (
          <Button asChild variant="ghost" size="icon" className="size-11">
            <Link href={backHref} aria-label="All prototypes">
              <ArrowLeft />
            </Link>
          </Button>
        ) : (
          <span className="w-2" />
        )}
        <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h1>
        <ThemeToggle />
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
