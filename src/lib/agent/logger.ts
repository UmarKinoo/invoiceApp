const PREFIX = '[agent]'

/** Server-side agent logs (always on in development). */
export function agentLog(phase: string, detail?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'production' && process.env.AGENT_DEBUG !== 'true') {
    return
  }
  const ts = new Date().toISOString()
  if (detail) {
    console.log(`${PREFIX} ${ts} ${phase}`, detail)
  } else {
    console.log(`${PREFIX} ${ts} ${phase}`)
  }
}

export function agentError(phase: string, err: unknown, detail?: Record<string, unknown>): void {
  const ts = new Date().toISOString()
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  console.error(`${PREFIX} ${ts} ${phase}`, { message, stack, ...detail })
}
