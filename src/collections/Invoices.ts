import type { CollectionConfig } from 'payload'
import { lineItemFields } from './LineItem'
import { createActivityLog } from './hooks/createActivityLog'

function getClientId(client: number | { id: number } | undefined): number | null {
  if (client == null) return null
  return typeof client === 'object' ? client.id : client
}

export const Invoices: CollectionConfig = {
  slug: 'invoices',
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const clientId = getClientId(doc.client)
        if (!clientId || !req.payload) return

        if (operation === 'create') {
          await createActivityLog({
            payload: req.payload,
            userId: req.user?.id,
            clientId,
            type: 'invoice_created',
            body: `Invoice ${doc.invoiceNumber ?? ''} created`,
            relatedCollection: 'invoices',
            relatedId: doc.id,
            meta: {
              invoiceNumber: doc.invoiceNumber,
              total: doc.total,
            },
          })
          return
        }

        if (operation === 'update' && previousDoc && doc.status !== previousDoc.status) {
          await createActivityLog({
            payload: req.payload,
            userId: req.user?.id,
            clientId,
            type: 'status_change',
            body: `Invoice ${doc.invoiceNumber ?? ''}: ${previousDoc.status ?? '?'} → ${doc.status ?? '?'}`,
            relatedCollection: 'invoices',
            relatedId: doc.id,
            meta: {
              entity: 'invoice',
              oldStatus: previousDoc.status,
              newStatus: doc.status,
              invoiceNumber: doc.invoiceNumber,
            },
          })
        }
      },
    ],
  },
  admin: {
    useAsTitle: 'invoiceNumber',
    defaultColumns: ['invoiceNumber', 'client', 'status', 'total'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'invoiceNumber', type: 'text', required: true, unique: true },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
      admin: { description: 'Client / contact' },
    },
    { name: 'date', type: 'date', required: true },
    { name: 'dueDate', type: 'date', required: true },
    {
      name: 'items',
      type: 'array',
      required: true,
      fields: [...lineItemFields],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Sent', value: 'sent' },
        { label: 'Paid', value: 'paid' },
        { label: 'Overdue', value: 'overdue' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    { name: 'taxRate', type: 'number', defaultValue: 0, admin: { description: 'Percent' } },
    { name: 'discount', type: 'number', defaultValue: 0 },
    { name: 'shipping', type: 'number', defaultValue: 0 },
    { name: 'carNumber', type: 'text', admin: { description: 'Vehicle / car reference' } },
    { name: 'notes', type: 'textarea' },
    { name: 'subtotal', type: 'number', required: true, defaultValue: 0 },
    { name: 'tax', type: 'number', required: true, defaultValue: 0 },
    { name: 'total', type: 'number', required: true, defaultValue: 0 },
  ],
}
