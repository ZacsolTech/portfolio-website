import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drops the Payload `faqs` collection. Site FAQs are now code-only in
 * `lib/content/faqs.ts` (same pattern as services, industries, testimonials).
 * Per-service FAQs already live on each service in `lib/content/services.ts`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "payload_locked_documents_rels" WHERE "faqs_id" IS NOT NULL;
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "faqs_id";
    DROP TABLE IF EXISTS "faqs" CASCADE;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "faqs" (
      "id" serial PRIMARY KEY NOT NULL,
      "q" varchar NOT NULL,
      "a" varchar NOT NULL,
      "order" numeric NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "faqs_id" integer;
  `)
}
