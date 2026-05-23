import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
  type LangGraphRunnableConfig,
} from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { SystemMessage } from '@langchain/core/messages'
import { getChatModel } from './llm'
import { getCheckpointer } from './checkpointer'
import { agentError, agentLog } from './logger'
import { extractMessageText, messageRequestsTools, toAIMessage } from './messages'
import { tools } from './tools'

const toolNode = new ToolNode(tools as never)

async function chatNode(state: typeof MessagesAnnotation.State, config: LangGraphRunnableConfig) {
  const systemPrompt = config.configurable?.systemPrompt as string | undefined
  const messages = systemPrompt
    ? [new SystemMessage(systemPrompt), ...state.messages]
    : state.messages

  const threadId = config.configurable?.thread_id
  const started = Date.now()
  agentLog('node.chat.start', {
    threadId,
    messageCount: state.messages.length,
  })

  try {
    const model = getChatModel().bindTools(tools as never)
    const raw = await model.invoke(messages, config)
    const response = toAIMessage(raw)
    const toolNames = response.tool_calls?.map((t) => t.name) ?? []
    agentLog('node.chat.done', {
      threadId,
      toolCalls: toolNames,
      rawType: raw.constructor.name,
      hasText: Boolean(extractMessageText(response.content)),
      ms: Date.now() - started,
    })
    return { messages: [response] }
  } catch (err) {
    agentError('node.chat.failed', err, { threadId, ms: Date.now() - started })
    throw err
  }
}

function routeAfterChat(state: typeof MessagesAnnotation.State): 'tools' | typeof END {
  const last = state.messages[state.messages.length - 1]
  if (messageRequestsTools(last)) {
    agentLog('route.tools', {
      lastType: last?.constructor?.name,
      toolCalls: (last as { tool_calls?: { name: string }[] }).tool_calls?.map((t) => t.name),
    })
    return 'tools'
  }
  agentLog('route.end', { lastType: last?.constructor?.name })
  return END
}

let builder: ReturnType<typeof buildGraph> | null = null
type CompiledAgentGraph = Awaited<ReturnType<ReturnType<typeof buildGraph>['compile']>>
let compiledGraphPromise: Promise<CompiledAgentGraph> | null = null

function buildGraph() {
  return new StateGraph(MessagesAnnotation)
    .addNode('chat', chatNode)
    .addNode('tools', toolNode)
    .addEdge(START, 'chat')
    .addConditionalEdges('chat', routeAfterChat, ['tools', END])
    .addEdge('tools', 'chat')
}

/** Compile once and reuse — compiling on every request was adding avoidable latency. */
export async function getCompiledGraph(): Promise<CompiledAgentGraph> {
  if (!compiledGraphPromise) {
    compiledGraphPromise = (async () => {
      const started = Date.now()
      if (!builder) builder = buildGraph()
      const checkpointer = await getCheckpointer()
      const compiled = builder.compile({ checkpointer })
      agentLog('graph.compiled', { ms: Date.now() - started })
      return compiled
    })()
  }
  return compiledGraphPromise
}

/** Warm graph + checkpointer at server startup (dev/prod). */
export function prewarmAgent(): Promise<void> {
  return getCompiledGraph().then(() => undefined)
}

// Fire-and-forget on module load in Node (skipped in edge runtime).
if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
  void prewarmAgent().catch((err) => agentError('prewarm.failed', err))
}
