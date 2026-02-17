import type { GlobalConfig } from 'payload'

export const Settings: GlobalConfig = {
  slug: 'settings',
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'businessName', type: 'text', required: true, defaultValue: '' },
    { name: 'businessAddress', type: 'textarea', defaultValue: '' },
    { name: 'businessEmail', type: 'email', defaultValue: '' },
    { name: 'businessPhone', type: 'text', defaultValue: '' },
    { name: 'businessWebsite', type: 'text', defaultValue: '' },
    { name: 'logoUrl', type: 'text', admin: { description: 'URL or leave empty for placeholder' } },
    { name: 'invoicePrefix', type: 'text', defaultValue: 'INV-' },
    { name: 'taxRateDefault', type: 'number', defaultValue: 0, admin: { description: 'Default tax %' } },
    {
      name: 'currency',
      type: 'select',
      defaultValue: 'MUR',
      options: [
        { label: 'MUR (Rs)', value: 'MUR' },
        { label: 'USD ($)', value: 'USD' },
        { label: 'EUR (€)', value: 'EUR' },
      ],
    },
  ],
}
