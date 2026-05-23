'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'agent-workspace-panels'
const MOBILE_BREAKPOINT = 768

const DEFAULT_CHATS_OPEN = true

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

function readChatsOpen(): boolean {
  if (typeof window === 'undefined') return DEFAULT_CHATS_OPEN
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CHATS_OPEN
    const parsed = JSON.parse(raw) as { chatsOpen?: boolean; activityOpen?: boolean }
    return parsed.chatsOpen ?? DEFAULT_CHATS_OPEN
  } catch {
    return DEFAULT_CHATS_OPEN
  }
}

export function useAgentPanels() {
  // Match SSR: always start with DEFAULT_CHATS_OPEN; sync from localStorage after mount.
  const [chatsOpen, setChatsOpenState] = useState(DEFAULT_CHATS_OPEN)

  useEffect(() => {
    try {
      let open = readChatsOpen()
      if (isMobileViewport() && !localStorage.getItem(STORAGE_KEY)) {
        open = false
      }
      setChatsOpenState(open)
    } catch {
      /* ignore */
    }
  }, [])

  const persistChatsOpen = useCallback((open: boolean) => {
    setChatsOpenState(open)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ chatsOpen: open }))
    } catch {
      /* ignore */
    }
  }, [])

  const setChatsOpen = useCallback(
    (open: boolean) => {
      persistChatsOpen(open)
    },
    [persistChatsOpen],
  )

  const toggleChats = useCallback(() => {
    setChatsOpenState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ chatsOpen: next }))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return {
    chatsOpen,
    setChatsOpen,
    toggleChats,
  }
}
