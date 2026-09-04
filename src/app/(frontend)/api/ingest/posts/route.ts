import { revalidatePath } from "next/cache";
import { z } from "zod";

import { BLOG_PATH, blogPath } from "@/lib/blog";
import { authorizeIngest } from "@/lib/ingest/auth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

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

async function payloadClient() {
  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  return getPayload({ config });
}

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
    const payload = await payloadClient();
    const imageId = parsed.featured_image
      ? await uploadFeatured(payload, parsed.featured_image)
      : undefined;

    const existing = await findExisting(payload, parsed.slug, parsed.remote_id);
    if (existing === "conflict") {
      return Response.json(
        { error: "A different post already uses this slug." },
        { status: 409 },
      );
    }

    const data = {
      title: parsed.title,
      slug: parsed.slug,
      body: parsed.body,
      excerpt: parsed.excerpt,
      tags: parsed.tags,
      category: parsed.category || "General",
      author: parsed.author || "Shehryar Afzal",
      status: parsed.status,
      ...(parsed.date ? { date: parsed.date } : {}),
      ...(imageId !== undefined ? { image: imageId } : {}),
    };

    const doc =
      existing !== undefined
        ? await payload.update({
            collection: "posts",
            id: existing.id,
            data,
            overrideAccess: true,
            depth: 0,
          })
        : await payload.create({
            collection: "posts",
            data,
            overrideAccess: true,
            depth: 0,
          });

    revalidatePath(BLOG_PATH);
    revalidatePath(blogPath(parsed.slug));
    revalidatePath("/feed.xml");
    revalidatePath("/sitemap.xml");
    revalidatePath("/llms.txt");

    const origin = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const url = origin ? `${origin}${blogPath(parsed.slug)}` : blogPath(parsed.slug);

    return Response.json({
      ok: true,
      id: String(doc.id),
      slug: parsed.slug,
      status: parsed.status,
      url,
      updated: existing !== undefined,
    });
  } catch (err) {
    console.error("[ingest:posts]", err);
    const message = err instanceof Error ? err.message : "Ingest failed.";
    const known = message.startsWith("Featured image");
    return Response.json(
      { error: known ? message : "Ingest failed." },
      { status: known ? 400 : 500 },
    );
  }
}

async function findExisting(
  payload: Awaited<ReturnType<typeof payloadClient>>,
  slug: string,
  remoteId: string | undefined,
): Promise<{ id: number | string } | undefined | "conflict"> {
  const bySlug = await payload.find({
    collection: "posts",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const slugDoc = bySlug.docs[0];

  if (remoteId) {
    try {
      const byId = await payload.findByID({
        collection: "posts",
        id: remoteId,
        depth: 0,
        overrideAccess: true,
      });
      if (slugDoc && String(slugDoc.id) !== String(byId.id)) {
        return "conflict";
      }
      return { id: byId.id };
    } catch {
      // Unknown remote id — fall through to slug match (first publish / stale id).
    }
  }

  if (slugDoc) return { id: slugDoc.id };
  return undefined;
}

async function uploadFeatured(
  payload: Awaited<ReturnType<typeof payloadClient>>,
  image: z.infer<typeof FeaturedImage>,
): Promise<number | string> {
  const mime = image.mime_type.toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(mime)) {
    throw new Error("Featured image type is not allowed.");
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(image.data_base64, "base64");
  } catch {
    throw new Error("Featured image is not valid base64.");
  }
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("Featured image is empty or larger than 6MB.");
  }
  if (!looksLikeImage(bytes, mime)) {
    throw new Error("Featured image bytes do not match the declared type.");
  }

  const created = await payload.create({
    collection: "media",
    data: { alt: image.alt },
    file: {
      data: bytes,
      mimetype: mime,
      name: image.filename.replace(/[^\w.\-]+/g, "-").slice(0, 80),
      size: bytes.length,
    },
    overrideAccess: true,
    depth: 0,
  });

  return created.id;
}

function looksLikeImage(bytes: Buffer, mime: string): boolean {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (mime === "image/png") {
    return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mime === "image/gif") {
    const head = bytes.subarray(0, 6).toString("ascii");
    return head === "GIF87a" || head === "GIF89a";
  }
  if (mime === "image/webp") {
    return (
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (mime === "image/avif") {
    return bytes.subarray(4, 8).toString("ascii") === "ftyp";
  }
  return false;
}
