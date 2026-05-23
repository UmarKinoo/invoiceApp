import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { getPayloadClient } from '@/lib/payload-server'

export const findClientTool = tool(
  async ({ query, limit }): Promise<string> => {
    const payload = await getPayloadClient()
    const trimmed = query.trim()

    const result = await payload.find({
      collection: 'clients',
      limit: limit ?? 5,
      where: {
        or: [
          { name: { like: trimmed } },
          { company: { like: trimmed } },
          { email: { like: trimmed } },
          { phone: { like: trimmed } },
        ],
      },
    })

    const docs = result.docs.map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company ?? null,
      email: c.email ?? null,
      phone: c.phone ?? null,
    }))

    if (docs.length === 0) {
      return JSON.stringify({ matches: [], hint: 'No clients matched. Try a different query or ask the user to clarify.' })
    }
    return JSON.stringify({ matches: docs })
  },
  {
    name: 'find_client',
    description:
      'Search clients by name, company, email, or phone (substring match). Returns up to N matches with their ids. ' +
      'Always use this before referring to a client; never invent client IDs.',
    schema: z.object({
      query: z.string().min(1).describe('Search string (name, company, email, or phone fragment)'),
      limit: z.number().int().positive().max(20).optional().describe('Max results to return (default 5)'),
    }),
  },
)
