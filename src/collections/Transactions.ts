import type { CollectionConfig } from 'payload'
import { createActivityLog } from './hooks/createActivityLog'
import { updateInvoiceStatusFromPayments } from './hooks/updateInvoiceStatusFromPayments'

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
        if (doc.type === 'expense') return

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
      async ({ doc, req }) => {
        if (!req.payload || !doc.invoice) return
        const invoiceId = typeof doc.invoice === 'object' ? doc.invoice.id : doc.invoice
        await updateInvoiceStatusFromPayments(req.payload, invoiceId)
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        if (!req.payload || !doc.invoice) return
        const invoiceId = typeof doc.invoice === 'object' ? doc.invoice.id : doc.invoice
        await updateInvoiceStatusFromPayments(req.payload, invoiceId)
      },
    ],
  },
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['date', 'type', 'client', 'amount', 'invoice', 'method'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'income',
      options: [
        { label: 'Income', value: 'income' },
        { label: 'Expense', value: 'expense' },
      ],
      admin: { description: 'Income = money in; Expense = money out' },
    },
    { name: 'date', type: 'date', required: true },
    { name: 'amount', type: 'number', required: true },
    {
      name: 'invoice',
      type: 'relationship',
      relationTo: 'invoices',
      required: false,
      admin: { description: 'Link to invoice when this payment is for an invoice' },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
      admin: { description: 'Contact (for income) or vendor/payee (for expense)' },
    },
    { name: 'reference', type: 'text', admin: { description: 'e.g. PAY-001 or invoice number' } },
    {
      name: 'method',
      type: 'select',
      defaultValue: 'stripe',
      options: [
        { label: 'Stripe', value: 'stripe' },
        { label: 'PayPal', value: 'paypal' },
        { label: 'Bank Transfer', value: 'bank_transfer' },
        { label: 'Cash', value: 'cash' },
        { label: 'Check', value: 'check' },
      ],
    },
    { name: 'notes', type: 'textarea', admin: { description: 'Optional notes' } },
  ],
}
