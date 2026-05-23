export type DraftLinkPayload = {
  invoiceId: number
  invoiceNumber: string
  reviewUrl: string
}

export function draftLinkFromCreateInvoiceOutput(
  toolName: string,
  output: string,
): DraftLinkPayload | null {
  if (toolName !== 'create_invoice') return null
  try {
    const data = JSON.parse(output) as {
      ok?: boolean
      id?: number
      invoiceNumber?: string
      reviewUrl?: string
    }
    if (
      data.ok &&
      typeof data.id === 'number' &&
      data.invoiceNumber &&
      data.reviewUrl
    ) {
      return {
        invoiceId: data.id,
        invoiceNumber: data.invoiceNumber,
        reviewUrl: data.reviewUrl,
      }
    }
  } catch {
    /* not JSON */
  }
  return null
}
