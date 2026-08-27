/**
 * Applies a Payload migration's SQL directly, because `pnpm payload migrate`
 * cannot run in this repo on Node 24: Payload's CLI reaches payload.config.ts
 * through `require()`, the root package.json has no `"type": "module"` so the
 * config loads as CJS, and `@payloadcms/richtext-lexical` has a top-level
 * await that Node refuses to `require()` (ERR_REQUIRE_ASYNC_MODULE).
 *
 * Everything else matches what Payload's runner does: one transaction, and a
 * `payload_migrations` row on success so its own tooling stays in sync once
 * the CLI is usable again (Node 20/22, or `"type": "module"` on the package).
 *
 *   node scripts/apply-migration.cjs <migration-name> --check
 *   node scripts/apply-migration.cjs <migration-name> --apply
 *   node scripts/apply-migration.cjs --list
 */
require('dotenv').config({ path: '.env', quiet: true })
require('dotenv').config({ path: '.env.local', quiet: true, override: true })

const { Pool } = require(
  require.resolve('pg', {
    paths: [require.resolve('@payloadcms/db-postgres')],
  }),
)

const NAME = process.argv[2]
const APPLY = process.argv.includes('--apply')
const LIST = process.argv.includes('--list') || NAME === '--list'

/**
 * Kept in lockstep with src/migrations/<NAME>.ts — see the note above on why this
 * cannot simply import that file through the Payload CLI.
 *
 * `preflight` is optional SQL that must return `{ n: 0 }` (or be skipped) before
 * applying a destructive change. Omit it when the change is safe to re-run.
 */
