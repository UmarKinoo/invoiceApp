import type { CollectionConfig } from 'payload'

/**
 * Stores one row per agent conversation. The row id is used as the LangGraph
 * `thread_id` so the PostgresSaver checkpoint tables (checkpoints,
 * checkpoint_writes, checkpoint_blobs) stay tied to a Payload-owned record.
 *
 * Title is auto-generated from the first user message by the chat route.
 */
export const AgentSessions: CollectionConfig = {
  slug: 'agent-sessions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'user', 'lastMessageAt'],
    group: 'Agent',
  },
  // Users can only see their own threads; admins see all.
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { user: { equals: req.user.id } }
    },
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { user: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { user: { equals: req.user.id } }
    },
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        if (operation === 'create' && req.user?.id && data && !data.user) {
          data.user = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'title',
      type: 'text',
      admin: { description: 'Auto-generated from first user message' },
    },
    {
      name: 'lastMessageAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
}
