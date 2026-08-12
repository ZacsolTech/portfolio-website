/**
 * Applies a Payload migration's SQL directly, because `pnpm payload migrate`
 * cannot run in this repo on Node 24: Payload's CLI reaches payload.config.ts
 * through `require()`, the root package.json has no `"type": "module"` so the
 * config loads as CJS, and `@payloadcms/richtext-lexical` has a top-level
 * await that Node refuses to `require()` (ERR_REQUIRE_ASYNC_MODULE).
 *
 * Everything else matches what Payload's runner does: one transaction, and a
 * `payload_migrations` row on success so its own tooling stays in sync once
 * the CLI is usable again (Node 20/22, or `"type": "module"` on the package).
 *
 *   node scripts/apply-migration.cjs <migration-name> --check
 *   node scripts/apply-migration.cjs <migration-name> --apply
 *   node scripts/apply-migration.cjs --list
 */
require('dotenv').config({ path: '.env', quiet: true })

const { Pool } = require(
  require.resolve('pg', {
    paths: [require.resolve('@payloadcms/db-postgres')],
  }),
)

const NAME = process.argv[2]
const APPLY = process.argv.includes('--apply')
const LIST = process.argv.includes('--list') || NAME === '--list'

/**
 * Kept in lockstep with src/migrations/<NAME>.ts — see the note above on why this
 * cannot simply import that file through the Payload CLI.
 *
 * `preflight` is optional SQL that must return `{ n: 0 }` (or be skipped) before
 * applying a destructive change. Omit it when the change is safe to re-run.
 */
const MIGRATIONS = {
  '20260806_071631_drop_booking_reminder_sent_at': {
    sql: 'ALTER TABLE "bookings" DROP COLUMN IF EXISTS "reminder_sent_at";',
    preflight: {
      sql: `select count(*)::int n from bookings where reminder_sent_at is not null`,
      label: 'rows with reminder_sent_at NOT NULL',
      refuseIfPositive: true,
    },
  },
  '20260807_114500_drop_testimonials': {
    // Order matters: clear the locked-docs FK column, drop it, then drop the
    // collection table. CASCADE alone is not enough — Payload keeps a
    // `testimonials_id` column on `payload_locked_documents_rels`.
    sql: `
      DELETE FROM "payload_locked_documents_rels" WHERE "testimonials_id" IS NOT NULL;
      ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "testimonials_id";
      DROP TABLE IF EXISTS "testimonials" CASCADE;
    `.replace(/\s+/g, ' ').trim(),
    preflight: {
      sql: 'select count(*)::int as n from testimonials',
      label: 'testimonials rows that will be removed',
      refuseIfPositive: false,
    },
  },
  '20260807_121800_drop_industries': {
    sql: `
      DELETE FROM "payload_locked_documents_rels" WHERE "industries_id" IS NOT NULL;
      ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "industries_id";
      DROP TABLE IF EXISTS "_industries_v_version_problems" CASCADE;
      DROP TABLE IF EXISTS "_industries_v_version_services" CASCADE;
      DROP TABLE IF EXISTS "_industries_v" CASCADE;
      DROP TABLE IF EXISTS "industries_problems" CASCADE;
      DROP TABLE IF EXISTS "industries_services" CASCADE;
      DROP TABLE IF EXISTS "industries" CASCADE;
    `.replace(/\s+/g, ' ').trim(),
    preflight: {
      sql: 'select count(*)::int as n from industries',
      label: 'industries rows that will be removed',
      refuseIfPositive: false,
    },
  },
  '20260807_122400_drop_faqs': {
    sql: `
      DELETE FROM "payload_locked_documents_rels" WHERE "faqs_id" IS NOT NULL;
      ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "faqs_id";
      DROP TABLE IF EXISTS "faqs" CASCADE;
    `.replace(/\s+/g, ' ').trim(),
    preflight: {
      sql: 'select count(*)::int as n from faqs',
      label: 'faqs rows that will be removed',
      refuseIfPositive: false,
    },
  },
  '20260807_123000_drop_portfolio': {
    sql: `
      DELETE FROM "payload_locked_documents_rels" WHERE "portfolio_id" IS NOT NULL;
      ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "portfolio_id";
      DROP TABLE IF EXISTS "_portfolio_v_version_related_services" CASCADE;
      DROP TABLE IF EXISTS "_portfolio_v_version_results" CASCADE;
      DROP TABLE IF EXISTS "_portfolio_v_version_stack" CASCADE;
      DROP TABLE IF EXISTS "_portfolio_v" CASCADE;
      DROP TABLE IF EXISTS "portfolio_related_services" CASCADE;
      DROP TABLE IF EXISTS "portfolio_results" CASCADE;
      DROP TABLE IF EXISTS "portfolio_stack" CASCADE;
      DROP TABLE IF EXISTS "portfolio" CASCADE;
    `.replace(/\s+/g, ' ').trim(),
    preflight: {
      sql: 'select count(*)::int as n from portfolio',
      label: 'portfolio rows that will be removed',
      refuseIfPositive: false,
    },
  },
  '20260810_090000_roadmap_prototype': {
    // Additive and nullable, so it is safe to re-run and needs no preflight.
    sql: 'ALTER TABLE "roadmaps" ADD COLUMN IF NOT EXISTS "prototype" jsonb;',
  },
}

function normalizeDatabaseUrl(url) {
  if (!url) return url
  if (/[?&]sslmode=verify-full(?:&|$)/i.test(url)) return url
  if (/[?&]sslmode=/i.test(url)) {
    return url.replace(/([?&]sslmode=)[^&]*/i, '$1verify-full')
  }
  return url.includes('?') ? `${url}&sslmode=verify-full` : `${url}?sslmode=verify-full`
}

async function main() {
  if (LIST) {
    console.log(Object.keys(MIGRATIONS).join('\n'))
    return
  }

  if (!NAME || NAME.startsWith('--')) {
    throw new Error(
      'usage: node scripts/apply-migration.cjs <migration-name> [--check|--apply]\n' +
        '       node scripts/apply-migration.cjs --list',
    )
  }

  const migration = MIGRATIONS[NAME]
  if (!migration) throw new Error(`no SQL registered for migration "${NAME}"`)

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

  const pool = new Pool({ connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL) })
  const c = await pool.connect()
  try {
    const done = await c.query('select 1 from payload_migrations where name = $1', [NAME])
    if (done.rowCount) {
      console.log(`already applied: ${NAME}`)
      return
    }

    if (migration.preflight) {
      const live = await c.query(migration.preflight.sql)
      const col = migration.preflight.countColumn || 'n'
      const n = live.rows[0]?.[col] ?? live.rows[0]?.n ?? 0
      console.log(`${migration.preflight.label}: ${n}`)
      if (migration.preflight.refuseIfPositive && Number(n) > 0) {
        throw new Error('preflight refused — migration would destroy live data')
      }
    }

    if (!APPLY) {
      console.log('\n--check only, nothing written. SQL that would run:\n')
      console.log('  ' + migration.sql)
      return
    }

    await c.query('BEGIN')
    await c.query(migration.sql)
    await c.query(
      `insert into payload_migrations (name, batch, updated_at, created_at)
       values ($1, (select coalesce(max(batch), 0) + 1 from payload_migrations where batch > 0), now(), now())`,
      [NAME],
    )
    await c.query('COMMIT')
    console.log(`applied: ${NAME}`)
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    c.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
