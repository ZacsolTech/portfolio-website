import type { CollectionSlug } from "payload";

const collectionPaths: Record<string, (slug: string) => string> = {
  insights: (slug) => `/insights/${slug}`,
};

export function getCollectionFrontPath(
  collection: string,
  slug: string,
): string | null {
  const builder = collectionPaths[collection];
  return builder ? builder(slug) : null;
}

/** Absolute or relative preview entry URL used by Payload admin Preview / Live Preview. */
export function generatePreviewPath({
  collection,
  slug,
}: {
  collection: CollectionSlug | string;
  slug: string;
}): string | null {
  if (!slug) return null;

  const path = getCollectionFrontPath(String(collection), slug);
  if (!path) return null;

  const params = new URLSearchParams({
    path,
    collection: String(collection),
    slug,
    previewSecret: process.env.PREVIEW_SECRET || "",
  });

  // Relative URL — Payload resolves against its serverURL / current origin
  return `/api/preview?${params.toString()}`;
}

export function previewCollectionConfig(collection: string) {
  return {
    preview: (doc: { slug?: unknown }) => {
      const slug = typeof doc?.slug === "string" ? doc.slug : "";
      return generatePreviewPath({ collection, slug });
    },
    livePreview: {
      url: ({ data }: { data: { slug?: unknown } }) => {
        const slug = typeof data?.slug === "string" ? data.slug : "";
        return generatePreviewPath({ collection, slug });
      },
    },
  };
}

export const draftVersions = {
  drafts: {
    autosave: {
      interval: 800,
    },
  },
} as const;
