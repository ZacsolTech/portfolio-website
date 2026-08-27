import type { BlogTool, Insight } from "@/lib/content/types";
import { markdownToBlocks } from "@/lib/blog/markdown";
import { mediaUrl } from "@/lib/blog/media";

async function payloadClient() {
  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  return getPayload({ config });
}

type MediaDoc = {
  url?: string | null;
  filename?: string | null;
  alt?: string | null;
  caption?: string | null;
};

type PostRow = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  lastReviewed?: string | null;
  author: string;
  readingTime?: string | null;
  answer: string;
  image?: MediaDoc | number | null;
  cover?: { src?: string | null; alt?: string | null; caption?: string | null } | null;
  body?: string | { paragraph?: string | null }[] | null;
  tags?: string | null;
  faqs?: { q?: string | null; a?: string | null }[] | null;
  keywords?: { value?: string | null }[] | null;
  tools?: string[] | null;
  related?: { value?: string | null }[] | null;
};

function isoDay(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function coverFrom(doc: PostRow): Insight["cover"] {
  const image = doc.image;
  const uploaded = mediaUrl(image);
  if (uploaded && image && typeof image === "object") {
    return {
      src: uploaded,
      alt: image.alt?.trim() || doc.title,
      caption: image.caption?.trim() || undefined,
    };
  }
  const legacy = doc.cover?.src?.trim();
  if (!legacy) return undefined;
  return {
    src: legacy,
    alt: doc.cover?.alt?.trim() || doc.title,
    caption: doc.cover?.caption?.trim() || undefined,
  };
}

function tagsFrom(doc: PostRow): string[] {
  if (typeof doc.tags === "string" && doc.tags.trim()) {
    return doc.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return (doc.keywords ?? []).map((row) => row.value ?? "").filter(Boolean);
}

function toInsight(doc: PostRow): Insight {
  const tools = (doc.tools ?? []).filter(
    (value): value is BlogTool => value === "consultant" || value === "estimator",
  );
  const body =
    typeof doc.body === "string"
      ? markdownToBlocks(doc.body)
      : (doc.body ?? []).map((row) => row.paragraph ?? "").filter(Boolean);
  return {
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt ?? "",
    category: doc.category ?? "",
    date: isoDay(doc.date),
    lastReviewed: doc.lastReviewed ? isoDay(doc.lastReviewed) : undefined,
    author: doc.author,
    readingTime: doc.readingTime || "1 min",
    answer: doc.answer ?? "",
    body,
    faqs: (doc.faqs ?? [])
      .filter((row) => row.q && row.a)
      .map((row) => ({ q: row.q as string, a: row.a as string })),
    related: (doc.related ?? []).map((row) => row.value ?? "").filter(Boolean),
    tools,
    keywords: tagsFrom(doc),
    cover: coverFrom(doc),
  };
}

export async function getPublishedPosts(): Promise<Insight[]> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: "posts",
    where: { status: { equals: "published" } },
    sort: "-date",
    limit: 200,
    pagination: false,
    depth: 1,
  } as never);
  return result.docs.map((doc) => toInsight(doc as unknown as PostRow));
}

export async function getPublishedPost(slug: string): Promise<Insight | null> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: "posts",
    where: {
      and: [{ slug: { equals: slug } }, { status: { equals: "published" } }],
    },
    limit: 1,
    depth: 1,
  } as never);
  const doc = result.docs[0];
  return doc ? toInsight(doc as unknown as PostRow) : null;
}
