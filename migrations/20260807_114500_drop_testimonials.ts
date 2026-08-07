import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drops the Payload `testimonials` collection table. Testimonials are now
 * code-only in `lib/content/testimonials.ts` (same pattern as services).
 *
 * `down` restores a minimal table matching the old collection fields so a
 * rollback does not strand the schema — content itself still lives in code.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "payload_locked_documents_rels" WHERE "testimonials_id" IS NOT NULL;
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "testimonials_id";
    DROP TABLE IF EXISTS "testimonials" CASCADE;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "testimonials" (
      "id" serial PRIMARY KEY NOT NULL,
      "quote" varchar NOT NULL,
      "metric" varchar NOT NULL,
      "metric_label" varchar NOT NULL,
      "name" varchar NOT NULL,
      "role" varchar NOT NULL,
      "company" varchar NOT NULL,
      "initials" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "testimonials_created_at_idx" ON "testimonials" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "testimonials_updated_at_idx" ON "testimonials" USING btree ("updated_at");
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "testimonials_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_testimonials_fk"
        FOREIGN KEY ("testimonials_id") REFERENCES "testimonials"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_testimonials_id_idx"
      ON "payload_locked_documents_rels" USING btree ("testimonials_id");
  `)
}
