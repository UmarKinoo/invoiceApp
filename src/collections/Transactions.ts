import type { CollectionConfig } from 'payload'
import { createActivityLog } from './hooks/createActivityLog'

function getClientId(client: number | { id: number } | undefined): number | null {
  if (client == null) return null
  return typeof client === 'object' ? client.id : client
}

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return
        const clientId = getClientId(doc.client)
        if (!clientId || !req.payload) return

        await createActivityLog({
          payload: req.payload,
          userId: req.user?.id,
          clientId,
          type: 'payment_received',
          body: `Payment of Rs ${Number(doc.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} received${doc.reference ? ` (${doc.reference})` : ''}`,
          relatedCollection: 'transactions',
          relatedId: doc.id,
          meta: {
            amount: doc.amount,
            method: doc.method,
            reference: doc.reference,
          },
        })
      },
    ],
  },
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['date', 'client', 'amount', 'method', 'reference'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'date', type: 'date', required: true },
    { name: 'amount', type: 'number', required: true },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
    },
    { name: 'reference', type: 'text', admin: { description: 'e.g. invoice number' } },
    {
      name: 'method',
      type: 'select',
      defaultValue: 'stripe',
      options: [
        { label: 'Stripe', value: 'stripe' },
        { label: 'PayPal', value: 'paypal' },
        { label: 'Bank Transfer', value: 'bank_transfer' },
        { label: 'Cash', value: 'cash' },
      ],
    },
  ],
}
