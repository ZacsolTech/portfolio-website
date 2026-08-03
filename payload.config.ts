import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

import {
  Users,
  Media,
  Services,
  Industries,
  Portfolio,
  Insights,
  Team,
  Testimonials,
  Faqs,
} from './collections'
import { normalizeDatabaseUrl } from './lib/db'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [
    Users,
    Media,
    Services,
    Industries,
    Portfolio,
    Insights,
    Team,
    Testimonials,
    Faqs,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: {
      connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL || ''),
    },
  }),
  // sharp image processing for uploads
  sharp,
})
