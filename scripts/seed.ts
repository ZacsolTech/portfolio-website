import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: '.env' })

import { getPayload } from 'payload'
import config from '../payload.config'

import { insights } from '../lib/content/insights'
const toValueArray = (arr: string[]) => arr.map((value) => ({ value }))

async function seed() {
  const payload = await getPayload({ config })

  console.log('Seeding insights…')
  for (const i of insights) {
    const existing = await payload.find({
      collection: 'insights',
      where: { slug: { equals: i.slug } },
      limit: 1,
    })
    const data = {
      slug: i.slug,
      title: i.title,
      excerpt: i.excerpt,
      category: i.category,
      date: i.date,
      author: i.author,
      readingTime: i.readingTime,
      body: i.body.map((paragraph) => ({ paragraph })),
      related: toValueArray(i.related),
      _status: 'published' as const,
    }
    if (existing.docs.length > 0) {
      await payload.update({ collection: 'insights', id: existing.docs[0].id, data })
    } else {
      await payload.create({ collection: 'insights', data })
    }
  }

  console.log('Seed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
