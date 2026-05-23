export type SseEvent = Record<string, unknown> & { type: string }

async function readStreamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
  }
  return buffer
}

export async function readSseEvents(response: Response | ReadableStream<Uint8Array>): Promise<SseEvent[]> {
  let text: string
  if (response instanceof ReadableStream) {
    text = await readStreamToText(response)
  } else if (response.body) {
    text = await readStreamToText(response.body)
  } else {
    text = await response.text()
  }
  const events: SseEvent[] = []
  for (const part of text.split('\n\n')) {
    const line = part.startsWith('data: ') ? part.slice(6).trim() : part.trim()
    if (!line) continue
    try {
      events.push(JSON.parse(line) as SseEvent)
    } catch {
      /* skip */
    }
  }
  return events
}

export function eventTypes(events: SseEvent[]): string[] {
  return events.map((e) => e.type)
}
