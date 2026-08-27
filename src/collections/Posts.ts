import type { CollectionConfig } from "payload";
import { isLoggedIn, readPublishedPosts } from "@/lib/access";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function plainText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readingTimeFrom(body?: string | null): string {
  const words = plainText(body ?? "").split(" ").filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min`;
}

function excerptFrom(data: Record<string, unknown>): string {
  const existing = String(data.excerpt ?? "").trim();
  if (existing) return existing;
  const text = plainText(String(data.body ?? ""));
  if (text.length <= 160) return text;
  return `${text.slice(0, 157).trimEnd()}…`;
}

function normalizeTags(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(", ");
}

export const Posts: CollectionConfig = {
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "status", "category", "date", "updatedAt"],
    group: "Content",
    description: "Write a title and the article. Drafts stay private until you publish.",
    listSearchableFields: ["title", "slug", "excerpt", "tags"],
    components: {
      edit: {
        SaveButton: "/admin/SavePostButton.tsx#SavePostButton",
      },
    },
  },
  access: {
    read: readPublishedPosts,
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (!data) return data;
        if (!data.slug && typeof data.title === "string") {
          data.slug = slugify(data.title);
        }
        if (operation === "create" && !data.status) data.status = "draft";
        if (operation === "create" && !data.date) {
          data.date = new Date().toISOString();
        }
        if (operation === "create" && !data.author) data.author = "Shehryar Afzal";
        return data;
      },
    ],
    beforeChange: [
      ({ data, originalDoc }) => {
        if (!data) return data;
        const next = { ...originalDoc, ...data };
        if (next.status === "published" && !String(next.body ?? "").trim()) {
          throw new Error("Write the article before publishing.");
        }
        if (next.status === "published" && !String(next.category ?? "").trim()) {
          data.category = "General";
        }
        data.excerpt = excerptFrom(next);
        data.readingTime = readingTimeFrom(String(next.body ?? ""));
        data.tags = normalizeTags(data.tags ?? next.tags);
        return data;
      },
    ],
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      admin: {
        placeholder: "Title",
      },
    },
    {
      name: "writingTips",
      type: "ui",
      admin: {
        components: {
          Field: "/admin/WritingTips.tsx#WritingTips",
        },
      },
    },
    {
      name: "body",
      type: "textarea",
      label: "Content",
      admin: {
        rows: 28,
        description: "Write the post here. Use the marks above for bold, headings, links and photos.",
      },
    },
    {
      name: "excerpt",
      type: "textarea",
      label: "Excerpt",
      admin: {
        rows: 3,
        description: "Short summary for the blog list. Filled automatically if you leave it blank.",
      },
    },
    {
      name: "tags",
      type: "text",
      label: "Tags",
      admin: {
        placeholder: "AI, automation, n8n",
        description: "Type tags separated by commas.",
      },
    },
    {
      name: "keywords",
      type: "array",
      admin: { hidden: true },
      fields: [{ name: "value", type: "text" }],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      index: true,
      label: "Status",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
      admin: {
        position: "sidebar",
        description: "Draft stays private. Published appears on the blog.",
      },
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "URL",
      admin: {
        position: "sidebar",
        description: "The post address. Filled from the title if blank.",
      },
    },
    {
      name: "date",
      type: "date",
      required: true,
      index: true,
      label: "Date",
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayOnly" },
      },
    },
    {
      name: "category",
      type: "text",
      label: "Category",
      admin: {
        position: "sidebar",
        placeholder: "General",
      },
    },
    {
      name: "author",
      type: "text",
      required: true,
      defaultValue: "Shehryar Afzal",
      admin: { position: "sidebar" },
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      label: "Featured image",
      admin: {
        position: "sidebar",
        description: "Click to upload or pick a photo. This is the picture on the blog list and at the top of the post.",
      },
    },
    {
      name: "cover",
      type: "group",
      admin: { hidden: true },
      fields: [
        { name: "src", type: "text" },
        { name: "alt", type: "text" },
        { name: "caption", type: "text" },
      ],
    },
    {
      name: "readingTime",
      type: "text",
      admin: { hidden: true },
    },
    {
      name: "lastReviewed",
      type: "date",
      admin: { hidden: true, date: { pickerAppearance: "dayOnly" } },
    },
    {
      name: "answer",
      type: "textarea",
      admin: { hidden: true },
    },
    {
      name: "faqs",
      type: "array",
      admin: { hidden: true },
      fields: [
        { name: "q", type: "text" },
        { name: "a", type: "textarea" },
      ],
    },
    {
      name: "tools",
      type: "select",
      hasMany: true,
      options: [
        { label: "ZAC Consultant", value: "consultant" },
        { label: "ZAC Estimator", value: "estimator" },
      ],
      admin: { hidden: true },
    },
    {
      name: "related",
      type: "array",
      admin: { hidden: true },
      fields: [{ name: "value", type: "text" }],
    },
  ],
  timestamps: true,
};
