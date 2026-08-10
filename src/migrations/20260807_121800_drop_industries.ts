import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drops the Payload `industries` collection (and draft version tables).
 * Industries are now code-only in `lib/content/industries.ts` (same pattern
 * as services and testimonials).
 *
 * Does not touch `leads.industry` — that is lead capture metadata, not CMS.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "payload_locked_documents_rels" WHERE "industries_id" IS NOT NULL;
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "industries_id";
    DROP TABLE IF EXISTS "_industries_v_version_problems" CASCADE;
    DROP TABLE IF EXISTS "_industries_v_version_services" CASCADE;
    DROP TABLE IF EXISTS "_industries_v" CASCADE;
    DROP TABLE IF EXISTS "industries_problems" CASCADE;
    DROP TABLE IF EXISTS "industries_services" CASCADE;
    DROP TABLE IF EXISTS "industries" CASCADE;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "industries" (
      "id" serial PRIMARY KEY NOT NULL,
      "slug" varchar NOT NULL,
      "name" varchar NOT NULL,
      "problem_one_liner" varchar NOT NULL,
      "icon" varchar NOT NULL,
      "compliance" varchar,
      "seo_description" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "_status" "enum_industries_status" DEFAULT 'draft'
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "industries_slug_idx" ON "industries" USING btree ("slug");
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "industries_id" integer;
  `)
}
