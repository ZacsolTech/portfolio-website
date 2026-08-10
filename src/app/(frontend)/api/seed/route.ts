import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { insights } from '@/lib/content/insights'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const toValueArray = (arr: string[]) => arr.map((value) => ({ value }))

/**
 * One-shot content seed. POST /api/seed
 * Guard: SEED_SECRET header must match env, or NODE_ENV=development without secret.
 */
export async function POST(request: Request) {
  const secret = process.env.SEED_SECRET
  const header = request.headers.get('x-seed-secret')
  const allowed =
    (secret && header === secret) || (!secret && process.env.NODE_ENV === 'development')

  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })
  const summary: Record<string, number> = {}

  for (const i of insights) {
    const existing = await payload.find({
      collection: 'insights',
      where: { slug: { equals: i.slug } },
      limit: 1,
      overrideAccess: true,
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
    if (existing.docs[0]) {
      await payload.update({
        collection: 'insights',
        id: existing.docs[0].id,
        data,
        overrideAccess: true,
      })
    } else {
      await payload.create({ collection: 'insights', data, overrideAccess: true })
    }
  }
  summary.insights = insights.length

  return NextResponse.json({ ok: true, summary })
}
