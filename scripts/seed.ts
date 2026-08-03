import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: '.env' })

import { getPayload } from 'payload'
import config from '../payload.config'

import { services } from '../lib/content/services'
import { industries } from '../lib/content/industries'
import { portfolio } from '../lib/content/portfolio'
import { insights } from '../lib/content/insights'
import { team } from '../lib/content/team'
import { testimonials } from '../lib/content/testimonials'
import { faqs } from '../lib/content/faqs'
const toValueArray = (arr: string[]) => arr.map((value) => ({ value }))

async function seed() {
  const payload = await getPayload({ config })

  console.log('Seeding services…')
  for (const s of services) {
    const existing = await payload.find({
      collection: 'services',
      where: { slug: { equals: s.slug } },
      limit: 1,
    })
    const data = {
      slug: s.slug,
      title: s.title,
      shortTitle: s.shortTitle,
      blurb: s.blurb,
      icon: s.icon,
      tech: toValueArray(s.tech),
      included: toValueArray([...s.included]),
      stackGroups: s.stackGroups.map((g) => ({
        label: g.label,
        items: toValueArray(g.items),
      })),
      process: s.process,
      faqs: s.faqs,
      engagement: [...s.engagement],
      seoDescription: s.seo.description,
      _status: 'published' as const,
    }
    if (existing.docs.length > 0) {
      await payload.update({ collection: 'services', id: existing.docs[0].id, data })
    } else {
      await payload.create({ collection: 'services', data })
    }
  }

  console.log('Seeding industries…')
  for (const ind of industries) {
    const existing = await payload.find({
      collection: 'industries',
      where: { slug: { equals: ind.slug } },
      limit: 1,
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
    if (existing.docs.length > 0) {
      await payload.update({ collection: 'industries', id: existing.docs[0].id, data })
    } else {
      await payload.create({ collection: 'industries', data })
    }
  }

  console.log('Seeding portfolio…')
  for (const p of portfolio) {
    const existing = await payload.find({
      collection: 'portfolio',
      where: { slug: { equals: p.slug } },
      limit: 1,
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
    if (existing.docs.length > 0) {
      await payload.update({ collection: 'portfolio', id: existing.docs[0].id, data })
    } else {
      await payload.create({ collection: 'portfolio', data })
    }
  }

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

  console.log('Seeding team…')
  for (const t of team) {
    const existing = await payload.find({
      collection: 'team',
      where: { name: { equals: t.name } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      await payload.update({ collection: 'team', id: existing.docs[0].id, data: t })
    } else {
      await payload.create({ collection: 'team', data: t })
    }
  }

  console.log('Seeding testimonials…')
  for (const t of testimonials) {
    const existing = await payload.find({
      collection: 'testimonials',
      where: { name: { equals: t.name } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      await payload.update({ collection: 'testimonials', id: existing.docs[0].id, data: t })
    } else {
      await payload.create({ collection: 'testimonials', data: t })
    }
  }

  console.log('Seeding FAQs…')
  for (let idx = 0; idx < faqs.length; idx++) {
    const f = faqs[idx]
    const existing = await payload.find({
      collection: 'faqs',
      where: { q: { equals: f.q } },
      limit: 1,
    })
    const data = { q: f.q, a: f.a, order: idx + 1 }
    if (existing.docs.length > 0) {
      await payload.update({ collection: 'faqs', id: existing.docs[0].id, data })
    } else {
      await payload.create({ collection: 'faqs', data })
    }
  }

  console.log('Seed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
