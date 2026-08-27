import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Public blog as a Payload collection (`posts`).
 *
 * Drafts stay off /blog. Body, FAQs, keywords and related slugs are array
 * tables so the admin UI can edit them without a JSON blob.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_posts_tools" AS ENUM('consultant', 'estimator');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

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
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "paragraph" varchar NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "posts_body_order_idx" ON "posts_body" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "posts_body_parent_id_idx" ON "posts_body" USING btree ("_parent_id");
    ALTER TABLE "posts_body" DROP CONSTRAINT IF EXISTS "posts_body_parent_id_fk";
    ALTER TABLE "posts_body" ADD CONSTRAINT "posts_body_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;

    CREATE TABLE IF NOT EXISTS "posts_faqs" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "q" varchar NOT NULL,
      "a" varchar NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "posts_faqs_order_idx" ON "posts_faqs" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "posts_faqs_parent_id_idx" ON "posts_faqs" USING btree ("_parent_id");
    ALTER TABLE "posts_faqs" DROP CONSTRAINT IF EXISTS "posts_faqs_parent_id_fk";
    ALTER TABLE "posts_faqs" ADD CONSTRAINT "posts_faqs_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;

    CREATE TABLE IF NOT EXISTS "posts_keywords" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "value" varchar NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "posts_keywords_order_idx" ON "posts_keywords" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "posts_keywords_parent_id_idx" ON "posts_keywords" USING btree ("_parent_id");
    ALTER TABLE "posts_keywords" DROP CONSTRAINT IF EXISTS "posts_keywords_parent_id_fk";
    ALTER TABLE "posts_keywords" ADD CONSTRAINT "posts_keywords_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;

    CREATE TABLE IF NOT EXISTS "posts_related" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "value" varchar NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "posts_related_order_idx" ON "posts_related" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "posts_related_parent_id_idx" ON "posts_related" USING btree ("_parent_id");
    ALTER TABLE "posts_related" DROP CONSTRAINT IF EXISTS "posts_related_parent_id_fk";
    ALTER TABLE "posts_related" ADD CONSTRAINT "posts_related_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;

    CREATE TABLE IF NOT EXISTS "posts_tools" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "enum_posts_tools",
      "id" serial PRIMARY KEY NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "posts_tools_order_idx" ON "posts_tools" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "posts_tools_parent_idx" ON "posts_tools" USING btree ("parent_id");
    ALTER TABLE "posts_tools" DROP CONSTRAINT IF EXISTS "posts_tools_parent_fk";
    ALTER TABLE "posts_tools" ADD CONSTRAINT "posts_tools_parent_fk"
      FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "posts_id" integer;
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_posts_fk";
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk"
      FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_posts_id_idx"
      ON "payload_locked_documents_rels" USING btree ("posts_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "payload_locked_documents_rels" WHERE "posts_id" IS NOT NULL;
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_posts_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "posts_id";
    DROP TABLE IF EXISTS "posts_tools" CASCADE;
    DROP TABLE IF EXISTS "posts_related" CASCADE;
    DROP TABLE IF EXISTS "posts_keywords" CASCADE;
    DROP TABLE IF EXISTS "posts_faqs" CASCADE;
    DROP TABLE IF EXISTS "posts_body" CASCADE;
    DROP TABLE IF EXISTS "posts" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_posts_tools";
    DROP TYPE IF EXISTS "public"."enum_posts_status";
  `)
}
