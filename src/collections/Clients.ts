import type { CollectionConfig } from 'payload'

export const Clients: CollectionConfig = {
  slug: 'clients',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'company', 'email'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'company', type: 'text' },
    // Email optional: some contacts might only have phone or VAT/BRN.
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text', required: true },
    { name: 'brn', type: 'text', admin: { description: 'Business Registration Number (if applicable)' } },
    {
      name: 'vatNumber',
      type: 'text',
      label: 'VAT number',
      admin: {
        description: 'Optional. Shown on invoices if present.',
      },
    },
    { name: 'address', type: 'textarea' },
    {
      name: 'tags',
      type: 'array',
      admin: { description: 'Tags for filtering' },
      fields: [{ name: 'tag', type: 'text' }],
    },
    {
      name: 'socials',
      type: 'group',
      fields: [
        { name: 'twitter', type: 'text' },
        { name: 'linkedin', type: 'text' },
      ],
    },
  ],
}
