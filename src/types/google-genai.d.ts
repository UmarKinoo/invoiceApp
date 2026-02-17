declare module '@google/genai' {
  export class GoogleGenAI {
    constructor(options: { apiKey: string })
    models: {
      generateContent(options: {
        model: string
        contents?: unknown[]
        systemInstruction?: string
        config?: {
          responseMimeType?: string
          responseSchema?: Record<string, unknown>
        }
      }): Promise<{ text: string }>
    }
  }
  export const Type: unknown
}
