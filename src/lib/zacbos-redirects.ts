import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { normalizeDatabaseUrl } from "@/lib/db";

/**
 * Redirect lookup for src/proxy.ts.
 *
 * The proxy runs before every page request, so this deliberately does not
 * load Payload: it reads the `redirects` table with one small pg query and
 * keeps the result in memory for CACHE_MS. A redirect created in ZACBOS
 * therefore reaches every server instance within a minute.
 *
 * Fails open: no database, or no table yet, means "no redirects" — a broken
 * lookup must never take the site down.
 */

const CACHE_MS = 60_000;

type Hit = { target: string; status: number };

let pool: Pool | null = null;
let table: Map<string, Hit> | null = null;
let loadedAt = 0;
let loading: Promise<Map<string, Hit>> | null = null;
let warned = false;

/** "/old/" and "/old" are the same source. */
export function normalizeSource(path: string): string {
  const trimmed = path.trim();
  return trimmed.length > 1 ? trimmed.replace(/\/+$/, "") : trimmed;
}

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool ??= new Pool({
    connectionString: normalizeDatabaseUrl(url),
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  return pool;
}

async function load(): Promise<Map<string, Hit>> {
  const map = new Map<string, Hit>();
  const db = getPool();
  if (!db) return map;
  try {
    const { rows } = await db.query<{ source: string; target: string; status_code: string | number }>(
      'select "source", "target", "status_code" from "redirects"',
    );
    for (const row of rows) {
      map.set(normalizeSource(row.source), { target: row.target, status: Number(row.status_code) || 301 });
    }
  } catch (error) {
    if (!warned) {
      warned = true;
      console.warn("[redirects] lookup failed, serving without redirects:", error instanceof Error ? error.message : error);
    }
  }
  return map;
}

async function redirectTable(): Promise<Map<string, Hit>> {
  if (table && Date.now() - loadedAt < CACHE_MS) return table;
  loading ??= load().finally(() => {
    loading = null;
  });
  table = await loading;
  loadedAt = Date.now();
  return table;
}

/** A redirect response when ZACBOS created one for this path, else null. Call from proxy. */
export async function zacbosRedirect(req: NextRequest): Promise<NextResponse | null> {
  const path = req.nextUrl.pathname.replace(/\/$/, "");
  if ((req.method !== "GET" && req.method !== "HEAD") || !path) return null;
  const hit = (await redirectTable()).get(path);
  if (!hit) return null;
  const target = new URL(hit.target, req.url);
  if (target.origin === req.nextUrl.origin && normalizeSource(target.pathname) === path) return null;
  return NextResponse.redirect(target, hit.status);
}
