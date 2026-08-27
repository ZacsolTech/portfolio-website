import { postgresAdapter } from '@payloadcms/db-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

import {
  Users,
  Media,
  Posts,
  Leads,
  Roadmaps,
  Bookings,
  Subscribers,
} from './collections'
import { normalizeDatabaseUrl } from './lib/db'
import { site } from './lib/content/site'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

function origins(): string[] {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    `https://${site.domain}`,
    `https://www.${site.domain}`,
    process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : '',
  ]
  const unique = new Set<string>()
  for (const value of candidates) {
    if (!value) continue
    try {
      unique.add(new URL(value).origin)
    } catch {
      /* skip unparseable */
    }
  }
  return [...unique]
}

const allowed = origins()

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    theme: 'dark',
    meta: {
      titleSuffix: ' — ZACSOL Admin',
      description: 'ZACSOL internal admin. Authorised staff only.',
      icons: [
        {
          rel: 'icon',
          type: 'image/png',
          url: '/brand/icon-192.png',
        },
      ],
    },
    components: {
      graphics: {
        Logo: '/admin/Logo.tsx#Logo',
        Icon: '/admin/Icon.tsx#Icon',
      },
      beforeLogin: ['/admin/LoginIntro.tsx#LoginIntro'],
      beforeDashboard: ['/admin/Welcome.tsx#Welcome'],
      afterNavLinks: ['/admin/AfterNavLinks.tsx#AfterNavLinks'],
    },
    avatar: 'default',
    dateFormat: 'd MMM yyyy HH:mm',
  },
  collections: [
    Users,
    Media,
    Posts,
    Leads,
    Roadmaps,
    Bookings,
    Subscribers,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') || undefined,
  csrf: allowed,
  cors: allowed,
  cookiePrefix: 'zacsol',
  graphQL: {
    disable: true,
  },
  defaultDepth: 1,
  maxDepth: 5,
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
  sharp,
  plugins: process.env.BLOB_READ_WRITE_TOKEN
    ? [
        vercelBlobStorage({
          collections: { media: true },
          token: process.env.BLOB_READ_WRITE_TOKEN,
          clientUploads: true,
          addRandomSuffix: true,
        }),
      ]
    : [],
})
