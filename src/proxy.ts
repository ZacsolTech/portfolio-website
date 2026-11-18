import { NextResponse, type NextRequest } from "next/server";
import { zacbosRedirect } from "@/lib/zacbos-redirects";

/**
 * Applies redirects managed in ZACBOS / the Redirects collection.
 *
 * Next 16 renamed middleware.ts to proxy.ts; it always runs on Node.js (a
 * `runtime` export here is an error), which the pg lookup needs.
 * Redirects in next.config.ts run before this and win on a clash.
 */
export async function proxy(req: NextRequest) {
  return (await zacbosRedirect(req)) ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/|admin|_next/static|_next/image|favicon.ico).*)"],
};
