'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  isInternalAppHref,
  parseMessageSegments,
  toInternalPath,
} from '@/lib/agent/parse-message-links'

type Props = {
  content: string
  className?: string
  streaming?: boolean
}

function ChatLinkButton({ label, href }: { label: string; href: string }) {
  const internal = isInternalAppHref(href)
  const path = internal ? toInternalPath(href) : href

  if (internal) {
    return (
      <Button asChild size="sm" className="mt-2 h-8 gap-1.5">
        <Link href={path}>{label}</Link>
      </Button>
    )
  }

  return (
    <Button asChild size="sm" variant="secondary" className="mt-2 h-8 gap-1.5">
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label}
        <ExternalLink className="size-3.5 opacity-70" aria-hidden />
      </a>
    </Button>
  )
}

export function AgentMessageContent({ content, className, streaming }: Props) {
  if (!content) {
    return <span className={cn('opacity-60', className)}>{streaming ? '…' : ''}</span>
  }

  const segments = parseMessageSegments(content)
  const hasLinks = segments.some((s) => s.type === 'link')

  if (!hasLinks) {
    return <div className={cn('whitespace-pre-wrap', className)}>{content}</div>
  }

  return (
    <div className={cn('space-y-1', className)}>
      {segments.map((segment, i) => {
        if (segment.type === 'text') {
          const trimmed = segment.value.trim()
          if (!trimmed) return null
          return (
            <p key={i} className="whitespace-pre-wrap">
              {segment.value}
            </p>
          )
        }
        return <ChatLinkButton key={i} label={segment.label} href={segment.href} />
      })}
    </div>
  )
}
