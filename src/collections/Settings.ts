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
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Logo used on invoices (PNG recommended)' },
    },
    { name: 'logoUrl', type: 'text', admin: { description: 'Fallback URL if no logo uploaded' } },
    {
      name: 'logoWhite',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Logo for white background (e.g. PDF, print). Uses main logo if not set.' },
    },
    { name: 'businessBrn', type: 'text', admin: { description: 'Business Registration Number (e.g. BRN)' } },
    { name: 'vatRegistrationNumber', type: 'text', admin: { description: 'VAT registration number' } },
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
