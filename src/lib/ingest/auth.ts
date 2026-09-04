import { safeEqual } from "@/lib/security/tokens";

/**
 * Machine ingest for ZACBOS (and later other publishers).
 *
 * This route creates and publishes posts, so it is never open. A missing
 * secret refuses the request in every environment — unlike cron, which is
 * convenient to run locally without one. An unauthenticated ingest endpoint
 * is a public CMS write.
 */
export function authorizeIngest(
  request: Request,
): { ok: true } | { ok: false; response: Response } {
  const secret = process.env.BLOG_INGEST_SECRET;

  if (!secret) {
    console.error("[ingest] BLOG_INGEST_SECRET is not set — refusing to run.");
    return {
      ok: false,
      response: Response.json({ error: "Ingest is not configured." }, { status: 503 }),
    };
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!provided || !safeEqual(provided, secret)) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true };
}
