/* =============================================================================
 *  ZACBOS CONNECTOR — Next.js (App Router)
 *  Protocol: zacbos-simple/1
 * =============================================================================
 *  WHAT THIS FILE DOES
 *    Lets ZACBOS (an SEO platform) read this website's pages and apply the SEO
 *    fixes the site owner approved in ZACBOS: SEO titles, meta descriptions,
 *    canonical URLs, noindex, structured data (JSON-LD), image alt text,
 *    redirects and new blog posts. It can never change page content, prices
 *    or users.
 *
 *  HOW IT IS WIRED IN THIS PROJECT (Payload CMS 3 on Postgres)
 *    app/(frontend)/api/zacbos/route.ts   POST → zacbosApi
 *    src/proxy.ts                         applies redirects (lib/zacbos-redirects.ts)
 *    app/sitemap.ts, app/robots.ts        the project's own; sitemap drops noindex pages
 *    collections/Seo.ts                   per-page overrides, keyed by page id
 *    collections/Redirects.ts             redirects (id, source, target, status_code)
 *    lib/seo-overrides.ts                 withSeo() + <SeoJsonLd> used by every page template
 *    lib/site-pages.ts                    the list of code-defined pages
 *
 *  PAGE IDS
 *    Code-defined pages use their path ("/", "/about", "/services/web-apps").
 *    Blog posts use "post:<row id>", so a slug change keeps their overrides.
 *
 *  Never change: the Authorization check, ALLOWED_FIELDS, the action names,
 *  or the rule that update_page saves only SEO fields and image alt text.
 *  The key comes from ZACBOS_CONNECTION_KEY and is never hard-coded.
 * ========================================================================== */
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { BLOG_PATH, blogPath } from "@/lib/blog";
import { mediaUrl } from "@/lib/blog/media";
import { site } from "@/lib/content";
import { FeaturedImageError, payloadClient, upsertPost } from "@/lib/ingest/posts";
import { absoluteUrl } from "@/lib/seo";
import { schemaBlocks } from "@/lib/seo-overrides";
import { postPageId, sitePages } from "@/lib/site-pages";
import { normalizeSource } from "@/lib/zacbos-redirects";

export { zacbosRedirect } from "@/lib/zacbos-redirects";

const KEY = process.env.ZACBOS_CONNECTION_KEY ?? "";
const ALLOWED_FIELDS = ["meta_title", "meta_description", "canonical", "noindex", "schema"];
const CAPABILITIES = [...ALLOWED_FIELDS, "image_alt", "redirect", "post"];

class NotConnected extends Error {}
/** Bad input from ZACBOS. Subclass so the handler's existing catch answers 422 with the message. */
class InvalidInput extends NotConnected {}

