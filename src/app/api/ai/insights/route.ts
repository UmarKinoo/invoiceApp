import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload-server'

export const dynamic = 'force-dynamic'

export async function GET() {
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
      breakdown: invoices.map((i) => ({
        status: i.status,
        amount: Number(i.total),
      })),
    }
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        text: 'Set GEMINI_API_KEY in .env to enable AI insights. Here is your data summary:\n\n' +
          `Total Clients: ${summary.totalClients}\nTotal Invoices: ${summary.totalInvoices}\n` +
          JSON.stringify(summary.breakdown.slice(0, 10), null, 2),
      })
    }
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey })
    const prompt = `Act as a business growth consultant. Analyze this data and provide 3 actionable insights to improve cash flow or client retention: ${JSON.stringify(summary)}`
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })
    const text = response.text ?? 'No insights generated.'
    return NextResponse.json({ text })
  } catch (e) {
    console.error('AI insights error:', e)
    return NextResponse.json(
      { text: 'Failed to generate insights. Check server logs and GEMINI_API_KEY.' },
      { status: 500 }
    )
  }
}
