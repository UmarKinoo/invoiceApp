# Agent automated tests

## Commands

```bash
# Unit + integration (needs DATABASE_URI, PAYLOAD_SECRET in .env or .env.test)
pnpm test

# Unit only (no database)
pnpm test:unit

# Integration only (Postgres + Payload)
pnpm test:integration

# E2E (starts dev server with AGENT_E2E_MOCK=1 — no OpenAI)
pnpm test:e2e
```

## Setup

1. Copy `.env.test.example` → `.env.test` (or use existing `.env`).
2. Local Supabase/Postgres running (`pnpm supabase:start`).
3. For E2E: ensure test users can log in (created on first integration run).

## E2E server

Playwright starts Next.js on **port 3100** with `AGENT_E2E_MOCK=1` (so it does not reuse your normal `pnpm dev` on 3000).

## Mock agent stream

When `AGENT_E2E_MOCK=1`, `/api/agent/chat` returns deterministic SSE instead of calling OpenAI:

| Scenario | Trigger |
|----------|---------|
| `activities` | default / `[mock:activities]` — add `slow` (e.g. `[mock:activities] slow`) for a 2.5s delay before events |
| `interrupt` | `[mock:interrupt]` or `e2eScenario: "interrupt"` |
| `draft` | `[mock:draft]` — includes `draft_link` event |
| `error` | `[mock:error]` |

**Do not set `AGENT_E2E_MOCK=1` in production.**

## Coverage map

| Tier | Automated |
|------|-----------|
| P0 | Unit: draft-link, urls, messages, history-map, mock stream · Integration: API auth, mock chat, sessions · E2E: draft link, activities inline, chats toggle, new chat |
| P1 | Integration: find_client, session access, forbidden thread · E2E: interrupt, refresh, switch threads, queue |
| P2 | Integration: checkpointer init · E2E: 401 APIs, error mock, no background column, sessions with cookie |

## Not automated (manual / staging)

- Real OpenAI end-to-end invoice create
- Email send from invoice detail
- Production `NEXT_PUBLIC_APP_URL` link checks
- Load / cost limits
