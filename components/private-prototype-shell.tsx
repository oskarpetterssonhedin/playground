"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { PrototypeShell } from "@/components/prototype-shell";

/** Shell for /prototypes/<slug>: resolves the title from the URL. */
export function PrivatePrototypeShell({
  titles,
  children,
}: {
  titles: Record<string, string>;
  children: React.ReactNode;
}) {
  const slug = usePathname().split("/")[2] ?? "";
  const title = titles[slug];

  useEffect(() => {
    if (title) document.title = `${title} · Playground`;
  }, [title]);

  return (
    <PrototypeShell title={title} backHref="/">
      {children}
    </PrototypeShell>
  );
}
