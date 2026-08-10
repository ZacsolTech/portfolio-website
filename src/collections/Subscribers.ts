import type { CollectionConfig } from 'payload'

/**
 * Newsletter subscribers captured by the footer form.
 *
 * Same posture as Leads: written only by the server route with
 * `overrideAccess`, readable in admin by authenticated staff. `create: () =>
 * false` blocks the REST/GraphQL endpoints Payload would otherwise expose, so
 * the collection cannot be used as an open write target.
 */
export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'source', 'createdAt'],
    group: 'Sales',
    description: 'Insights list sign-ups.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'subscribed',
      index: true,
      options: [
        { label: 'Subscribed', value: 'subscribed' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
        { label: 'Bounced', value: 'bounced' },
      ],
    },
    {
      name: 'source',
      type: 'text',
      defaultValue: 'footer',
      admin: { description: 'Where the sign-up came from.' },
    },
  ],
  timestamps: true,
}
