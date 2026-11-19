import type { PrototypeThumbnails } from "@/lib/prototype-schema";

/**
 * Static light + dark screenshots, switched purely with `dark:` classes so
 * there is no flash. `loading="lazy"` means the hidden variant is never fetched.
 * Never replace this with a live iframe: dozens of embeds crash mobile browsers.
 */
export function Thumbnail({ thumbnails, title }: { thumbnails: PrototypeThumbnails; title: string }) {
  // If only one variant exists, use it for both themes.
  const light = thumbnails.light ?? thumbnails.dark;
  const dark = thumbnails.dark ?? thumbnails.light;
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
      {light && dark ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-compressed static asset */}
          <img
            src={light}
            alt={title}
            width={1200}
            height={750}
            loading="lazy"
            decoding="async"
            className="size-full object-cover dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-compressed static asset */}
          <img
            src={dark}
            alt={title}
            width={1200}
            height={750}
            loading="lazy"
            decoding="async"
            className="hidden size-full object-cover dark:block"
          />
        </>
      ) : (
        <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
          No preview yet
        </div>
      )}
    </div>
  );
}
