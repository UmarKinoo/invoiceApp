declare module '@google/genai' {
  export class GoogleGenAI {
    constructor(options: { apiKey: string })
    models: {
      generateContent(options: { model: string; contents?: unknown[]; systemInstruction?: string }): Promise<{ text: string }>
    }
  }
  export const Type: unknown
}
