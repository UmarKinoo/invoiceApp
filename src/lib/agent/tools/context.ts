import type { LangGraphRunnableConfig } from '@langchain/langgraph'

/**
 * Per-invocation context threaded into every tool via the LangGraph config.
 * The chat route sets `configurable.toolContext` when invoking the graph.
 */
export type ToolContext = {
  userId: number
  userEmail?: string | null
}

export function getToolContext(config: LangGraphRunnableConfig | undefined): ToolContext {
  const ctx = config?.configurable?.toolContext as ToolContext | undefined
  if (!ctx || typeof ctx.userId !== 'number') {
    throw new Error('Tool invoked without toolContext (missing userId)')
  }
  return ctx
}
