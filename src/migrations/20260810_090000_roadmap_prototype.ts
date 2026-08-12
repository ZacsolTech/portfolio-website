import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds `roadmaps.prototype` — the generated visual mock, frozen alongside the
 * blueprint so a forwarded link keeps showing what the sender forwarded.
 *
 * Nullable with no backfill on purpose: roadmaps minted before this shipped
 * genuinely have no prototype, and inventing one for them would put a mock in
 * front of a recipient that the sender never saw.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "roadmaps" ADD COLUMN IF NOT EXISTS "prototype" jsonb;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "roadmaps" DROP COLUMN IF EXISTS "prototype";
  `)
}
