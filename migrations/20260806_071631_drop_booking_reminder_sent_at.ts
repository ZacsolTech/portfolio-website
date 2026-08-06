import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drops `bookings.reminder_sent_at`, left behind when the hourly booking
 * reminder was removed in 071f708. No code references the column any more
 * (`reminder_sent_at` / `reminderSentAt` appear nowhere in collections, lib,
 * app or scripts), and every row in `bookings` had it NULL, so no data is
 * carried by it.
 *
 * `down` restores the column *and* its index — dropping a column silently
 * drops the indexes over it, so recreating only the column would leave the
 * schema subtly different from where it started.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "reminder_sent_at";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp(3) with time zone;
    CREATE INDEX IF NOT EXISTS "bookings_reminder_sent_at_idx" ON "bookings" USING btree ("reminder_sent_at");
  `)
}
