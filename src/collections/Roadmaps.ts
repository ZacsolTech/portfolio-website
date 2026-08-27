import type { CollectionConfig } from 'payload'
import { adminField, canDeleteSales, isLoggedIn, neverField, nobody } from '@/lib/access'

/**
 * Shareable roadmaps — the consultant's blueprint as a forwardable document.
 *
 * `PAGES.md` §14: "this is what the visitor forwards to their boss". That makes
 * the URL the product. It is keyed by an unguessable token rather than the row
 * id, because a sequential `/roadmap/47` would let anyone walk every quote the
 * site has ever issued.
 *
 * The public page reads through `overrideAccess` on the server. Payload's own
 * REST and GraphQL endpoints stay shut, so a token is only ever good for the
 * rendered document — never for the underlying record.
 */
export const Roadmaps: CollectionConfig = {
  slug: 'roadmaps',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'email', 'views', 'createdAt'],
    group: 'Sales',
    description: 'Documents minted by the consultant and shared by link.',
  },
  access: {
    read: isLoggedIn,
    create: nobody,
    update: isLoggedIn,
    delete: canDeleteSales,
  },
  fields: [
    {
      name: 'token',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: { read: adminField, create: neverField, update: neverField },
      admin: { readOnly: true, description: 'The /roadmap/[id] segment.' },
    },
    { name: 'title', type: 'text', required: true },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, index: true },
    {
      name: 'lead',
      type: 'relationship',
      relationTo: 'leads',
      admin: { position: 'sidebar' },
    },
    {
      name: 'revoked',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Returns 404 for the link without deleting the record.',
      },
    },
    {
      name: 'blueprint',
      type: 'json',
      required: true,
      admin: { description: 'Frozen at mint time — the document must not change under a shared link.' },
    },
    {
      name: 'prototype',
      type: 'json',
      admin: {
        description:
          'Generated visual mock shown with the roadmap. Frozen alongside the blueprint; null when one could not be drawn.',
      },
    },
    { name: 'slots', type: 'json', admin: { description: 'Intake that produced it.' } },
    {
      name: 'views',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true, description: 'How many times the link has been opened.' },
    },
    { name: 'lastViewedAt', type: 'date', admin: { readOnly: true } },
  ],
  timestamps: true,
}
