import type { CollectionConfig } from 'payload'
import { lineItemFields } from './LineItem'
import { createActivityLog } from './hooks/createActivityLog'

function getClientId(client: number | { id: number } | undefined): number | null {
  if (client == null) return null
  return typeof client === 'object' ? client.id : client
}

export const Quotes: CollectionConfig = {
  slug: 'quotes',
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
            type: 'quote_created',
            body: `Quote ${doc.quoteNumber ?? ''} created`,
            relatedCollection: 'quotes',
            relatedId: doc.id,
            meta: {
              quoteNumber: doc.quoteNumber,
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
            body: `Quote ${doc.quoteNumber ?? ''}: ${previousDoc.status ?? '?'} → ${doc.status ?? '?'}`,
            relatedCollection: 'quotes',
            relatedId: doc.id,
            meta: {
              entity: 'quote',
              oldStatus: previousDoc.status,
              newStatus: doc.status,
              quoteNumber: doc.quoteNumber,
            },
          })
        }
      },
    ],
  },
  admin: {
    useAsTitle: 'quoteNumber',
    defaultColumns: ['quoteNumber', 'client', 'status', 'total'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'quoteNumber', type: 'text', required: true },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
    },
    { name: 'date', type: 'date', required: true },
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
      defaultValue: 'pending',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    { name: 'total', type: 'number', required: true, defaultValue: 0 },
  ],
}
