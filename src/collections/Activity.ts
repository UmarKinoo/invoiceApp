import type { CollectionConfig } from 'payload'

export const Activity: CollectionConfig = {
  slug: 'activity',
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        if (operation === 'create' && req.user?.id && data) {
          data.createdBy = req.user.id
        }
        return data
      },
    ],
  },
  admin: {
    useAsTitle: 'type',
    defaultColumns: ['type', 'client', 'createdAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
      admin: { description: 'Contact this activity belongs to' },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'note',
      options: [
        { label: 'Note', value: 'note' },
        { label: 'Invoice created', value: 'invoice_created' },
        { label: 'Quote created', value: 'quote_created' },
        { label: 'Quote sent', value: 'quote_sent' },
        { label: 'Task assigned', value: 'task_assigned' },
        { label: 'Task completed', value: 'task_completed' },
        { label: 'Email sent', value: 'email_sent' },
        { label: 'Status change', value: 'status_change' },
        { label: 'Payment received', value: 'payment_received' },
      ],
    },
    {
      name: 'body',
      type: 'textarea',
      admin: { description: 'Note content or activity description' },
    },
    {
      name: 'relatedCollection',
      type: 'select',
      options: [
        { label: 'Invoices', value: 'invoices' },
        { label: 'Quotes', value: 'quotes' },
        { label: 'Tasks', value: 'tasks' },
        { label: 'Transactions', value: 'transactions' },
      ],
      admin: { description: 'Collection of the related document' },
    },
    {
      name: 'relatedId',
      type: 'number',
      admin: { description: 'ID of the related document' },
    },
    {
      name: 'meta',
      type: 'json',
      admin: {
        description:
          'Contextual data per activity type (e.g. invoiceNumber, total, oldStatus, newStatus)',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'User who created this activity', readOnly: true },
    },
  ],
}
