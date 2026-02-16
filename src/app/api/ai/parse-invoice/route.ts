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
    const { GoogleGenAI, Type } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Extract invoice details from this text: "${prompt}". Return structured data with a list of items (description, quantity, rate), and if mentioned, the client name and notes.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clientName: { type: Type.STRING },
            notes: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  rate: { type: Type.NUMBER },
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
