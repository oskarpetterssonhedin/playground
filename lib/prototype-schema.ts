import { z } from "zod";

/** Slugs are kebab-case: lowercase letters, digits, single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Shape of app/prototypes/<slug>/metadata.json. Unknown keys are rejected. */
export const prototypeMetadataSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    tags: z.array(z.string().trim().min(1)),
    createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "createdAt must be YYYY-MM-DD"),
    updatedAt: z.iso.datetime({ offset: true, message: "updatedAt must be an ISO timestamp" }),
    hidden: z.boolean(),
    public: z.boolean(),
  })
  .strict();

export type PrototypeMetadata = z.infer<typeof prototypeMetadataSchema>;

export type PrototypeThumbnails = {
  /** URL (with cache-busting query) or null when not captured yet. */
  light: string | null;
  dark: string | null;
  /** 1200×630 JPEG cropped from the dark capture, used as og:image. */
  og: string | null;
};

export type Prototype = PrototypeMetadata & {
  slug: string;
  thumbnails: PrototypeThumbnails;
};
