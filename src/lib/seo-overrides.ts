import type { Metadata } from "next";
import { cache } from "react";
import { absoluteUrl } from "@/lib/seo";

/**
 * Read side of the SEO overrides ZACBOS writes (collections/Seo.ts).
 *
 * Every lookup fails soft: if the database is unreachable or the migration has
 * not run yet, pages render with their own metadata exactly as before.
 */

export type SeoOverride = {
  metaTitle?: string;
  metaDescription?: string;
  canonical?: string;
  noindex: boolean;
  schema: Record<string, unknown>[];
};

type SeoRow = {
  pageId?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonical?: string | null;
  noindex?: boolean | null;
  schema?: unknown;
};

async function payloadClient() {
  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  return getPayload({ config });
}

let warned = false;
function warnOnce(error: unknown) {
  if (warned) return;
  warned = true;
  console.warn("[seo-overrides] lookup failed, using page defaults:", error instanceof Error ? error.message : error);
}

export function schemaBlocks(value: unknown): Record<string, unknown>[] {
  const list = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
  return list.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item));
}

export function toOverride(row: SeoRow): SeoOverride {
  return {
    metaTitle: row.metaTitle?.trim() || undefined,
    metaDescription: row.metaDescription?.trim() || undefined,
    canonical: row.canonical?.trim() || undefined,
    noindex: Boolean(row.noindex),
    schema: schemaBlocks(row.schema),
  };
}

/** The override for one page id ("/about", "post:12"), or null. Deduped per request. */
export const getSeoOverride = cache(async (pageId: string): Promise<SeoOverride | null> => {
  try {
    const payload = await payloadClient();
    const result = await payload.find({
      collection: "seo",
      where: { pageId: { equals: pageId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    } as never);
    const row = result.docs[0] as SeoRow | undefined;
    return row ? toOverride(row) : null;
  } catch (error) {
    warnOnce(error);
    return null;
  }
});

/** Page ids set to noindex — the sitemap leaves these out. */
export async function getNoindexPageIds(): Promise<Set<string>> {
  try {
    const payload = await payloadClient();
    const result = await payload.find({
      collection: "seo",
      where: { noindex: { equals: true } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    } as never);
    return new Set((result.docs as SeoRow[]).map((row) => String(row.pageId ?? "")));
  } catch (error) {
    warnOnce(error);
    return new Set();
  }
}

/**
 * Apply a page's override on top of the metadata it builds for itself:
 *   title: meta_title || title, description: meta_description || description,
 *   canonical: canonical || own url, robots: noindex ? { index: false } : own.
 */
export async function withSeo(pageId: string, base: Metadata): Promise<Metadata> {
  const seo = await getSeoOverride(pageId);
  if (!seo) return base;

  const next: Metadata = { ...base };
  if (seo.metaTitle) {
    next.title = { absolute: seo.metaTitle };
    if (next.openGraph) next.openGraph = { ...next.openGraph, title: seo.metaTitle };
    if (next.twitter) next.twitter = { ...next.twitter, title: seo.metaTitle };
  }
  if (seo.metaDescription) {
    next.description = seo.metaDescription;
    if (next.openGraph) next.openGraph = { ...next.openGraph, description: seo.metaDescription };
    if (next.twitter) next.twitter = { ...next.twitter, description: seo.metaDescription };
  }
  if (seo.canonical) {
    const canonical = seo.canonical.startsWith("/") ? absoluteUrl(seo.canonical) : seo.canonical;
    next.alternates = { ...next.alternates, canonical };
  }
  if (seo.noindex) {
    next.robots = { index: false, follow: true, googleBot: { index: false, follow: true } };
  }
  return next;
}
