import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type LineItem = { id?: string; description: string; quantity: number; rate: number }

export async function POST(req: Request) {
  try {
    const { prompt } = (await req.json()) as { prompt?: string }
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing prompt' },
        { status: 400 }
      )
    }
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not set' },
        { status: 503 }
      )
    }
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
    const lineItems: LineItem[] = (data.items ?? []).map((it, idx) => ({
      id: `li-${Date.now()}-${idx}`,
      description: it.description ?? '',
      quantity: Number(it.quantity) ?? 0,
      rate: Number(it.rate) ?? 0,
    }))
    return NextResponse.json({
      items: lineItems,
      clientName: data.clientName ?? undefined,
      notes: data.notes ?? undefined,
    })
  } catch (e) {
    console.error('Parse invoice error:', e)
    return NextResponse.json(
      { error: 'Failed to parse invoice draft' },
      { status: 500 }
    )
  }
}
