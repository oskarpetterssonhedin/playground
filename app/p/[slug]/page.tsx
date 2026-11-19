import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrototypeShell } from "@/components/prototype-shell";
import { publicLoaders } from "@/lib/loaders.generated";
import { getPublicPrototype, getPublicSlugs } from "@/lib/prototypes";

// Only slugs flagged `"public": true` are generated; anything else is a 404
// (never a login redirect, so private names don't leak).
export const dynamicParams = false;

export function generateStaticParams() {
  return getPublicSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const prototype = getPublicPrototype((await params).slug);
  if (!prototype) return {};
  const { title, description, thumbnails } = prototype;
  const images = thumbnails.og ? [{ url: thumbnails.og, width: 1200, height: 630, alt: title }] : [];
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images },
    twitter: { card: images.length ? "summary_large_image" : "summary", title, description },
  };
}

export default async function PublicPrototypePage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const prototype = getPublicPrototype(slug);
  const load = publicLoaders[slug];
  if (!prototype || !load) notFound();

  const { default: Prototype } = await load();
  return (
    <PrototypeShell title={prototype.title}>
      <Prototype />
    </PrototypeShell>
  );
}
