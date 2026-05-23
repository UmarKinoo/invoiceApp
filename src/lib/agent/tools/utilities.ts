import { tool } from '@langchain/core/tools'
import { interrupt } from '@langchain/langgraph'
import { z } from 'zod'

/**
 * Human-in-the-loop confirmation tool. The model calls this with a question
 * (e.g. "Create draft invoice for Acme Co with 1 item totaling $240?") and the
 * graph pauses. The chat route detects the interrupt, surfaces the question to
 * the user, and resumes the graph with the user's reply via Command({ resume }).
 */
export const askHumanTool = tool(
  async ({ question }): Promise<string> => {
    const reply = interrupt(question)
    return typeof reply === 'string' ? reply : JSON.stringify(reply)
  },
  {
    name: 'ask_human',
    description:
      'Pause and ask the user for confirmation or clarification before taking a sensitive ' +
      'action (creating, updating, deleting, sending). Returns the user reply as a string.',
    schema: z.object({
      question: z
        .string()
        .min(1)
        .describe('The question to ask. Be specific; quote the exact values you will write.'),
    }),
  },
)
