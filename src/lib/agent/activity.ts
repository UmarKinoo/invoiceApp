export type ActivityStatus = 'pending' | 'running' | 'completed' | 'error'

export type AgentActivity = {
  id: string
  label: string
  status: ActivityStatus
  tool?: string
  detail?: string
  startedAt: number
  completedAt?: number
}

const TOOL_LABELS: Record<string, string> = {
  find_client: 'Looking up client',
  find_invoice: 'Searching invoices',
  get_invoice: 'Loading invoice',
  get_ledger_summary: 'Summarizing ledger',
  create_invoice: 'Creating invoice',
  send_invoice_email: 'Sending invoice email',
  update_invoice_status: 'Updating invoice status',
  ask_human: 'Waiting for your confirmation',
}

export function labelForTool(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, ' ')
}

export function labelForStatus(message: string): string {
  if (/calling model/i.test(message)) return 'Thinking'
  if (/running tools/i.test(message)) return 'Running tools'
  if (/starting agent/i.test(message)) return 'Starting up'
  return message
}

export function createActivity(
  partial: Pick<AgentActivity, 'id' | 'label'> & Partial<AgentActivity>,
): AgentActivity {
  return {
    status: 'pending',
    startedAt: Date.now(),
    ...partial,
  }
}
