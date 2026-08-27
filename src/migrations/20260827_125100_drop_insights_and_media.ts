import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drops the Payload `insights` and `media` collections (including insight
 * draft-version tables). Insights are now code-only in `lib/content/insights.ts`
 * (same pattern as services, industries, testimonials, faqs, portfolio).
 * Media was unused — zero upload rows.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "insights" (
      "id" serial PRIMARY KEY NOT NULL,
      "slug" varchar NOT NULL,
      "title" varchar NOT NULL,
      "excerpt" varchar NOT NULL,
      "category" varchar NOT NULL,
      "date" varchar NOT NULL,
      "author" varchar NOT NULL,
      "reading_time" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "insights_slug_idx" ON "insights" USING btree ("slug");
    CREATE TABLE IF NOT EXISTS "media" (
      "id" serial PRIMARY KEY NOT NULL,
      "alt" varchar,
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
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "insights_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "media_id" integer;
  `)
}