const MIGRATIONS = {
  '20260806_071631_drop_booking_reminder_sent_at': {
    sql: 'ALTER TABLE "bookings" DROP COLUMN IF EXISTS "reminder_sent_at";',
    preflight: {
      sql: `select count(*)::int n from bookings where reminder_sent_at is not null`,
      label: 'rows with reminder_sent_at NOT NULL',
      refuseIfPositive: true,
    },
  },
  '20260807_114500_drop_testimonials': {
    // Order matters: clear the locked-docs FK column, drop it, then drop the
    // collection table. CASCADE alone is not enough — Payload keeps a
    // `testimonials_id` column on `payload_locked_documents_rels`.
    sql: `
      DELETE FROM "payload_locked_documents_rels" WHERE "testimonials_id" IS NOT NULL;
      ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "testimonials_id";
      DROP TABLE IF EXISTS "testimonials" CASCADE;
    `.replace(/\s+/g, ' ').trim(),
    preflight: {
      sql: 'select count(*)::int as n from testimonials',
      label: 'testimonials rows that will be removed',
      refuseIfPositive: false,
    },
  },
  '20260807_121800_drop_industries': {
    sql: `
      DELETE FROM "payload_locked_documents_rels" WHERE "industries_id" IS NOT NULL;
      ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "industries_id";
      DROP TABLE IF EXISTS "_industries_v_version_problems" CASCADE;
      DROP TABLE IF EXISTS "_industries_v_version_services" CASCADE;
      DROP TABLE IF EXISTS "_industries_v" CASCADE;
      DROP TABLE IF EXISTS "industries_problems" CASCADE;
      DROP TABLE IF EXISTS "industries_services" CASCADE;
      DROP TABLE IF EXISTS "industries" CASCADE;
    `.replace(/\s+/g, ' ').trim(),
    preflight: {
      sql: 'select count(*)::int as n from industries',
      label: 'industries rows that will be removed',
      refuseIfPositive: false,
    },
  },
  '20260807_122400_drop_faqs': {
    sql: `
      DELETE FROM "payload_locked_documents_rels" WHERE "faqs_id" IS NOT NULL;
      ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "faqs_id";
      DROP TABLE IF EXISTS "faqs" CASCADE;
    `.replace(/\s+/g, ' ').trim(),
    preflight: {
      sql: 'select count(*)::int as n from faqs',
      label: 'faqs rows that will be removed',
      refuseIfPositive: false,
    },
  },
  '20260807_123000_drop_portfolio': {
    sql: `
      DELETE FROM "payload_locked_documents_rels" WHERE "portfolio_id" IS NOT NULL;
      ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "portfolio_id";
      DROP TABLE IF EXISTS "_portfolio_v_version_related_services" CASCADE;
      DROP TABLE IF EXISTS "_portfolio_v_version_results" CASCADE;
      DROP TABLE IF EXISTS "_portfolio_v_version_stack" CASCADE;
      DROP TABLE IF EXISTS "_portfolio_v" CASCADE;
      DROP TABLE IF EXISTS "portfolio_related_services" CASCADE;
      DROP TABLE IF EXISTS "portfolio_results" CASCADE;
      DROP TABLE IF EXISTS "portfolio_stack" CASCADE;
      DROP TABLE IF EXISTS "portfolio" CASCADE;
    `.replace(/\s+/g, ' ').trim(),
    preflight: {
      sql: 'select count(*)::int as n from portfolio',
      label: 'portfolio rows that will be removed',
      refuseIfPositive: false,
    },
  },
  '20260810_090000_roadmap_prototype': {
    // Additive and nullable, so it is safe to re-run and needs no preflight.
    sql: 'ALTER TABLE "roadmaps" ADD COLUMN IF NOT EXISTS "prototype" jsonb;',
  },
  '20260827_125100_drop_insights_and_media': {
    sql: `
      DELETE FROM "payload_locked_documents_rels" WHERE "insights_id" IS NOT NULL;
      DELETE FROM "payload_locked_documents_rels" WHERE "media_id" IS NOT NULL;
      ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "insights_id";
      ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "media_id";
      DROP TABLE IF EXISTS "_insights_v_version_body" CASCADE;
      DROP TABLE IF EXISTS "_insights_v_version_related" CASCADE;
      DROP TABLE IF EXISTS "_insights_v" CASCADE;
      DROP TABLE IF EXISTS "insights_body" CASCADE;
      DROP TABLE IF EXISTS "insights_related" CASCADE;
      DROP TABLE IF EXISTS "insights" CASCADE;
      DROP TABLE IF EXISTS "media" CASCADE;
    `.replace(/\s+/g, ' ').trim(),
    preflight: {
      sql: 'select (select count(*) from insights)::int + (select count(*) from media)::int as n',
      label: 'insights + media rows that will be removed',
      refuseIfPositive: false,
    },
  },
  '20260827_140000_users_role': {
    sql: `
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" varchar;
      UPDATE "users" SET "role" = 'owner' WHERE "role" IS NULL OR "role" = '';
      ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'staff';
      ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;
      CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");
    `.replace(/\s+/g, ' ').trim(),
  },
  '20260827_150000_posts': {
    sql: `
      DO $$ BEGIN CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN CREATE TYPE "public"."enum_posts_tools" AS ENUM('consultant', 'estimator'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      CREATE TABLE IF NOT EXISTS "posts" (
        "id" serial PRIMARY KEY NOT NULL,
        "title" varchar NOT NULL,
        "slug" varchar NOT NULL,
        "status" "enum_posts_status" DEFAULT 'draft' NOT NULL,
        "category" varchar NOT NULL,
        "date" timestamp(3) with time zone NOT NULL,
        "last_reviewed" timestamp(3) with time zone,
        "author" varchar NOT NULL,
        "reading_time" varchar,
        "excerpt" varchar NOT NULL,
        "answer" varchar NOT NULL,
        "cover_src" varchar,
        "cover_alt" varchar,
        "cover_caption" varchar,
        "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "posts_slug_idx" ON "posts" USING btree ("slug");
      CREATE INDEX IF NOT EXISTS "posts_status_idx" ON "posts" USING btree ("status");
      CREATE INDEX IF NOT EXISTS "posts_date_idx" ON "posts" USING btree ("date");
      CREATE INDEX IF NOT EXISTS "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
      CREATE INDEX IF NOT EXISTS "posts_created_at_idx" ON "posts" USING btree ("created_at");
      CREATE TABLE IF NOT EXISTS "posts_body" (
        "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL, "paragraph" varchar NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "posts_body_order_idx" ON "posts_body" USING btree ("_order");
      CREATE INDEX IF NOT EXISTS "posts_body_parent_id_idx" ON "posts_body" USING btree ("_parent_id");
      ALTER TABLE "posts_body" DROP CONSTRAINT IF EXISTS "posts_body_parent_id_fk";
      ALTER TABLE "posts_body" ADD CONSTRAINT "posts_body_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
      CREATE TABLE IF NOT EXISTS "posts_faqs" (
        "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL, "q" varchar NOT NULL, "a" varchar NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "posts_faqs_order_idx" ON "posts_faqs" USING btree ("_order");
      CREATE INDEX IF NOT EXISTS "posts_faqs_parent_id_idx" ON "posts_faqs" USING btree ("_parent_id");
      ALTER TABLE "posts_faqs" DROP CONSTRAINT IF EXISTS "posts_faqs_parent_id_fk";
      ALTER TABLE "posts_faqs" ADD CONSTRAINT "posts_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
      CREATE TABLE IF NOT EXISTS "posts_keywords" (
        "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL, "value" varchar NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "posts_keywords_order_idx" ON "posts_keywords" USING btree ("_order");
      CREATE INDEX IF NOT EXISTS "posts_keywords_parent_id_idx" ON "posts_keywords" USING btree ("_parent_id");
      ALTER TABLE "posts_keywords" DROP CONSTRAINT IF EXISTS "posts_keywords_parent_id_fk";
      ALTER TABLE "posts_keywords" ADD CONSTRAINT "posts_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
      CREATE TABLE IF NOT EXISTS "posts_related" (
        "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL, "value" varchar NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "posts_related_order_idx" ON "posts_related" USING btree ("_order");
      CREATE INDEX IF NOT EXISTS "posts_related_parent_id_idx" ON "posts_related" USING btree ("_parent_id");
      ALTER TABLE "posts_related" DROP CONSTRAINT IF EXISTS "posts_related_parent_id_fk";
      ALTER TABLE "posts_related" ADD CONSTRAINT "posts_related_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
      CREATE TABLE IF NOT EXISTS "posts_tools" (
        "order" integer NOT NULL, "parent_id" integer NOT NULL, "value" "enum_posts_tools", "id" serial PRIMARY KEY NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "posts_tools_order_idx" ON "posts_tools" USING btree ("order");
      CREATE INDEX IF NOT EXISTS "posts_tools_parent_idx" ON "posts_tools" USING btree ("parent_id");
      ALTER TABLE "posts_tools" DROP CONSTRAINT IF EXISTS "posts_tools_parent_fk";
      ALTER TABLE "posts_tools" ADD CONSTRAINT "posts_tools_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
      ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "posts_id" integer;
      ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_posts_fk";
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade;
      CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
    `.replace(/\s+/g, ' ').trim(),
  },
  '20260827_180000_posts_editor': {
    sql: `
      ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "body" varchar;
      UPDATE "posts" AS p SET "body" = COALESCE((SELECT string_agg("paragraph", chr(10)||chr(10) ORDER BY "_order") FROM "posts_body" AS b WHERE b."_parent_id" = p."id"), '');
      UPDATE "posts" SET "body" = '' WHERE "body" IS NULL;
      ALTER TABLE "posts" ALTER COLUMN "excerpt" DROP NOT NULL;
      ALTER TABLE "posts" ALTER COLUMN "answer" DROP NOT NULL;
      ALTER TABLE "posts" ALTER COLUMN "category" DROP NOT NULL;
      DROP TABLE IF EXISTS "posts_body" CASCADE;
    `.replace(/\s+/g, ' ').trim(),
  },
  '20260827_190000_media': {
    sql: `
      CREATE TABLE IF NOT EXISTS "media" (
        "id" serial PRIMARY KEY NOT NULL,
        "alt" varchar,
        "caption" varchar,
        "prefix" varchar,
        "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
        "url" varchar,
        "thumbnail_u_r_l" varchar,
        "filename" varchar,
        "mime_type" varchar,
        "filesize" numeric,
        "width" numeric,
        "height" numeric,
        "focal_x" numeric,
        "focal_y" numeric
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "media_filename_idx" ON "media" USING btree ("filename");
      CREATE INDEX IF NOT EXISTS "media_updated_at_idx" ON "media" USING btree ("updated_at");
      CREATE INDEX IF NOT EXISTS "media_created_at_idx" ON "media" USING btree ("created_at");
      ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "media_id" integer;
      ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_media_fk";
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade;
      CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
      ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "image_id" integer;
      ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_image_id_media_id_fk";
      ALTER TABLE "posts" ADD CONSTRAINT "posts_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
      CREATE INDEX IF NOT EXISTS "posts_image_idx" ON "posts" USING btree ("image_id");
    `.replace(/\s+/g, ' ').trim(),
  },
  '20260827_200000_post_tags': {
    sql: `
      ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "tags" varchar;
      UPDATE "posts" AS p SET "tags" = COALESCE((
        SELECT string_agg("value", ', ' ORDER BY "_order")
        FROM "posts_keywords" AS k
        WHERE k."_parent_id" = p."id"
      ), p."tags")
      WHERE p."tags" IS NULL OR p."tags" = '';
    `.replace(/\s+/g, ' ').trim(),
  },
}