function keyIsValid(header: string | null): boolean {
  const expected = Buffer.from(`Bearer ${KEY}`);
  const given = Buffer.from(header ?? "");
  return KEY !== "" && given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

const origin = (req: NextRequest) => `https://${req.headers.get("host")}`;

export async function zacbosApi(req: NextRequest) {
  if (!keyIsValid(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Invalid ZACBOS key" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    switch (body.action) {
      case "ping":
        return NextResponse.json({ ok: true, site_url: origin(req), site_name: site.name, capabilities: CAPABILITIES });
      case "list_pages": {
        const { pages, nextCursor } = await listPages(body.cursor ?? null, Number(body.limit) || 100);
        return NextResponse.json({ pages, next_cursor: nextCursor });
      }
      case "get_page": {
        const page = await getPage(String(body.id));
        return page ? NextResponse.json({ page }) : NextResponse.json({ error: "Page not found" }, { status: 404 });
      }
      case "update_page": {
        const fields = Object.fromEntries(Object.entries(body.fields ?? {}).filter(([k]) => ALLOWED_FIELDS.includes(k)));
        const images = (body.images ?? []).map((i: { id: unknown; alt?: unknown }) => ({ id: String(i.id), alt: String(i.alt ?? "") }));
        await saveSeo(String(body.id), fields, images);
        return NextResponse.json({ page: await getPage(String(body.id)) });
      }
      case "list_redirects":
        return NextResponse.json({ redirects: await listRedirects() });
      case "create_redirect":
        return NextResponse.json({ redirect: await saveRedirect(String(body.source), String(body.target), Number(body.status_code) || 301) });
      case "delete_redirect":
        return (await deleteRedirect(String(body.id)))
          ? NextResponse.json({ deleted: true })
          : NextResponse.json({ error: "Redirect not found" }, { status: 404 });
      case "publish_post":
        return NextResponse.json({ post: await publishPost(body) });
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof NotConnected) return NextResponse.json({ error: error.message }, { status: 422 });
    throw error;
  }
}

/** Not routed: this project keeps its own app/sitemap.ts (which honours noindex). */
export async function zacbosSitemap() {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  let cursor: string | null = null;
  do {
    const { pages, nextCursor }: { pages: Page[]; nextCursor: string | null } = await listPages(cursor, 500);
    for (const page of pages) {
      if (page.noindex) continue;
      xml += `<url><loc>${esc(page.url)}</loc>${page.updated_at ? `<lastmod>${esc(page.updated_at)}</lastmod>` : ""}</url>`;
    }
    cursor = nextCursor;
  } while (cursor);
  return new NextResponse(xml + "</urlset>", { headers: { "Content-Type": "application/xml" } });
}

/** Not routed: this project keeps its own app/robots.ts. */
export async function zacbosRobots(req: NextRequest) {
  return new NextResponse(`User-agent: *\nAllow: /\nSitemap: ${origin(req)}/sitemap.xml\n`, {
    headers: { "Content-Type": "text/plain" },
  });
}

/* =============================================================================
 *  Storage — Payload collections "posts", "media", "seo" and "redirects".
 *  Only published pages are listed.
 * ========================================================================== */
export type Page = {
  id: string;
  url: string;
  type?: string;
  title?: string;
  excerpt?: string;
  updated_at?: string;
  meta_title?: string;
  meta_description?: string;
  canonical?: string;
  noindex?: boolean;
  schema?: object[];
  images?: { id: string; src: string; alt: string }[];
};
export type Redirect = { id: string; source: string; target: string; status_code: number };
export type Post = {
  title: string; slug: string; html: string; markdown: string; excerpt: string;
  meta_title: string; meta_description: string; tags: string[]; category: string; author: string;
  status: "draft" | "published"; date: string | null; schema: object[]; remote_id: string | null;
  image: null | { filename: string; mime_type: string; alt: string; data_base64: string };
};

type Entry = {
  id: string;
  path: string;
  type: string;
  title: string;
  excerpt?: string;
  updatedAt?: string;
  images: { id: string; src: string; alt: string }[];
};

type MediaRow = { id: number | string; url?: string | null; filename?: string | null; alt?: string | null };
type PostRow = {
  id: number | string;
  slug: string;
  title: string;
  excerpt?: string | null;
  status?: string | null;
  updatedAt?: string | null;
  image?: MediaRow | number | null;
};
type SeoRow = {
  id: number | string;
  pageId: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonical?: string | null;
  noindex?: boolean | null;
  schema?: unknown;
  updatedAt?: string | null;
};
type RedirectRow = { id: number | string; source: string; target: string; statusCode?: number | string | null };

const MEDIA_PREFIX = "media:";
const PROTECTED_SOURCES = /^\/(admin|api|_next)(\/|$)/;
const REDIRECT_CODES = new Set([301, 302, 307, 308]);

function missingTable(error: unknown): never {
  console.error("[zacbos] storage query failed:", error);
  throw new NotConnected(
    "SEO storage is not ready — run migration 20261118_120000_zacbos_seo_redirects (pnpm migrate 20261118_120000_zacbos_seo_redirects --apply).",
  );
}

function absolute(src: string): string {
  return /^https?:\/\//i.test(src) ? src : absoluteUrl(src);
}

function postEntry(row: PostRow): Entry {
  const media = row.image && typeof row.image === "object" ? row.image : null;
  const src = media ? mediaUrl(media) : "";
  return {
    id: postPageId(row.id),
    path: blogPath(row.slug),
    type: "post",
    title: row.title,
    excerpt: row.excerpt ?? undefined,
    updatedAt: row.updatedAt ?? undefined,
    images: media && src ? [{ id: `${MEDIA_PREFIX}${media.id}`, src: absolute(src), alt: media.alt ?? "" }] : [],
  };
}

function codeEntries(): Entry[] {
  return sitePages().map((page) => ({
    id: page.id,
    path: page.path,
    type: page.type,
    title: page.title,
    excerpt: page.excerpt,
    images: [],
  }));
}

async function publishedPostEntries(): Promise<Entry[]> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: "posts",
    where: { status: { equals: "published" } },
    sort: "id",
    pagination: false,
    depth: 1,
    overrideAccess: true,
  });
  return (result.docs as unknown as PostRow[]).map(postEntry);
}

