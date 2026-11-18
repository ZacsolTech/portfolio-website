import { z } from "zod";

import { authorizeIngest } from "@/lib/ingest/auth";
import { FeaturedImageError, upsertPost } from "@/lib/ingest/posts";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const FeaturedImage = z.object({
  filename: z.string().trim().min(1).max(120),
  mime_type: z.string().trim().min(1).max(80),
  alt: z.string().trim().min(1).max(200),
  data_base64: z.string().min(1),
});

const Body = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,80}$/),
  body: z.string().trim().min(1).max(80_000),
  excerpt: z.string().trim().max(180).optional().default(""),
  tags: z.string().trim().max(400).optional().default(""),
  category: z.string().trim().max(80).optional().default("General"),
  author: z.string().trim().max(120).optional().default("Shehryar Afzal"),
  date: z.string().trim().max(40).optional(),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  remote_id: z.string().trim().max(80).optional(),
  featured_image: FeaturedImage.optional(),
  idempotency_key: z.string().trim().max(200).optional(),
});

/** Connection test used by ZACBOS before it stores the site. */
export async function GET(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) return auth.response;
  return Response.json({ ok: true, collection: "posts" });
}

export async function POST(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) return auth.response;

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid post payload." }, { status: 400 });
  }

  if (parsed.status === "published" && !parsed.body.trim()) {
    return Response.json({ error: "Write the article before publishing." }, { status: 400 });
  }

  try {
    const result = await upsertPost({
      title: parsed.title,
      slug: parsed.slug,
      body: parsed.body,
      excerpt: parsed.excerpt,
      tags: parsed.tags,
      category: parsed.category,
      author: parsed.author,
      status: parsed.status,
      date: parsed.date,
      remoteId: parsed.remote_id,
      featuredImage: parsed.featured_image,
    });

    if (!result.ok) {
      return Response.json(
        { error: "A different post already uses this slug." },
        { status: 409 },
      );
    }

    return Response.json({
      ok: true,
      id: result.id,
      slug: parsed.slug,
      status: parsed.status,
      url: result.url,
      updated: result.updated,
    });
  } catch (err) {
    if (err instanceof FeaturedImageError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    console.error("[ingest:posts]", err);
    return Response.json({ error: "Ingest failed." }, { status: 500 });
  }
}
