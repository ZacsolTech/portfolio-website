import type { Insight } from './content/types'

import {
  insights as staticInsights,
  getInsight as staticGetInsight,
} from './content/insights'

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
