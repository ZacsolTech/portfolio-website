import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { config as loadEnv } from "dotenv";
import { insights } from "../src/lib/content/insights";
import { normalizeDatabaseUrl } from "../src/lib/db";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local" });

const require = createRequire(__filename);
const { Pool } = require(
  require.resolve("pg", { paths: [require.resolve("@payloadcms/db-postgres")] }),
) as typeof import("pg");

function rid(): string {
  return randomBytes(8).toString("hex");
}

function dayStamp(value: string | undefined): string | null {
  if (!value) return null;
  return `${value.slice(0, 10)}T12:00:00.000Z`;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const force = process.argv.includes("--force");
  const pool = new Pool({ connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL) });
  const client = await pool.connect();
  let created = 0;
  let skipped = 0;

  try {
    if (force) {
      const slugs = insights.map((post) => post.slug);
      const removed = await client.query("delete from posts where slug = any($1::text[])", [slugs]);
      console.log(`force: removed ${removed.rowCount ?? 0} existing seed posts`);
    }

    for (const post of insights) {
      const exists = await client.query("select id from posts where slug = $1", [post.slug]);
      if (exists.rowCount) {
        skipped += 1;
        continue;
      }

      await client.query("begin");
      try {
        const inserted = await client.query<{ id: number }>(
          `insert into posts (
             title, slug, status, category, date, last_reviewed, author, reading_time,
             excerpt, answer, cover_src, cover_alt, cover_caption, body, tags, updated_at, created_at
           ) values (
             $1,$2,'published',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now(), now()
           ) returning id`,
          [
            post.title,
            post.slug,
            post.category,
            dayStamp(post.date),
            dayStamp(post.lastReviewed),
            post.author,
            post.readingTime,
            post.excerpt,
            post.answer,
            post.cover?.src ?? null,
            post.cover?.alt ?? null,
            post.cover?.caption ?? null,
            post.body.join("\n\n"),
            post.keywords.join(", "),
          ],
        );
        const id = inserted.rows[0].id;

        for (let i = 0; i < post.faqs.length; i += 1) {
          await client.query(
            `insert into posts_faqs (_order, _parent_id, id, q, a) values ($1,$2,$3,$4,$5)`,
            [i + 1, id, rid(), post.faqs[i].q, post.faqs[i].a],
          );
        }
        for (let i = 0; i < post.keywords.length; i += 1) {
          await client.query(
            `insert into posts_keywords (_order, _parent_id, id, value) values ($1,$2,$3,$4)`,
            [i + 1, id, rid(), post.keywords[i]],
          );
        }
        for (let i = 0; i < post.related.length; i += 1) {
          await client.query(
            `insert into posts_related (_order, _parent_id, id, value) values ($1,$2,$3,$4)`,
            [i + 1, id, rid(), post.related[i]],
          );
        }
        for (let i = 0; i < post.tools.length; i += 1) {
          await client.query(
            `insert into posts_tools ("order", parent_id, value) values ($1,$2,$3)`,
            [i + 1, id, post.tools[i]],
          );
        }

        await client.query("commit");
        created += 1;
        console.log(`seeded ${post.slug}`);
      } catch (err) {
        await client.query("rollback");
        throw err;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`done: ${created} created, ${skipped} already present`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
