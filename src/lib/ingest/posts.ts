import { revalidatePath } from "next/cache";
import { BLOG_PATH, blogPath } from "@/lib/blog";

/**
 * Create-or-update a blog post from a machine publisher. Shared by
 * POST /api/ingest/posts and the ZACBOS connector's publish_post action.
 * Callers validate and normalise input; this module only writes.
 */

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export type FeaturedImageInput = {
  filename: string;
  mime_type: string;
  alt: string;
  data_base64: string;
};

export type PostInput = {
  title: string;
  slug: string;
  body: string;
  excerpt: string;
  tags: string;
  category: string;
  author: string;
  status: "draft" | "published";
  date?: string;
  remoteId?: string;
  featuredImage?: FeaturedImageInput;
};

export type UpsertResult =
  | { ok: true; id: string; url: string; updated: boolean }
  | { ok: false; conflict: true };

/** Raised for bad featured-image input. Message is safe to show the caller. */
export class FeaturedImageError extends Error {}

export async function payloadClient() {
  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  return getPayload({ config });
}

type Payload = Awaited<ReturnType<typeof payloadClient>>;

export function publicPostUrl(slug: string): string {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return origin ? `${origin}${blogPath(slug)}` : blogPath(slug);
}

export function revalidatePost(slug: string) {
  revalidatePath(BLOG_PATH);
  revalidatePath(blogPath(slug));
  revalidatePath("/feed.xml");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
}

export async function upsertPost(input: PostInput): Promise<UpsertResult> {
  const payload = await payloadClient();

  const existing = await findExisting(payload, input.slug, input.remoteId);
  if (existing === "conflict") return { ok: false, conflict: true };

  const imageId = input.featuredImage ? await uploadFeatured(payload, input.featuredImage) : undefined;

  const data = {
    title: input.title,
    slug: input.slug,
    body: input.body,
    excerpt: input.excerpt,
    tags: input.tags,
    category: input.category || "General",
    author: input.author || "Shehryar Afzal",
    status: input.status,
    ...(input.date ? { date: input.date } : {}),
    ...(imageId !== undefined ? { image: imageId } : {}),
  };

  const doc =
    existing !== undefined
      ? await payload.update({ collection: "posts", id: existing.id, data, overrideAccess: true, depth: 0 })
      : await payload.create({ collection: "posts", data, overrideAccess: true, depth: 0 });

  revalidatePost(input.slug);

  return { ok: true, id: String(doc.id), url: publicPostUrl(input.slug), updated: existing !== undefined };
}

async function findExisting(
  payload: Payload,
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
      const byId = await payload.findByID({ collection: "posts", id: remoteId, depth: 0, overrideAccess: true });
      if (slugDoc && String(slugDoc.id) !== String(byId.id)) return "conflict";
      return { id: byId.id };
    } catch {
      // Unknown remote id — fall through to slug match (first publish / stale id).
    }
  }

  if (slugDoc) return { id: slugDoc.id };
  return undefined;
}

async function uploadFeatured(payload: Payload, image: FeaturedImageInput): Promise<number | string> {
  const mime = image.mime_type.toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(mime)) {
    throw new FeaturedImageError("Featured image type is not allowed.");
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(image.data_base64, "base64");
  } catch {
    throw new FeaturedImageError("Featured image is not valid base64.");
  }
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
    throw new FeaturedImageError("Featured image is empty or larger than 6MB.");
  }
  if (!looksLikeImage(bytes, mime)) {
    throw new FeaturedImageError("Featured image bytes do not match the declared type.");
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
    return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  }
  if (mime === "image/avif") {
    return bytes.subarray(4, 8).toString("ascii") === "ftyp";
  }
  return false;
}
