'use server'

import { getPayloadClient } from '@/lib/payload-server'

export type ParseInvoiceResult = {
  items?: { id?: string; description: string; quantity: number; rate: number }[]
  clientName?: string
  notes?: string
}

export async function parseInvoicePrompt(prompt: string): Promise<ParseInvoiceResult | { error: string }> {
  if (!prompt?.trim()) return { error: 'Missing prompt' }
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'GEMINI_API_KEY not set' }
  try {
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey })
    const textPrompt = `Extract invoice details from this text: "${prompt}". Return structured data with a list of items (description, quantity, rate), and if mentioned, the client name and notes.`
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: textPrompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            clientName: { type: 'STRING' },
            notes: { type: 'STRING' },
            items: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  description: { type: 'STRING' },
                  quantity: { type: 'NUMBER' },
                  rate: { type: 'NUMBER' },
                },
                required: ['description', 'quantity', 'rate'],
              },
            },
          },
          required: ['items'],
        },
      },
    })
    const raw = response.text ?? '{}'
    const data = JSON.parse(raw) as {
      items?: { description?: string; quantity?: number; rate?: number }[]
      clientName?: string
      notes?: string
    }
    const items = (data.items ?? []).map((it, idx) => ({
      id: `li-${Date.now()}-${idx}`,
      description: it.description ?? '',
      quantity: Number(it.quantity) ?? 0,
      rate: Number(it.rate) ?? 0,
    }))
    return { items, clientName: data.clientName, notes: data.notes }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to parse invoice draft' }
  }
}

export async function getAiInsights(): Promise<{ text: string } | { error: string }> {
  try {
    const payload = await getPayloadClient()
    const [invoicesRes, clientsRes] = await Promise.all([
      payload.find({ collection: 'invoices', limit: 100 }),
      payload.find({ collection: 'clients', limit: 500 }),
    ])
    const invoices = invoicesRes.docs ?? []
    const clients = clientsRes.docs ?? []
    const summary = {
      totalClients: clients.length,
      totalInvoices: invoices.length,
      breakdown: invoices.map((i) => ({ status: i.status, amount: Number(i.total) })),
    }
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return {
        text:
          'Set GEMINI_API_KEY in .env to enable AI insights. Here is your data summary:\n\n' +
          `Total Clients: ${summary.totalClients}\nTotal Invoices: ${summary.totalInvoices}\n` +
          JSON.stringify(summary.breakdown.slice(0, 10), null, 2),
      }
    }
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey })
    const prompt = `Act as a business growth consultant. Analyze this data and provide 3 actionable insights to improve cash flow or client retention: ${JSON.stringify(summary)}`
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })
    return { text: response.text ?? 'No insights generated.' }
  } catch (e) {
    return { text: 'Failed to generate insights. Check server logs and GEMINI_API_KEY.' }
  }
}
