import { readFile } from 'node:fs/promises'
import path from 'node:path'

let cached: string | null = null

async function loadTemplate(): Promise<string> {
  if (cached) return cached
  const filePath = path.join(process.cwd(), 'src', 'lib', 'agent', 'prompts', 'system.md')
  cached = await readFile(filePath, 'utf8')
  return cached
}

export type SystemPromptValues = {
  userName: string
  businessName: string
  today: string
  currency: string
  invoicePrefix: string
  taxRateDefault: number
  userContext?: string
}

export async function loadSystemPrompt(values: SystemPromptValues): Promise<string> {
  const template = await loadTemplate()
  const replacements: Record<string, string> = {
    userName: values.userName,
    businessName: values.businessName || 'your business',
    today: values.today,
    currency: values.currency,
    invoicePrefix: values.invoicePrefix,
    taxRateDefault: String(values.taxRateDefault ?? 0),
    userContext: values.userContext ?? '(none on file yet)',
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => replacements[key] ?? '')
}
