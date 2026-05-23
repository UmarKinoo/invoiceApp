export type MessageSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string }

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g
const BARE_URL_RE = /https?:\/\/[^\s<>\]\)]+/g

function linkLabel(href: string, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim()
  try {
    const path = new URL(href, 'http://local').pathname
    const invoiceMatch = path.match(/\/dashboard\/invoices\/(\d+)/)
    if (invoiceMatch) return `Open invoice #${invoiceMatch[1]}`
    if (/\/dashboard\//.test(path)) {
      const tail = path.split('/').filter(Boolean).slice(-2).join(' ')
      return tail ? `Open ${tail}` : 'Open in dashboard'
    }
  } catch {
    /* use default */
  }
  if (/review/i.test(href)) return 'Review draft'
  return 'Open link'
}

function parseBareUrls(text: string): MessageSegment[] {
  const segments: MessageSegment[] = []
  let lastIndex = 0
  for (const match of text.matchAll(BARE_URL_RE)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, index) })
    }
    const href = match[0].replace(/[.,;:!?)]+$/, '')
    segments.push({ type: 'link', label: linkLabel(href), href })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return segments
}

/** Split assistant message text into plain text and links (markdown or bare URLs). */
export function parseMessageSegments(content: string): MessageSegment[] {
  if (!content) return []

  const segments: MessageSegment[] = []
  let lastIndex = 0

  for (const match of content.matchAll(MARKDOWN_LINK_RE)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push(...parseBareUrls(content.slice(lastIndex, index)))
    }
    const href = match[2].trim()
    const label = match[1].trim() || linkLabel(href)
    segments.push({ type: 'link', label, href })
    lastIndex = index + match[0].length
  }

  if (lastIndex < content.length) {
    segments.push(...parseBareUrls(content.slice(lastIndex)))
  }

  return segments.filter((s) => s.type !== 'text' || s.value.length > 0)
}

export function isInternalAppHref(href: string): boolean {
  if (href.startsWith('/')) return true
  try {
    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'
    const url = new URL(href, base)
    const baseUrl = new URL(base)
    return url.origin === baseUrl.origin && url.pathname.startsWith('/dashboard')
  } catch {
    return false
  }
}

export function toInternalPath(href: string): string {
  if (href.startsWith('/')) return href
  try {
    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'
    return new URL(href, base).pathname + new URL(href, base).search
  } catch {
    return href
  }
}
