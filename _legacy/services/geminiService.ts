
import { GoogleGenAI, Type } from "@google/genai";
import { Invoice, Client, LineItem } from "../types";

export const GeminiService = {
  getAI: () => new GoogleGenAI({ apiKey: process.env.API_KEY }),

  // Parse natural language into an invoice structure
  // Added clientName to the return type to fix TypeScript errors in Invoices.tsx where it's used for client matching
  parseInvoiceDraft: async (prompt: string): Promise<Partial<Invoice> & { items: LineItem[]; clientName?: string }> => {
    const ai = GeminiService.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract invoice details from this text: "${prompt}". 
      Return structured data with a list of items (description, quantity, rate), and if mentioned, the client name.`,
      config: {
        responseMimeType: "application/json",
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
                  rate: { type: Type.NUMBER }
                },
                required: ["description", "quantity", "rate"]
              }
            }
          },
          required: ["items"]
        }
      }
    });

    try {
      const data = JSON.parse(response.text || "{}");
      return {
        ...data,
        items: (data.items || []).map((it: any) => ({ ...it, id: Math.random().toString(36).substr(2, 9) }))
      };
    } catch (e) {
      console.error("Failed to parse Gemini response", e);
      return { items: [] };
    }
  },

  // Generate a professional email reminder
  generateReminder: async (invoice: Invoice, client: Client): Promise<string> => {
    const ai = GeminiService.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Write a polite but firm payment reminder email for ${client.name} regarding invoice ${invoice.invoiceNumber} which is ${invoice.status}. Total amount is $${invoice.total.toFixed(2)}.`,
    });
    return response.text || "Failed to generate reminder.";
  },

  // Business Insight Analyst
  getBusinessInsights: async (invoices: Invoice[], clients: Client[]): Promise<string> => {
    const ai = GeminiService.getAI();
    const summary = `
      Data Summary:
      Total Clients: ${clients.length}
      Total Invoices: ${invoices.length}
      Invoices breakdown: ${JSON.stringify(invoices.map(i => ({ status: i.status, amount: i.total })))}
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Act as a business growth consultant. Analyze this data and provide 3 actionable insights to improve cash flow or client retention: ${summary}`,
    });
    return response.text || "Analyze more data to get insights.";
  }
};
