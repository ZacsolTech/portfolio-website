import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

/**
 * ZACBOS connector storage: per-page SEO overrides and managed redirects.
 * Kept in lockstep with scripts/apply-migration.cjs.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "seo" (
      "id" serial PRIMARY KEY NOT NULL,
      "page_id" varchar NOT NULL,
      "meta_title" varchar,
      "meta_description" varchar,
      "canonical" varchar,
      "noindex" boolean DEFAULT false,
      "schema" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "seo_page_id_idx" ON "seo" USING btree ("page_id");
    CREATE INDEX IF NOT EXISTS "seo_updated_at_idx" ON "seo" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "seo_created_at_idx" ON "seo" USING btree ("created_at");

    CREATE TABLE IF NOT EXISTS "redirects" (
      "id" serial PRIMARY KEY NOT NULL,
      "source" varchar NOT NULL,
      "target" varchar NOT NULL,
      "status_code" numeric DEFAULT 301 NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "redirects_source_idx" ON "redirects" USING btree ("source");
    CREATE INDEX IF NOT EXISTS "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "redirects_created_at_idx" ON "redirects" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "seo_id" integer;
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_seo_fk";
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_seo_fk"
      FOREIGN KEY ("seo_id") REFERENCES "public"."seo"("id") ON DELETE cascade;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_seo_id_idx"
      ON "payload_locked_documents_rels" USING btree ("seo_id");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "redirects_id" integer;
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_redirects_fk";
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk"
      FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_redirects_id_idx"
      ON "payload_locked_documents_rels" USING btree ("redirects_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "payload_locked_documents_rels" WHERE "seo_id" IS NOT NULL OR "redirects_id" IS NOT NULL;
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_seo_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "seo_id";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_redirects_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "redirects_id";
    DROP TABLE IF EXISTS "seo" CASCADE;
    DROP TABLE IF EXISTS "redirects" CASCADE;
  `);
}
