# Server actions (standard approach)

The dashboard uses **server actions** with Payload’s **Local API** for all mutations and server-only reads. This is the recommended pattern for a Next.js + Payload monolith.

## What uses server actions

- **Invoices**: create, update, delete, get next number (see `dashboard/invoices/actions.ts`)
- **Clients**: create, update, delete, get list for dropdowns (`dashboard/clients/actions.ts`)
- **Tasks**: create, update (e.g. toggle complete), delete (`dashboard/tasks/actions.ts`)
- **Transactions**: create, delete (`dashboard/transactions/actions.ts`)
- **Quotes**: create, update, delete (`dashboard/quotes/actions.ts`)
- **Settings**: update global (`dashboard/settings/actions.ts`)
- **Activity**: create note (`dashboard/actions/activity.ts`)
- **Search**: dashboard search (`dashboard/actions/search.ts`)
- **AI**: parse invoice prompt, AI insights (`dashboard/actions/ai.ts`)

All of these run on the server via `getPayloadClient()` (Local API); no `fetch('/api/...')` from the client for these flows.

## Route Handlers we keep (when they’re the right tool)

- **`/api/invoices/[id]/pdf`** – returns PDF binary (download).
- **`/api/invoices/[id]/send`** – sends email (could be an action; kept as route for now).
- **`/api/export/invoices`**, **`/api/export/clients`** – CSV file download.

Payload’s REST at `/api/<collection>` still exists for the admin UI or external clients; the dashboard app does not use it for CRUD.

## Is `fetch('/api/...')` the best way?

It works, but in a **Next.js + Payload monolith** the recommended pattern is:

- **Server actions** for app-to-server logic (create/update/delete, “get next number”, etc.).
- **Payload Local API** inside those actions (`getPayloadClient().create()`, `.find()`, etc.) instead of calling your own REST from the client.

Reasons:

| Current (REST) | Preferred (server actions) |
|----------------|---------------------------|
| Client → HTTP → your server → Payload | Client → server action → Payload (no HTTP to yourself) |
| You maintain route handlers for CRUD | CRUD lives in actions using Local API |
| Auth/cookies still work via fetch | Same auth in the request context of the action |
| Good for external clients / webhooks | Better fit when the only client is your Next app |

So: **for internal UI flows, server actions + Local API is the better fit.**  
Keep **Route Handlers** for:

- Public or external API
- Webhooks
- File upload/download (e.g. PDF response)
- Anything that must be a real HTTP endpoint

## What we added

- **`src/app/(frontend)/(admin)/dashboard/invoices/actions.ts`** – Server actions that use the Local API:
  - `getNextInvoiceNumber()`
  - `createInvoice(data)`
  - `updateInvoice(id, data)`
  - `deleteInvoice(id)`

You can call these from client components instead of `fetch('/api/invoices', ...)`. Example:

```tsx
// Before (REST)
const nextRes = await fetch('/api/invoices/next-number')
const { nextNumber } = await nextRes.json()

// After (server action)
import { getNextInvoiceNumber } from './actions'
const result = await getNextInvoiceNumber()
const nextNumber = result.nextNumber ?? 1001
```

Migrating the rest of the dashboard to these actions (and removing or narrowing the use of `/api` for internal CRUD) will make the app more aligned with Next.js and Payload’s recommended approach.