function normalizeDatabaseUrl(url) {
  if (!url) return url
  if (/[?&]sslmode=verify-full(?:&|$)/i.test(url)) return url
  if (/[?&]sslmode=/i.test(url)) {
    return url.replace(/([?&]sslmode=)[^&]*/i, '$1verify-full')
  }
  return url.includes('?') ? `${url}&sslmode=verify-full` : `${url}?sslmode=verify-full`
}

async function main() {
  if (LIST) {
    console.log(Object.keys(MIGRATIONS).join('\n'))
    return
  }

  if (!NAME || NAME.startsWith('--')) {
    throw new Error(
      'usage: node scripts/apply-migration.cjs <migration-name> [--check|--apply]\n' +
        '       node scripts/apply-migration.cjs --list',
    )
  }

  const migration = MIGRATIONS[NAME]
  if (!migration) throw new Error(`no SQL registered for migration "${NAME}"`)

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

  const pool = new Pool({ connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL) })
  const c = await pool.connect()
  try {
    const done = await c.query('select 1 from payload_migrations where name = $1', [NAME])
    if (done.rowCount) {
      console.log(`already applied: ${NAME}`)
      return
    }

    if (migration.preflight) {
      const live = await c.query(migration.preflight.sql)
      const col = migration.preflight.countColumn || 'n'
      const n = live.rows[0]?.[col] ?? live.rows[0]?.n ?? 0
      console.log(`${migration.preflight.label}: ${n}`)
      if (migration.preflight.refuseIfPositive && Number(n) > 0) {
        throw new Error('preflight refused — migration would destroy live data')
      }
    }

    if (!APPLY) {
      console.log('\n--check only, nothing written. SQL that would run:\n')
      console.log('  ' + migration.sql)
      return
    }

    await c.query('BEGIN')
    await c.query(migration.sql)
    await c.query(
      `insert into payload_migrations (name, batch, updated_at, created_at)
       values ($1, (select coalesce(max(batch), 0) + 1 from payload_migrations where batch > 0), now(), now())`,
      [NAME],
    )
    await c.query('COMMIT')
    console.log(`applied: ${NAME}`)
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    c.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
