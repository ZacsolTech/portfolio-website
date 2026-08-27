import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds `users.role` and backfills every existing account as owner.
 *
 * Existing rows are the people who already had the keys to the admin. New
 * invites default to `staff` in the collection config; the SQL default after
 * backfill is also `staff` so a raw insert cannot accidentally mint an owner.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" varchar;
    UPDATE "users" SET "role" = 'owner' WHERE "role" IS NULL OR "role" = '';
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'staff';
    ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;
    CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
  `)
}
