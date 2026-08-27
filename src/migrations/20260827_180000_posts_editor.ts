import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * WordPress-style editor: one `posts.body` column instead of the paragraph
 * array table. Existing blocks are joined with blank lines so the public
 * renderer still sees the same headings, tables and figures.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "body" varchar;
    UPDATE "posts" AS p
    SET "body" = COALESCE((
      SELECT string_agg("paragraph", E'\n\n' ORDER BY "_order")
      FROM "posts_body" AS b
      WHERE b."_parent_id" = p."id"
    ), '');
    UPDATE "posts" SET "body" = '' WHERE "body" IS NULL;
    ALTER TABLE "posts" ALTER COLUMN "excerpt" DROP NOT NULL;
    ALTER TABLE "posts" ALTER COLUMN "answer" DROP NOT NULL;
    ALTER TABLE "posts" ALTER COLUMN "category" DROP NOT NULL;
    DROP TABLE IF EXISTS "posts_body" CASCADE;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "posts_body" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "paragraph" varchar NOT NULL
    );
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "body";
    ALTER TABLE "posts" ALTER COLUMN "excerpt" SET NOT NULL;
    ALTER TABLE "posts" ALTER COLUMN "answer" SET NOT NULL;
    ALTER TABLE "posts" ALTER COLUMN "category" SET NOT NULL;
  `)
}
