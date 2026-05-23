import { ChatOpenAI } from '@langchain/openai'

// gpt-4.1-mini: fast tool-calling (~2–5s/turn). Use AGENT_LLM_MODEL=gpt-5 for max quality (often 20–40s/turn).
const DEFAULT_MODEL = process.env.AGENT_LLM_MODEL ?? 'gpt-4.1-mini'

/** Reasoning models (gpt-5, o-series) only accept the API default temperature (1). */
function modelSupportsCustomTemperature(model: string): boolean {
  const m = model.toLowerCase()
  if (m.startsWith('gpt-5')) return false
  if (/^o[0-9]/.test(m)) return false
  return true
}

let cached: ChatOpenAI | null = null

export function getChatModel(): ChatOpenAI {
  if (cached) return cached
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Add it to your .env to use the agent.')
  }

  const model = DEFAULT_MODEL
  const options: ConstructorParameters<typeof ChatOpenAI>[0] = {
    model,
    apiKey: process.env.OPENAI_API_KEY,
  }

  if (modelSupportsCustomTemperature(model)) {
    const temp = process.env.AGENT_LLM_TEMPERATURE
    options.temperature = temp !== undefined ? Number(temp) : 0.2
  }

  cached = new ChatOpenAI(options)
  return cached
}
