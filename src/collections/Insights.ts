import type { CollectionConfig } from 'payload'
import { draftVersions, previewCollectionConfig } from '../lib/preview'

export const Insights: CollectionConfig = {
  slug: 'insights',
  admin: {
    useAsTitle: 'title',
    ...previewCollectionConfig('insights'),
  },
  versions: draftVersions,
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    { name: 'title', type: 'text', required: true },
    { name: 'excerpt', type: 'textarea', required: true },
    { name: 'category', type: 'text', required: true },
    { name: 'date', type: 'text', required: true },
    { name: 'author', type: 'text', required: true },
    { name: 'readingTime', type: 'text' },
    {
      name: 'body',
      type: 'array',
      fields: [{ name: 'paragraph', type: 'textarea', required: true }],
    },
    {
      name: 'related',
      type: 'array',
      fields: [{ name: 'value', type: 'text', required: true }],
    },
  ],
}
