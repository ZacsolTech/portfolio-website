import type { CollectionConfig } from 'payload'

export const Services: CollectionConfig = {
  slug: 'services',
  admin: {
    useAsTitle: 'title',
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    { name: 'title', type: 'text', required: true },
    { name: 'shortTitle', type: 'text', required: true },
    { name: 'blurb', type: 'textarea', required: true },
    { name: 'icon', type: 'text', required: true },
    {
      name: 'tech',
      type: 'array',
      fields: [{ name: 'value', type: 'text', required: true }],
    },
    {
      name: 'included',
      type: 'array',
      fields: [{ name: 'value', type: 'text', required: true }],
    },
    {
      name: 'stackGroups',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'items',
          type: 'array',
          fields: [{ name: 'value', type: 'text', required: true }],
        },
      ],
    },
    {
      name: 'process',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'textarea', required: true },
      ],
    },
    {
      name: 'faqs',
      type: 'array',
      fields: [
        { name: 'q', type: 'text', required: true },
        { name: 'a', type: 'textarea', required: true },
      ],
    },
    {
      name: 'engagement',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'textarea', required: true },
        { name: 'from', type: 'text', required: true },
      ],
    },
    { name: 'seoDescription', type: 'textarea' },
  ],
}
