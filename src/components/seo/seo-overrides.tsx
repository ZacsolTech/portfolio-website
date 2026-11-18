import { jsonLdScript } from "@/lib/seo";
import { getSeoOverride } from "@/lib/seo-overrides";

/**
 * Structured data set for this page from ZACBOS, one script tag per block.
 * Renders nothing when the page has no override.
 */
export async function SeoJsonLd({ page }: { page: string }) {
  const seo = await getSeoOverride(page);
  if (!seo?.schema.length) return null;
  return (
    <>
      {seo.schema.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(block) }}
        />
      ))}
    </>
  );
}
