import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

import {
  Users,
  Media,
  Industries,
  Portfolio,
  Insights,
  Testimonials,
  Faqs,
  Leads,
  Roadmaps,
  Bookings,
  Subscribers,
} from './collections'
import { normalizeDatabaseUrl } from './lib/db'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    livePreview: {
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  collections: [
    Users,
    Media,
    Industries,
    Portfolio,
    Insights,
    Testimonials,
    Faqs,
    Leads,
    Roadmaps,
    Bookings,
    Subscribers,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') || undefined,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: {
      connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL || ''),
    },
    /*
      DATABASE_URL points at the hosted Neon instance, not a local database.
      With push left on, starting `next dev` was enough to prompt for an
      ALTER TABLE against it — the drop of `bookings.reminder_sent_at` was
      offered that way, from a laptop, with no record of the change. Schema
      changes go through `migrations/` and `payload migrate` instead.
    */
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  // sharp image processing for uploads
  sharp,
})
