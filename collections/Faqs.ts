import type { CollectionConfig } from 'payload'

export const Faqs: CollectionConfig = {
  slug: 'faqs',
  admin: {
    useAsTitle: 'q',
  },
  fields: [
    { name: 'q', type: 'text', required: true },
    { name: 'a', type: 'textarea', required: true },
    { name: 'order', type: 'number', required: true },
  ],
}
