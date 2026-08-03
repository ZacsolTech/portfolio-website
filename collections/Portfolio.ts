import type { CollectionConfig } from 'payload'
import { draftVersions, previewCollectionConfig } from '../lib/preview'

export const Portfolio: CollectionConfig = {
  slug: 'portfolio',
  admin: {
    useAsTitle: 'title',
    ...previewCollectionConfig('portfolio'),
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
    { name: 'client', type: 'text', required: true },
    { name: 'sector', type: 'text', required: true },
    { name: 'metric', type: 'text', required: true },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Web', value: 'web' },
        { label: 'Mobile', value: 'mobile' },
        { label: 'AI', value: 'ai' },
        { label: 'Data', value: 'data' },
        { label: 'Automation', value: 'automation' },
        { label: 'Demo', value: 'demo' },
      ],
    },
    { name: 'interactive', type: 'checkbox', defaultValue: false },
    { name: 'summary', type: 'textarea', required: true },
    { name: 'problem', type: 'textarea', required: true },
    { name: 'built', type: 'textarea', required: true },
    {
      name: 'results',
      type: 'array',
      fields: [
        { name: 'value', type: 'text', required: true },
        { name: 'label', type: 'text', required: true },
      ],
    },
    {
      name: 'stack',
      type: 'array',
      fields: [{ name: 'value', type: 'text', required: true }],
    },
    { name: 'quote', type: 'textarea' },
    {
      name: 'relatedServices',
      type: 'array',
      fields: [{ name: 'value', type: 'text', required: true }],
    },
    { name: 'timeline', type: 'text' },
  ],
}
