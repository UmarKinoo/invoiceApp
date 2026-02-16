/**
 * Reusable line item shape for Invoices and Quotes.
 * Used as array field inline, not a separate collection.
 */
export const lineItemFields = [
  { name: 'description', type: 'text', required: true },
  { name: 'quantity', type: 'number', required: true, defaultValue: 1 },
  { name: 'rate', type: 'number', required: true, defaultValue: 0 },
] as const
