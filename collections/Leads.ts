import type { CollectionConfig } from 'payload'

/**
 * Consultant leads captured at the blur gate.
 *
 * Written only by the server route (`overrideAccess` on create), readable in
 * the admin by authenticated staff. Nothing here is public: `create: () => false`
 * blocks the REST/GraphQL endpoints Payload would otherwise expose, so the
 * collection cannot be used as an open write target.
 */
export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'solutionTitle', 'status', 'createdAt'],
    group: 'Sales',
    description: 'Blueprint requests captured by ZAC Consultant.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, index: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Qualified', value: 'qualified' },
        { label: 'Won', value: 'won' },
        { label: 'Lost', value: 'lost' },
      ],
    },
    {
      name: 'sessionId',
      type: 'text',
      index: true,
      admin: { description: 'Consultant session this lead came from.' },
    },

    {
      type: 'collapsible',
      label: 'Intake',
      fields: [
        { name: 'problem', type: 'textarea' },
        { name: 'industry', type: 'text' },
        { name: 'currentProcess', type: 'text' },
        { name: 'scale', type: 'text' },
        { name: 'timeline', type: 'text' },
      ],
    },

    {
      type: 'collapsible',
      label: 'Blueprint',
      fields: [
        { name: 'solutionTitle', type: 'text' },
        { name: 'serviceSlug', type: 'text', index: true },
        { name: 'costLowUsd', type: 'number' },
        { name: 'costHighUsd', type: 'number' },
        { name: 'durationLowWeeks', type: 'number' },
        { name: 'durationHighWeeks', type: 'number' },
        {
          name: 'blueprint',
          type: 'json',
          admin: { description: 'Full generated blueprint as delivered to the visitor.' },
        },
        {
          name: 'transcript',
          type: 'json',
          admin: { description: 'Conversation that produced the blueprint.' },
        },
      ],
    },

    {
      type: 'collapsible',
      label: 'Delivery',
      fields: [
        {
          name: 'source',
          type: 'select',
          defaultValue: 'gemini',
          options: [
            { label: 'Gemini', value: 'gemini' },
            { label: 'Rules engine', value: 'rules' },
          ],
        },
        {
          name: 'emailStatus',
          type: 'select',
          defaultValue: 'pending',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Sent', value: 'sent' },
            { label: 'Failed', value: 'failed' },
            { label: 'Not configured', value: 'skipped' },
          ],
        },
        { name: 'emailError', type: 'text' },
      ],
    },
  ],
  timestamps: true,
}
