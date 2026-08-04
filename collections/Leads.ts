import type { CollectionConfig } from 'payload'

/**
 * Every lead the site produces, from any surface.
 *
 * One collection rather than one per form: "who came in this week and where
 * from?" has to be a single sorted list, and the sales view has to show the
 * consultant blueprint and the booking against the same person. `lib/leads/`
 * owns the normalised shape; this is its storage and its admin UI.
 *
 * Written only by server routes (`overrideAccess` on create), readable in the
 * admin by authenticated staff. `create: () => false` blocks the REST and
 * GraphQL endpoints Payload would otherwise expose, so the collection cannot be
 * used as an open write target.
 *
 * Note on naming: `channel` holds the acquisition source (consultant, contact,
 * booking…) while `source` is the pre-existing column recording which engine
 * produced a blueprint. `source` is not repurposed because it is a live
 * Postgres enum with rows already in it.
 */
export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'channel', 'status', 'solutionTitle', 'createdAt'],
    group: 'Sales',
    description: 'Every enquiry, blueprint request and booking, from every surface.',
    listSearchableFields: ['email', 'name', 'company', 'solutionTitle'],
    pagination: { defaultLimit: 50 },
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req, operation, context }) => {
        if (operation !== 'update' || context.stoppingNurture) return

        // "Stop on reply": moving a lead out of the untouched states is the
        // signal a human has picked it up, so the sequence gets out of the way.
        const engaged = ['qualified', 'won', 'lost']
        const justEngaged =
          engaged.includes(doc.status) && !engaged.includes(previousDoc?.status)

        if (doc.nurtureStatus !== 'active' || !justEngaged) return

        await req.payload.update({
          collection: 'leads',
          id: doc.id,
          overrideAccess: true,
          // Marks the nested write so this hook cannot re-enter and loop.
          context: { stoppingNurture: true },
          data: {
            nurtureStatus: 'stopped',
            nurtureNextAt: null,
            nurtureStoppedReason: `status moved to ${doc.status}`,
          },
        })
      },
    ],
  },
  fields: [
    /* ------------------------------- contact ------------------------------- */
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, index: true },
    { name: 'phone', type: 'text' },
    { name: 'company', type: 'text' },

    /* ------------------------------ pipeline ------------------------------ */
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      index: true,
      admin: { position: 'sidebar' },
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Qualified', value: 'qualified' },
        { label: 'Won', value: 'won' },
        { label: 'Lost', value: 'lost' },
      ],
    },
    {
      name: 'channel',
      label: 'Source',
      type: 'select',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Where this lead first came from. Never overwritten on later touches.',
      },
      options: [
        { label: 'AI Consultant', value: 'consultant' },
        { label: 'Cost Estimator', value: 'estimator' },
        { label: 'Contact form', value: 'contact' },
        { label: 'Booking', value: 'booking' },
        { label: 'Newsletter', value: 'newsletter' },
      ],
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', description: 'Who is chasing this.' },
    },
    {
      name: 'touchCount',
      type: 'number',
      defaultValue: 1,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'How many separate surfaces this person has come through.',
      },
    },
    {
      name: 'lastTouchChannel',
      type: 'text',
      admin: { position: 'sidebar', readOnly: true },
    },
    { name: 'lastTouchAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'notes',
      type: 'textarea',
      admin: { position: 'sidebar', description: 'Internal. Never shown to the lead.' },
    },

    {
      name: 'sessionId',
      type: 'text',
      index: true,
      admin: { description: 'Consultant or estimator session this lead came from.' },
    },

    /* -------------------------------- intake ------------------------------- */
    {
      type: 'collapsible',
      label: 'Intake',
      fields: [
        {
          name: 'seed',
          type: 'textarea',
          label: 'Problem, in their words',
        },
        {
          name: 'answers',
          type: 'json',
          admin: {
            description:
              'Surface-specific answers — intake slots, form selects, estimator levers.',
          },
        },
        // Retained from the consultant-only schema: existing rows populate
        // these, and they are worth having as sortable columns.
        { name: 'problem', type: 'textarea', admin: { hidden: true } },
        { name: 'industry', type: 'text' },
        { name: 'currentProcess', type: 'text' },
        { name: 'scale', type: 'text' },
        { name: 'timeline', type: 'text' },
      ],
    },

    /* ------------------------------- solution ------------------------------ */
    {
      type: 'collapsible',
      label: 'Solution',
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
          admin: { description: 'Full generated document as delivered to the visitor.' },
        },
        {
          name: 'transcript',
          type: 'json',
          admin: { description: 'Conversation that produced it.' },
        },
        {
          name: 'source',
          label: 'Blueprint engine',
          type: 'select',
          options: [
            { label: 'Gemini', value: 'gemini' },
            { label: 'Rules engine', value: 'rules' },
          ],
        },
        {
          name: 'roadmap',
          type: 'relationship',
          relationTo: 'roadmaps',
          admin: { description: 'Shareable /roadmap/[id] minted for this lead.' },
        },
      ],
    },

    /* ------------------------------- consent ------------------------------- */
    {
      name: 'consent',
      type: 'group',
      admin: {
        description:
          'Stored per channel and per grant, with the exact wording shown. Email and marketing are separate grants — do not merge them.',
      },
      fields: [
        { name: 'emailGranted', type: 'checkbox', label: 'Email contact' },
        { name: 'emailText', type: 'text', admin: { readOnly: true } },
        { name: 'emailAt', type: 'date', admin: { readOnly: true } },
        { name: 'marketingGranted', type: 'checkbox', label: 'Marketing follow-ups' },
        { name: 'marketingText', type: 'text', admin: { readOnly: true } },
        { name: 'marketingAt', type: 'date', admin: { readOnly: true } },
      ],
    },

    /* ----------------------------- attribution ----------------------------- */
    {
      name: 'utm',
      label: 'Attribution',
      type: 'group',
      admin: { description: 'First touch. Never overwritten by a later visit.' },
      fields: [
        { name: 'utmSource', label: 'utm_source', type: 'text', index: true },
        { name: 'utmMedium', label: 'utm_medium', type: 'text' },
        { name: 'utmCampaign', label: 'utm_campaign', type: 'text', index: true },
        { name: 'utmTerm', label: 'utm_term', type: 'text' },
        { name: 'utmContent', label: 'utm_content', type: 'text' },
        { name: 'clickId', type: 'text' },
        { name: 'referrer', type: 'text' },
        { name: 'landingPath', type: 'text' },
      ],
    },

    /* ------------------------------ follow-up ------------------------------ */
    {
      type: 'collapsible',
      label: 'Follow-up',
      fields: [
        {
          name: 'nurtureStatus',
          type: 'select',
          defaultValue: 'stopped',
          index: true,
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Stopped', value: 'stopped' },
            { label: 'Completed', value: 'completed' },
          ],
          admin: {
            description:
              'Stops automatically on booking, on unsubscribe, and when status moves past Contacted.',
          },
        },
        {
          name: 'nurtureStep',
          type: 'number',
          defaultValue: 0,
          admin: { description: 'Number of sequence emails already sent (0–3).' },
        },
        { name: 'nurtureNextAt', type: 'date', index: true },
        { name: 'nurtureStoppedReason', type: 'text', admin: { readOnly: true } },
        {
          name: 'unsubscribeToken',
          type: 'text',
          index: true,
          admin: {
            readOnly: true,
            description: 'Single-purpose token in the unsubscribe link. Not a login.',
          },
        },
        {
          name: 'emailStatus',
          label: 'Last delivery',
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
