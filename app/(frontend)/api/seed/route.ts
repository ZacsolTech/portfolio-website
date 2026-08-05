import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { industries } from '@/lib/content/industries'
import { portfolio } from '@/lib/content/portfolio'
import { insights } from '@/lib/content/insights'
import { testimonials } from '@/lib/content/testimonials'
import { faqs } from '@/lib/content/faqs'

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

  for (const ind of industries) {
    const existing = await payload.find({
      collection: 'industries',
      where: { slug: { equals: ind.slug } },
      limit: 1,
      overrideAccess: true,
    })
    const data = {
      slug: ind.slug,
      name: ind.name,
      problemOneLiner: ind.problemOneLiner,
      icon: ind.icon,
      problems: toValueArray([...ind.problems]),
      services: toValueArray(ind.services),
      compliance: ind.compliance,
      seoDescription: ind.seo.description,
      _status: 'published' as const,
    }
    if (existing.docs[0]) {
      await payload.update({
        collection: 'industries',
        id: existing.docs[0].id,
        data,
        overrideAccess: true,
      })
    } else {
      await payload.create({ collection: 'industries', data, overrideAccess: true })
    }
  }
  summary.industries = industries.length

  for (const p of portfolio) {
    const existing = await payload.find({
      collection: 'portfolio',
      where: { slug: { equals: p.slug } },
      limit: 1,
      overrideAccess: true,
    })
    const data = {
      slug: p.slug,
      title: p.title,
      client: p.client,
      sector: p.sector,
      metric: p.metric,
      category: p.category,
      interactive: p.interactive,
      summary: p.summary,
      problem: p.problem,
      built: p.built,
      results: p.results,
      stack: toValueArray(p.stack),
      quote: p.quote ?? '',
      relatedServices: toValueArray(p.relatedServices),
      timeline: p.timeline ?? '',
      _status: 'published' as const,
    }
    if (existing.docs[0]) {
      await payload.update({
        collection: 'portfolio',
        id: existing.docs[0].id,
        data,
        overrideAccess: true,
      })
    } else {
      await payload.create({ collection: 'portfolio', data, overrideAccess: true })
    }
  }
  summary.portfolio = portfolio.length

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

  for (const t of testimonials) {
    const existing = await payload.find({
      collection: 'testimonials',
      where: { name: { equals: t.name } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      await payload.update({
        collection: 'testimonials',
        id: existing.docs[0].id,
        data: t,
        overrideAccess: true,
      })
    } else {
      await payload.create({ collection: 'testimonials', data: t, overrideAccess: true })
    }
  }
  summary.testimonials = testimonials.length

  for (let idx = 0; idx < faqs.length; idx++) {
    const f = faqs[idx]
    const existing = await payload.find({
      collection: 'faqs',
      where: { q: { equals: f.q } },
      limit: 1,
      overrideAccess: true,
    })
    const data = { q: f.q, a: f.a, order: idx + 1 }
    if (existing.docs[0]) {
      await payload.update({
        collection: 'faqs',
        id: existing.docs[0].id,
        data,
        overrideAccess: true,
      })
    } else {
      await payload.create({ collection: 'faqs', data, overrideAccess: true })
    }
  }
  summary.faqs = faqs.length

  return NextResponse.json({ ok: true, summary })
}
