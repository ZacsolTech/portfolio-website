import type { CollectionConfig } from 'payload'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    { name: 'quote', type: 'textarea', required: true },
    { name: 'metric', type: 'text', required: true },
    { name: 'metricLabel', type: 'text', required: true },
    { name: 'name', type: 'text', required: true },
    { name: 'role', type: 'text', required: true },
    { name: 'company', type: 'text', required: true },
    { name: 'initials', type: 'text', required: true },
  ],
}
