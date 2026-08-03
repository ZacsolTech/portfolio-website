import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Dual-key rate limiting for a public, unauthenticated endpoint that spends
 * money on every call.
 *
 * IP guards against a single abuser; session guards against one visitor
 * looping the expensive blueprint path. Blueprint calls get their own, much
 * tighter budget than chat turns.
 */

type LimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
};

export type LimitKind = "turn" | "blueprint" | "gate";

const BUDGETS: Record<LimitKind, { session: number; windowMs: number }> = {
  turn: { session: 60, windowMs: 60 * 60 * 1000 },
  blueprint: { session: 5, windowMs: 60 * 60 * 1000 },
  gate: { session: 5, windowMs: 60 * 60 * 1000 },
};

const IP_BUDGET = { max: 150, windowMs: 24 * 60 * 60 * 1000 };

/* ----------------------------- memory fallback ---------------------------- */

type MemoryBucket = { count: number; reset: number };
const memoryStore = new Map<string, MemoryBucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of memoryStore) {
    if (bucket.reset <= now) memoryStore.delete(key);
  }
}

function memoryLimit(key: string, max: number, windowMs: number): LimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = memoryStore.get(key);
  if (!bucket || bucket.reset <= now) {
    const reset = now + windowMs;
    memoryStore.set(key, { count: 1, reset });
    return { success: true, remaining: max - 1, reset, limit: max };
  }
  if (bucket.count >= max) {
    return { success: false, remaining: 0, reset: bucket.reset, limit: max };
  }
  bucket.count += 1;
  return { success: true, remaining: max - bucket.count, reset: bucket.reset, limit: max };
}

/* -------------------------------- upstash -------------------------------- */

function hasUpstash() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

let limiters: { ip: Ratelimit; session: Record<LimitKind, Ratelimit> } | null = null;

function getLimiters() {
  if (!hasUpstash()) return null;
  if (!limiters) {
    const redis = Redis.fromEnv();
    const session = (kind: LimitKind, max: number, window: `${number} h`) =>
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, window),
        prefix: `zacsol:consultant:${kind}`,
        analytics: true,
      });

    limiters = {
      ip: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(IP_BUDGET.max, "24 h"),
        prefix: "zacsol:consultant:ip",
        analytics: true,
      }),
      session: {
        turn: session("turn", BUDGETS.turn.session, "1 h"),
        blueprint: session("blueprint", BUDGETS.blueprint.session, "1 h"),
        gate: session("gate", BUDGETS.gate.session, "1 h"),
      },
    };
  }
  return limiters;
}

export async function limitConsultant(opts: {
  ip: string;
  sessionId: string;
  kind: LimitKind;
}): Promise<LimitResult> {
  const { ip, sessionId, kind } = opts;
  const active = getLimiters();

  if (!active) {
    const ipResult = memoryLimit(`ip:${ip}`, IP_BUDGET.max, IP_BUDGET.windowMs);
    if (!ipResult.success) return ipResult;
    const budget = BUDGETS[kind];
    return memoryLimit(`session:${sessionId}:${kind}`, budget.session, budget.windowMs);
  }

  try {
    const ipRes = await active.ip.limit(ip || "unknown");
    if (!ipRes.success) {
      return {
        success: false,
        remaining: ipRes.remaining,
        reset: ipRes.reset,
        limit: ipRes.limit,
      };
    }

    const sessionRes = await active.session[kind].limit(sessionId);
    return {
      success: sessionRes.success,
      remaining: sessionRes.remaining,
      reset: sessionRes.reset,
      limit: sessionRes.limit,
    };
  } catch (err) {
    // Redis outage must not block legitimate visitors; memory still caps abuse.
    console.error("[consultant] rate limit backend failed, using memory:", err);
    const budget = BUDGETS[kind];
    return memoryLimit(`session:${sessionId}:${kind}`, budget.session, budget.windowMs);
  }
}

/**
 * Client IP from proxy headers.
 *
 * `x-forwarded-for` is caller-controlled unless a trusted proxy overwrote it,
 * so we prefer the platform-set headers Vercel and Cloudflare inject, and take
 * the left-most XFF entry only as a last resort.
 */
export function getClientIp(request: Request): string {
  const platform =
    request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip");
  if (platform?.trim()) return platform.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
