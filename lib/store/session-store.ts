import { Redis } from "@upstash/redis";
import type { z } from "zod";

/**
 * Generic server-side session storage.
 *
 * Upstash Redis when configured, an in-process LRU otherwise. The memory path
 * is correct for a single dev server and degrades gracefully across serverless
 * instances — a cold instance starts the visitor fresh rather than erroring.
 *
 * Both the consultant and the estimator keep their conversation state here so
 * the client only ever holds a session id. Nothing the browser sends can forge
 * a transcript, skip an intake step, or change a quoted price.
 */

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!redis) redis = Redis.fromEnv();
  return redis;
}

export type SessionStore<T> = {
  load: (id: string) => Promise<T | null>;
  save: (id: string, value: T) => Promise<void>;
  clear: (id: string) => Promise<void>;
};

export type SessionStoreOptions<T> = {
  /** Redis key namespace, e.g. "zacsol:consultant:session". */
  prefix: string;
  schema: z.ZodType<T>;
  ttlSeconds: number;
  /** Max sessions held in the memory fallback before LRU eviction. */
  maxMemorySessions?: number;
};

export function createSessionStore<T>(options: SessionStoreOptions<T>): SessionStore<T> {
  const { prefix, schema, ttlSeconds } = options;
  const maxSessions = options.maxMemorySessions ?? 500;

  type Entry = { value: T; expires: number };
  const memory = new Map<string, Entry>();

  const key = (id: string) => `${prefix}:${id}`;

  function memoryGet(id: string): T | null {
    const entry = memory.get(id);
    if (!entry) return null;
    if (entry.expires <= Date.now()) {
      memory.delete(id);
      return null;
    }
    // Refresh LRU position so active conversations survive eviction.
    memory.delete(id);
    memory.set(id, entry);
    return entry.value;
  }

  function memorySet(id: string, value: T): void {
    memory.set(id, { value, expires: Date.now() + ttlSeconds * 1000 });
    if (memory.size <= maxSessions) return;

    const now = Date.now();
    for (const [k, entry] of memory) {
      if (entry.expires <= now) memory.delete(k);
    }
    while (memory.size > maxSessions) {
      const oldest = memory.keys().next().value;
      if (oldest === undefined) break;
      memory.delete(oldest);
    }
  }

  return {
    async load(id) {
      const client = getRedis();
      if (!client) return memoryGet(id);

      try {
        const raw = await client.get<unknown>(key(id));
        if (!raw) return null;
        const parsed = schema.safeParse(typeof raw === "string" ? JSON.parse(raw) : raw);
        // A shape change shouldn't 500 a live visitor — start them fresh.
        return parsed.success ? parsed.data : null;
      } catch (err) {
        console.error(`[${prefix}] load failed:`, err);
        return memoryGet(id);
      }
    },

    async save(id, value) {
      const client = getRedis();
      if (!client) {
        memorySet(id, value);
        return;
      }
      try {
        await client.set(key(id), JSON.stringify(value), { ex: ttlSeconds });
      } catch (err) {
        // Redis being down must not take the tool down with it.
        console.error(`[${prefix}] save failed, using memory:`, err);
        memorySet(id, value);
      }
    },

    async clear(id) {
      memory.delete(id);
      const client = getRedis();
      if (!client) return;
      try {
        await client.del(key(id));
      } catch (err) {
        console.error(`[${prefix}] clear failed:`, err);
      }
    },
  };
}