async function findEntry(id: string): Promise<Entry | null> {
  if (id.startsWith("post:")) {
    const rowId = id.slice("post:".length);
    if (!/^\d+$/.test(rowId)) return null;
    const payload = await payloadClient();
    try {
      const row = (await payload.findByID({ collection: "posts", id: rowId, depth: 1, overrideAccess: true })) as unknown as PostRow;
      return row.status === "published" ? postEntry(row) : null;
    } catch {
      return null;
    }
  }
  return codeEntries().find((entry) => entry.id === id) ?? null;
}

async function seoRows(pageIds: string[]): Promise<Map<string, SeoRow>> {
  if (!pageIds.length) return new Map();
  const payload = await payloadClient();
  try {
    const result = await payload.find({
      collection: "seo",
      where: { pageId: { in: pageIds } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    });
    return new Map((result.docs as unknown as SeoRow[]).map((row) => [row.pageId, row]));
  } catch (error) {
    missingTable(error);
  }
}

function toPage(entry: Entry, seo: SeoRow | undefined): Page {
  const updated = [entry.updatedAt, seo?.updatedAt].filter(Boolean).sort().pop();
  return {
    id: entry.id,
    url: absoluteUrl(entry.path),
    type: entry.type,
    title: entry.title,
    ...(entry.excerpt ? { excerpt: entry.excerpt } : {}),
    ...(updated ? { updated_at: new Date(updated).toISOString() } : {}),
    ...(seo?.metaTitle ? { meta_title: seo.metaTitle } : {}),
    ...(seo?.metaDescription ? { meta_description: seo.metaDescription } : {}),
    ...(seo?.canonical ? { canonical: seo.canonical } : {}),
    noindex: Boolean(seo?.noindex),
    schema: schemaBlocks(seo?.schema),
    images: entry.images,
  };
}

/** Published pages after `cursor` (null = from the start), oldest first. Cursor is an offset. */
async function listPages(cursor: string | null, limit: number): Promise<{ pages: Page[]; nextCursor: string | null }> {
  const entries = [...codeEntries(), ...(await publishedPostEntries())];
  const start = Math.max(0, Number.parseInt(cursor ?? "0", 10) || 0);
  const size = Math.min(Math.max(1, limit), 500);
  const slice = entries.slice(start, start + size);
  const seo = await seoRows(slice.map((entry) => entry.id));
  const end = start + slice.length;
  return {
    pages: slice.map((entry) => toPage(entry, seo.get(entry.id))),
    nextCursor: end < entries.length ? String(end) : null,
  };
}

/** One page by id, or null. */
async function getPage(id: string): Promise<Page | null> {
  const entry = await findEntry(id);
  if (!entry) return null;
  const seo = await seoRows([entry.id]);
  return toPage(entry, seo.get(entry.id));
}

/* ---------------------------------------------------------------- SEO writes */

function text(value: unknown, field: string, max: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new InvalidInput(`${field} must be a string.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new InvalidInput(`${field} is longer than ${max} characters.`);
  return trimmed || null;
}

function canonicalValue(value: unknown): string | null {
  const url = text(value, "canonical", 2000);
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return url;
  } catch {
    /* fall through */
  }
  throw new InvalidInput("canonical must be an absolute http(s) URL or a path starting with /.");
}

function booleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0" || value === null || value === "") return false;
  throw new InvalidInput("noindex must be true or false.");
}

function schemaValue(value: unknown): Record<string, unknown>[] | null {
  if (value === null || value === undefined) return null;
  const list = Array.isArray(value) ? value : [value];
  if (!list.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    throw new InvalidInput("schema must be an array of JSON-LD objects.");
  }
  if (JSON.stringify(list).length > 100_000) throw new InvalidInput("schema is larger than 100KB.");
  return list.length ? (list as Record<string, unknown>[]) : null;
}

/** Translate the keys present in `fields` to Seo collection columns. */
function seoData(fields: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if ("meta_title" in fields) data.metaTitle = text(fields.meta_title, "meta_title", 200);
  if ("meta_description" in fields) data.metaDescription = text(fields.meta_description, "meta_description", 500);
  if ("canonical" in fields) data.canonical = canonicalValue(fields.canonical);
  if ("noindex" in fields) data.noindex = booleanValue(fields.noindex);
  if ("schema" in fields) data.schema = schemaValue(fields.schema);
  return data;
}

async function writeSeo(pageId: string, data: Record<string, unknown>): Promise<void> {
  if (!Object.keys(data).length) return;
  const payload = await payloadClient();
  const existing = (await seoRows([pageId])).get(pageId);
  if (existing) {
    await payload.update({ collection: "seo", id: existing.id, data, overrideAccess: true, depth: 0 });
  } else {
    await payload.create({ collection: "seo", data: { pageId, ...data }, overrideAccess: true, depth: 0 });
  }
}

/** Save only the keys present in `fields` (schema is an array: store as JSON) and each image's alt. */
async function saveSeo(id: string, fields: Record<string, unknown>, images: { id: string; alt: string }[]): Promise<void> {
  const entry = await findEntry(id);
  if (!entry) throw new InvalidInput(`Page not found: ${id}`);

  // Validate everything before writing anything.
  const data = seoData(fields);
  const ownImages = new Set(entry.images.map((image) => image.id));
  for (const image of images) {
    if (!ownImages.has(image.id)) throw new InvalidInput(`Image ${image.id} does not belong to page ${id}.`);
    if (image.alt.trim().length > 300) throw new InvalidInput(`Alt text for ${image.id} is longer than 300 characters.`);
  }

  await writeSeo(entry.id, data);

  if (images.length) {
    const payload = await payloadClient();
    for (const image of images) {
      await payload.update({
        collection: "media",
        id: image.id.slice(MEDIA_PREFIX.length),
        data: { alt: image.alt.trim() },
        overrideAccess: true,
        depth: 0,
      });
    }
  }

  revalidatePath(entry.path);
  revalidatePath("/sitemap.xml");
  if (entry.type === "post") revalidatePath(BLOG_PATH);
}

/* ----------------------------------------------------------------- Redirects */

function toRedirect(row: RedirectRow): Redirect {
  return { id: String(row.id), source: row.source, target: row.target, status_code: Number(row.statusCode) || 301 };
}

/** All redirects. */
async function listRedirects(): Promise<Redirect[]> {
  const payload = await payloadClient();
  try {
    const result = await payload.find({
      collection: "redirects",
      sort: "id",
      pagination: false,
      depth: 0,
      overrideAccess: true,
    });
    return (result.docs as unknown as RedirectRow[]).map(toRedirect);
  } catch (error) {
    missingTable(error);
  }
}

/** Create a redirect (or return the existing one for the same source) and return it. */
async function saveRedirect(source: string, target: string, statusCode: number): Promise<Redirect> {
  const from = normalizeSource(source);
  const to = target.trim();
  if (!from.startsWith("/") || from.startsWith("//") || from.length > 1000) {
    throw new InvalidInput("Redirect source must be a path starting with /.");
  }
  if (/[?#]/.test(from)) throw new InvalidInput("Redirect source must be a path without ? or #.");
  if (from === "/" || PROTECTED_SOURCES.test(from)) {
    throw new InvalidInput("The home page, /admin, /api and /_next cannot be redirected.");
  }
  const isPath = to.startsWith("/") && !to.startsWith("//");
  let isUrl = false;
  try {
    isUrl = /^https?:$/.test(new URL(to).protocol);
  } catch {
    /* not a URL */
  }
  if (!to || to.length > 2000 || (!isPath && !isUrl)) {
    throw new InvalidInput("Redirect target must be a path starting with / or an absolute http(s) URL.");
  }
  if (isPath && normalizeSource(to.split(/[?#]/)[0]) === from) {
    throw new InvalidInput("Redirect source and target are the same.");
  }
  if (!REDIRECT_CODES.has(statusCode)) throw new InvalidInput("status_code must be 301, 302, 307 or 308.");

  const existing = (await listRedirects()).find((r) => normalizeSource(r.source) === from);
  if (existing) return existing;

  const payload = await payloadClient();
  const created = await payload.create({
    collection: "redirects",
    data: { source: from, target: to, statusCode },
    overrideAccess: true,
    depth: 0,
  });
  return toRedirect(created as unknown as RedirectRow);
}

/** Delete a redirect. Return false if it does not exist. */
async function deleteRedirect(id: string): Promise<boolean> {
  if (!/^\d+$/.test(id)) return false;
  const payload = await payloadClient();
  try {
    await payload.findByID({ collection: "redirects", id, depth: 0, overrideAccess: true });
  } catch {
    return false;
  }
  await payload.delete({ collection: "redirects", id, overrideAccess: true });
  return true;
}

/* --------------------------------------------------------------------- Posts */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

/**
 * The blog body is markdown (see components/blog/article-body.tsx). ZACBOS
 * normally sends `markdown`; this covers an HTML-only post well enough for
 * headings, paragraphs, lists, links, emphasis, images and code.
 */
function htmlToMarkdown(html: string): string {
  const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1] ?? "";
  let md = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, code) => `\n\n\`\`\`\n${decodeEntities(code)}\n\`\`\`\n\n`)
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => `\n\n${"#".repeat(Math.max(2, Number(level)))} ${inner}\n\n`)
    .replace(/<img[^>]*>/gi, (tag) => `\n\n![${attr(tag, "alt")}](${attr(tag, "src")})\n\n`)
    .replace(/<a [^>]*>([\s\S]*?)<\/a>/gi, (tag, inner) => `[${inner}](${attr(tag, "href")})`)
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, "*$2*")
    .replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<\/(ul|ol)>/gi, "\n\n")
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "\n\n> $1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
  md = decodeEntities(md);
  return md.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Create a blog post, or update the one with the same slug (or post.remote_id). */
