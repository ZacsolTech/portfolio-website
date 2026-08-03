import type { CollectionConfig } from 'payload'

export const Industries: CollectionConfig = {
  slug: 'industries',
  admin: {
    useAsTitle: 'name',
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
    { name: 'name', type: 'text', required: true },
    { name: 'problemOneLiner', type: 'text', required: true },
    { name: 'icon', type: 'text', required: true },
    {
      name: 'problems',
      type: 'array',
      fields: [{ name: 'value', type: 'text', required: true }],
    },
    {
      name: 'services',
      type: 'array',
      fields: [{ name: 'value', type: 'text', required: true }],
    },
    { name: 'compliance', type: 'text' },
    { name: 'seoDescription', type: 'textarea' },
  ],
}
