import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

/** One Tags text field: paste "AI, automation, n8n" instead of adding rows. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "tags" varchar;
    UPDATE "posts" AS p
    SET "tags" = COALESCE((
      SELECT string_agg("value", ', ' ORDER BY "_order")
      FROM "posts_keywords" AS k
      WHERE k."_parent_id" = p."id"
    ), p."tags")
    WHERE p."tags" IS NULL OR p."tags" = '';
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "tags";
  `);
}