async function publishPost(post: Post): Promise<{ id: string; url: string; status: "draft" | "published" }> {
  const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

  const title = str(post.title);
  if (!title) throw new InvalidInput("title is required.");
  if (title.length > 200) throw new InvalidInput("title is longer than 200 characters.");
  const slug = slugify(str(post.slug) || title);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new InvalidInput("slug must contain letters or numbers.");

  const body = str(post.markdown) || (str(post.html) ? htmlToMarkdown(post.html) : "");
  if (body.length > 200_000) throw new InvalidInput("Post body is too long.");
  const status = post.status === "published" ? "published" : "draft";
  if (status === "published" && !body) throw new InvalidInput("Write the article before publishing.");

  const tags = Array.isArray(post.tags)
    ? post.tags.map((tag) => String(tag).trim()).filter(Boolean).join(", ")
    : str(post.tags);
  const date = str(post.date) && !Number.isNaN(Date.parse(str(post.date))) ? str(post.date) : undefined;
  const remoteId = str(post.remote_id).replace(/^post:/, "") || undefined;

  // Validate SEO before writing the post, so a bad field cannot leave a half-published post.
  const seo = seoData({
    ...(post.meta_title !== undefined ? { meta_title: post.meta_title } : {}),
    ...(post.meta_description !== undefined ? { meta_description: post.meta_description } : {}),
    ...(post.schema !== undefined ? { schema: post.schema } : {}),
  });

  const image = post.image && typeof post.image === "object" && str(post.image.data_base64) ? post.image : null;

  let result;
  try {
    result = await upsertPost({
      title,
      slug,
      body,
      excerpt: str(post.excerpt).slice(0, 300),
      tags: tags.slice(0, 400),
      category: str(post.category).slice(0, 80) || "General",
      author: str(post.author).slice(0, 120) || "Shehryar Afzal",
      status,
      date,
      remoteId,
      featuredImage: image
        ? {
            filename: str(image.filename) || `${slug}.jpg`,
            mime_type: str(image.mime_type),
            alt: (str(image.alt) || title).slice(0, 200),
            data_base64: image.data_base64,
          }
        : undefined,
    });
  } catch (error) {
    if (error instanceof FeaturedImageError) throw new InvalidInput(error.message);
    throw error;
  }
  if (!result.ok) throw new InvalidInput("A different post already uses this slug.");

  const pageId = postPageId(result.id);
  await writeSeo(pageId, seo);
  revalidatePath(blogPath(slug));

  return { id: pageId, url: result.url, status };
}
