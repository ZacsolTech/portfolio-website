import type {
  Industry,
  PortfolioItem,
  Insight,
  Testimonial,
  FaqItem,
} from './content/types'

import {
  industries as staticIndustries,
  getIndustry as staticGetIndustry,
} from './content/industries'
import {
  portfolio as staticPortfolio,
  getPortfolioItem as staticGetPortfolioItem,
} from './content/portfolio'
import {
  insights as staticInsights,
  getInsight as staticGetInsight,
} from './content/insights'
import { testimonials as staticTestimonials } from './content/testimonials'
import { faqs as staticFaqs } from './content/faqs'

const fromValueArray = (arr?: { value: string }[] | null): string[] =>
  arr?.map((i) => i.value) ?? []

async function getPayloadClient() {
  try {
    const { getPayload } = await import('payload')
    const configPromise = (await import('@payload-config')).default
    return await getPayload({ config: configPromise })
  } catch {
    return null
  }
}

/** When Draft Mode is on, fetch unpublished versions and bypass public access. */
async function draftQuery() {
  try {
    const { draftMode } = await import('next/headers')
    const { isEnabled } = await draftMode()
    if (!isEnabled) return { draft: false as const }
    return { draft: true as const, overrideAccess: true as const }
  } catch {
    return { draft: false as const }
  }
}

// ── Industries ────────────────────────────────────────────

export async function getIndustries(): Promise<Industry[]> {
  try {
    const payload = await getPayloadClient()
    if (!payload) return staticIndustries

    const { docs } = await payload.find({
      collection: 'industries',
      limit: 100,
      sort: 'name',
      ...(await draftQuery()),
    })

    return docs.map(mapIndustry)
  } catch {
    return staticIndustries
  }
}

export async function getIndustry(slug: string): Promise<Industry | undefined> {
  try {
    const payload = await getPayloadClient()
    if (!payload) return staticGetIndustry(slug)

    const { docs } = await payload.find({
      collection: 'industries',
      where: { slug: { equals: slug } },
      limit: 1,
      ...(await draftQuery()),
    })

    return docs[0] ? mapIndustry(docs[0]) : staticGetIndustry(slug)
  } catch {
    return staticGetIndustry(slug)
  }
}

function mapIndustry(doc: Record<string, unknown>): Industry {
  return {
    slug: doc.slug as string,
    name: doc.name as string,
    problemOneLiner: doc.problemOneLiner as string,
    icon: doc.icon as string,
    problems: fromValueArray(doc.problems as { value: string }[]) as Industry['problems'],
    services: fromValueArray(doc.services as { value: string }[]),
    compliance: (doc.compliance as string) ?? '',
    seo: { description: (doc.seoDescription as string) ?? '' },
  }
}

// ── Portfolio ─────────────────────────────────────────────

export async function getPortfolio(): Promise<PortfolioItem[]> {
  try {
    const payload = await getPayloadClient()
    if (!payload) return staticPortfolio

    const { docs } = await payload.find({
      collection: 'portfolio',
      limit: 100,
      sort: 'title',
      ...(await draftQuery()),
    })

    return docs.map(mapPortfolio)
  } catch {
    return staticPortfolio
  }
}

export async function getPortfolioItem(slug: string): Promise<PortfolioItem | undefined> {
  try {
    const payload = await getPayloadClient()
    if (!payload) return staticGetPortfolioItem(slug)

    const { docs } = await payload.find({
      collection: 'portfolio',
      where: { slug: { equals: slug } },
      limit: 1,
      ...(await draftQuery()),
    })

    return docs[0] ? mapPortfolio(docs[0]) : staticGetPortfolioItem(slug)
  } catch {
    return staticGetPortfolioItem(slug)
  }
}

function mapPortfolio(doc: Record<string, unknown>): PortfolioItem {
  return {
    slug: doc.slug as string,
    title: doc.title as string,
    client: doc.client as string,
    sector: doc.sector as string,
    metric: doc.metric as string,
    category: doc.category as PortfolioItem['category'],
    interactive: (doc.interactive as boolean) ?? false,
    summary: doc.summary as string,
    problem: doc.problem as string,
    built: doc.built as string,
    results: (doc.results as PortfolioItem['results']) ?? [],
    stack: fromValueArray(doc.stack as { value: string }[]),
    quote: (doc.quote as string) || undefined,
    relatedServices: fromValueArray(doc.relatedServices as { value: string }[]),
    timeline: (doc.timeline as string) || undefined,
  }
}

// ── Insights ──────────────────────────────────────────────

export async function getInsights(): Promise<Insight[]> {
  try {
    const payload = await getPayloadClient()
    if (!payload) return staticInsights

    const { docs } = await payload.find({
      collection: 'insights',
      limit: 100,
      sort: '-date',
      ...(await draftQuery()),
    })

    return docs.map(mapInsight)
  } catch {
    return staticInsights
  }
}

export async function getInsight(slug: string): Promise<Insight | undefined> {
  try {
    const payload = await getPayloadClient()
    if (!payload) return staticGetInsight(slug)

    const { docs } = await payload.find({
      collection: 'insights',
      where: { slug: { equals: slug } },
      limit: 1,
      ...(await draftQuery()),
    })

    return docs[0] ? mapInsight(docs[0]) : staticGetInsight(slug)
  } catch {
    return staticGetInsight(slug)
  }
}

function mapInsight(doc: Record<string, unknown>): Insight {
  const bodyRows = (doc.body as Array<{ paragraph: string }>) ?? []
  return {
    slug: doc.slug as string,
    title: doc.title as string,
    excerpt: doc.excerpt as string,
    category: doc.category as string,
    date: doc.date as string,
    author: doc.author as string,
    readingTime: (doc.readingTime as string) ?? '',
    body: bodyRows.map((r) => r.paragraph),
    related: fromValueArray(doc.related as { value: string }[]),
  }
}

// ── Testimonials ──────────────────────────────────────────

export async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const payload = await getPayloadClient()
    if (!payload) return staticTestimonials

    const { docs } = await payload.find({
      collection: 'testimonials',
      limit: 100,
    })

    return docs.map((doc) => ({
      quote: doc.quote as string,
      metric: doc.metric as string,
      metricLabel: doc.metricLabel as string,
      name: doc.name as string,
      role: doc.role as string,
      company: doc.company as string,
      initials: doc.initials as string,
    }))
  } catch {
    return staticTestimonials
  }
}

// ── FAQs ──────────────────────────────────────────────────

export async function getFaqs(): Promise<FaqItem[]> {
  try {
    const payload = await getPayloadClient()
    if (!payload) return staticFaqs

    const { docs } = await payload.find({
      collection: 'faqs',
      limit: 100,
      sort: 'order',
    })

    return docs.map((doc) => ({
      q: doc.q as string,
      a: doc.a as string,
    }))
  } catch {
    return staticFaqs
  }
}
