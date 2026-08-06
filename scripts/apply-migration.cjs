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
 */
require('dotenv').config({ path: '.env', quiet: true })
const { Pool } = require('../node_modules/.pnpm/pg@8.20.0/node_modules/pg')

const NAME = process.argv[2]
const APPLY = process.argv.includes('--apply')

// Kept in lockstep with migrations/<NAME>.ts — see the note above on why this
// cannot simply import that file.
const SQL = {
  '20260806_071631_drop_booking_reminder_sent_at':
    'ALTER TABLE "bookings" DROP COLUMN IF EXISTS "reminder_sent_at";',
}

async function main() {
  if (!SQL[NAME]) throw new Error(`no SQL registered for migration "${NAME}"`)
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const c = await pool.connect()
  try {
    const done = await c.query('select 1 from payload_migrations where name = $1', [NAME])
    if (done.rowCount) {
      console.log(`already applied: ${NAME}`)
      return
    }

    // Pre-flight: refuse to drop a column that turns out to hold data.
    const live = await c.query(
      `select count(*)::int n from bookings where reminder_sent_at is not null`,
    )
    console.log(`rows with reminder_sent_at NOT NULL: ${live.rows[0].n}`)
    if (live.rows[0].n > 0) throw new Error('column holds data — refusing to drop')

    if (!APPLY) {
      console.log('\n--check only, nothing written. SQL that would run:\n')
      console.log('  ' + SQL[NAME])
      return
    }

    await c.query('BEGIN')
    await c.query(SQL[NAME])
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
