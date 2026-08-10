import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drops the Payload `portfolio` collection (and draft version tables).
 * Portfolio is now code-only in `lib/content/portfolio.ts` (same pattern as
 * services, industries, testimonials, faqs).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portfolio" (
      "id" serial PRIMARY KEY NOT NULL,
      "slug" varchar NOT NULL,
      "title" varchar NOT NULL,
      "client" varchar NOT NULL,
      "sector" varchar NOT NULL,
      "metric" varchar NOT NULL,
      "summary" varchar NOT NULL,
      "problem" varchar NOT NULL,
      "built" varchar NOT NULL,
      "quote" varchar,
      "timeline" varchar,
      "interactive" boolean DEFAULT false,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_slug_idx" ON "portfolio" USING btree ("slug");
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "portfolio_id" integer;
  `)
}
