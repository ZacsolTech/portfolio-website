import type { CollectionConfig } from 'payload'

/**
 * Consultation bookings.
 *
 * The row is the source of truth for availability: `/api/booking` excludes any
 * slot that already has a live booking against it, so double-booking is
 * prevented by a query rather than by hoping two visitors don't click at the
 * same moment.
 *
 * `slotKey` makes that guarantee real under concurrency. It is a unique column
 * holding the slot's instant for live bookings, and a per-row suffixed value
 * once cancelled — so two people cannot take the same slot in the same second,
 * *and* a cancelled slot goes back on the market. A unique index on `startsAt`
 * itself would have blocked the second, much more common case forever.
 *
 * When Cal.com is configured it owns scheduling and rows here are written from
 * its webhook instead — `provider` records which path produced the booking.
 */
export const Bookings: CollectionConfig = {
  slug: 'bookings',
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['startsAt', 'name', 'email', 'status', 'provider'],
    group: 'Sales',
    description: 'Consultations booked from /book.',
  },
  defaultSort: '-startsAt',
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'reference',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true, description: 'Quoted to the client in the confirmation.' },
    },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, index: true },
    { name: 'phone', type: 'text' },
    { name: 'company', type: 'text' },
    { name: 'topic', type: 'textarea' },

    {
      name: 'startsAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'UTC instant the consultation starts.',
      },
    },
    {
      name: 'slotKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description:
          'Concurrency guard: the slot instant while live, suffixed once cancelled so the slot is bookable again.',
      },
    },
    { name: 'endsAt', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    {
      name: 'timezone',
      type: 'text',
      required: true,
      admin: { description: "The visitor's IANA zone, so every email reads in their local time." },
    },

    {
      name: 'status',
      type: 'select',
      defaultValue: 'confirmed',
      index: true,
      admin: { position: 'sidebar' },
      options: [
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Completed', value: 'completed' },
        { label: 'No-show', value: 'no-show' },
      ],
    },
    {
      name: 'provider',
      type: 'select',
      defaultValue: 'native',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Native', value: 'native' },
        { label: 'Cal.com', value: 'cal.com' },
      ],
    },
    { name: 'calBookingUid', type: 'text', admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'calendarUid',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        description:
          'iCalendar UID. Preserved across a reschedule so the calendar MOVES the existing event instead of leaving a stale one behind.',
      },
    },
    {
      name: 'sequence',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'RFC 5545 SEQUENCE. Incremented on reschedule, or clients ignore the update.',
      },
    },
    {
      name: 'rescheduledFrom',
      type: 'text',
      admin: { readOnly: true, description: 'Reference of the booking this one replaced.' },
    },
    {
      name: 'lead',
      type: 'relationship',
      relationTo: 'leads',
      admin: { position: 'sidebar' },
    },
    { name: 'meetingUrl', type: 'text', admin: { description: 'Video link sent with the invite.' } },

    {
      type: 'collapsible',
      label: 'Delivery',
      fields: [
        {
          name: 'manageToken',
          type: 'text',
          index: true,
          admin: {
            readOnly: true,
            description: 'Single-purpose token in the reschedule/cancel link.',
          },
        },
        {
          name: 'confirmationStatus',
          type: 'select',
          defaultValue: 'pending',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Sent', value: 'sent' },
            { label: 'Failed', value: 'failed' },
            { label: 'Not configured', value: 'skipped' },
          ],
        },
        { name: 'confirmationError', type: 'text' },
      ],
    },
  ],
  timestamps: true,
}
