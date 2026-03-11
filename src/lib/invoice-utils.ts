/**
 * Normalize invoice number for display and export.
 * - "214" → "INV-214"
 * - "INV-1101-md2lmk" → "INV-1101"
 * - null/empty → "#{id}" when fallbackId provided, else ""
 */
export function displayInvoiceNumber(
  num: string | null | undefined,
  fallbackId?: string
): string {
  const n = (num ?? '').trim()
  if (!n) return fallbackId != null && fallbackId !== '' ? `#${fallbackId}` : ''
  if (/^\d+$/.test(n)) return `INV-${n}`
  const legacySuffix = n.match(/^(INV-\d+)-[a-z0-9]{5,8}$/i)
  return legacySuffix ? legacySuffix[1] : n
}

/** For CSV/export: same as display but returns "" when empty (no fallback). */
export function normalizeInvoiceNumberForExport(value: string | null | undefined): string {
  const n = (value ?? '').trim()
  if (!n) return ''
  if (/^\d+$/.test(n)) return `INV-${n}`
  const legacy = n.match(/^(INV-\d+)-[a-z0-9]{5,8}$/i)
  return legacy ? legacy[1] : n
}
