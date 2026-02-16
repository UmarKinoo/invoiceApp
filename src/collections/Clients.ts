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
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
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
