import type { CollectionConfig } from 'payload'
import { createActivityLog } from './hooks/createActivityLog'

function getClientId(client: number | { id: number } | undefined): number | null {
  if (client == null) return null
  return typeof client === 'object' ? client.id : client
}

export const Tasks: CollectionConfig = {
  slug: 'tasks',
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
            type: 'task_assigned',
            body: `Task "${doc.title ?? ''}" assigned`,
            relatedCollection: 'tasks',
            relatedId: doc.id,
            meta: {
              title: doc.title,
              priority: doc.priority,
            },
          })
          return
        }

        if (
          operation === 'update' &&
          previousDoc &&
          doc.completed === true &&
          previousDoc.completed === false
        ) {
          await createActivityLog({
            payload: req.payload,
            userId: req.user?.id,
            clientId,
            type: 'task_completed',
            body: `Task "${doc.title ?? ''}" completed`,
            relatedCollection: 'tasks',
            relatedId: doc.id,
            meta: {
              title: doc.title,
            },
          })
        }
      },
    ],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'priority', 'completed', 'dueDate'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'dueDate', type: 'date' },
    {
      name: 'priority',
      type: 'select',
      defaultValue: 'medium',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
      ],
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      admin: { description: 'Optional link to contact' },
    },
    { name: 'completed', type: 'checkbox', defaultValue: false },
  ],
}
