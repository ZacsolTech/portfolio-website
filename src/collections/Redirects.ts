import type { CollectionConfig } from "payload";
import { isLoggedIn } from "@/lib/access";
/**
 * Redirects managed from ZACBOS (or by hand here). Applied by src/proxy.ts,
 * which caches the table for a minute per server instance.
 *
 * Code-level redirects in next.config.ts run first and win on a clash; these
 * are for moves decided after deploy, without a code change.
 */
export const Redirects: CollectionConfig = {
  slug: "redirects",
  labels: { singular: "Redirect", plural: "Redirects" },
  admin: {
    useAsTitle: "source",
    defaultColumns: ["source", "target", "statusCode", "updatedAt"],
    group: "SEO",
    description:
      "Send an old address to a new one. Changes reach every server within a minute.",
  },
  access: {
    read: isLoggedIn,
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  fields: [
    {
      name: "source",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "From",
      admin: { placeholder: "/old-page" },
    },
    {
      name: "target",
      type: "text",
      required: true,
      label: "To",
      admin: { placeholder: "/new-page or https://…" },
    },
    {
      name: "statusCode",
      type: "number",
      required: true,
      defaultValue: 301,
      label: "Status code",
      admin: { description: "301 or 308 for a permanent move, 302 or 307 for a temporary one." },
    },
  ],
  timestamps: true,
};
