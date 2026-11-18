import type { CollectionConfig } from "payload";
import { isLoggedIn } from "@/lib/access";

/**
 * SEO overrides, one row per public page, written by ZACBOS (lib/zacbos.ts).
 *
 * Most pages on this site are code, not CMS rows, so the overrides live here
 * keyed by a stable page id rather than as columns on a content table:
 *   "/", "/about", "/services/web-apps" … — fixed routes, keyed by path
 *   "post:12"                            — blog posts, keyed by row id so a
 *                                          slug change keeps its overrides
 *
 * Every field is optional: an empty field means "use the page's own value".
 * Public rendering reads this with overrideAccess (lib/seo-overrides.ts).
 */
export const Seo: CollectionConfig = {
  slug: "seo",
  labels: { singular: "SEO override", plural: "SEO overrides" },
  admin: {
    useAsTitle: "pageId",
    defaultColumns: ["pageId", "metaTitle", "noindex", "updatedAt"],
    group: "SEO",
    description:
      "Titles, descriptions, canonicals and structured data set from ZACBOS. Blank fields fall back to the page's own values.",
  },
  access: {
    read: isLoggedIn,
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  fields: [
    {
      name: "pageId",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "Page",
      admin: { description: 'A path such as "/about", or "post:<id>" for a blog post.' },
    },
    { name: "metaTitle", type: "text", label: "SEO title" },
    { name: "metaDescription", type: "textarea", label: "Meta description" },
    { name: "canonical", type: "text", label: "Canonical URL" },
    {
      name: "noindex",
      type: "checkbox",
      defaultValue: false,
      label: "Hide from search engines (noindex)",
    },
    {
      name: "schema",
      type: "json",
      label: "Structured data (JSON-LD)",
      admin: { description: "An array of JSON-LD objects. Each is printed as its own script tag." },
    },
  ],
  timestamps: true,
};
