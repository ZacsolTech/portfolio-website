import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { CollectionSlug } from "payload";
import { getCollectionFrontPath } from "@/lib/preview";

/**
 * Enables Next.js Draft Mode after validating the shared preview secret,
 * then redirects to the front-end path for that document.
 *
 * Used by Payload admin "Preview" and Live Preview iframe URLs.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  const collection = searchParams.get("collection") as CollectionSlug | null;
  const slug = searchParams.get("slug");
  const previewSecret = searchParams.get("previewSecret");

  const configuredSecret = process.env.PREVIEW_SECRET;
  if (!configuredSecret) {
    return new Response("PREVIEW_SECRET is not configured", { status: 500 });
  }

  if (previewSecret !== configuredSecret) {
    return new Response("Invalid preview secret", { status: 403 });
  }

  if (!path || !collection || !slug) {
    return new Response("Missing path, collection, or slug", { status: 400 });
  }

  if (!path.startsWith("/")) {
    return new Response("Preview path must be relative", { status: 400 });
  }

  const expectedPath = getCollectionFrontPath(collection, slug);
  if (!expectedPath || path !== expectedPath) {
    return new Response("Preview path does not match collection slug", { status: 400 });
  }

  const draft = await draftMode();
  draft.enable();
  redirect(path);
}
