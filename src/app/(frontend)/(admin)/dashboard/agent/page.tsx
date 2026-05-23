import { AgentWorkspace } from '@/components/agent/agent-workspace'

export const dynamic = 'force-dynamic'

export default function AgentPage() {
  const enableE2eBridge = process.env.AGENT_E2E_MOCK === '1'
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden animate-in fade-in duration-500">
      <AgentWorkspace enableE2eBridge={enableE2eBridge} />
    </div>
  )
}
