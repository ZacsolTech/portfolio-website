/**
 * Neon (and most cloud Postgres) URLs use sslmode=require.
 * Current node-pg treats that as verify-full and emits a deprecation warning.
 * Pin verify-full explicitly so behavior stays the same and the warning stops.
 *
 * Uses string surgery (not URL()) so passwords with special characters stay intact.
 */
export function normalizeDatabaseUrl(url: string): string {
  if (!url) return url
  if (/[?&]sslmode=verify-full(?:&|$)/i.test(url)) return url
  if (/[?&]sslmode=/i.test(url)) {
    return url.replace(/([?&]sslmode=)[^&]*/i, "$1verify-full")
  }
  return url.includes("?") ? `${url}&sslmode=verify-full` : `${url}?sslmode=verify-full`
}
