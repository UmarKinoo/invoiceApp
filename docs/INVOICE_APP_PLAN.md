# Invoice App — Next.js + Payload migration & feature plan

This document is based on analysis of the cloned Vite/React app in `_legacy/`. It defines how to adapt the existing views to Next.js and which features to build with Payload as the backend/CMS.

---

## Part 1: Adapt React app views to Next.js

### 1.1 Current app summary

| Aspect | Current (_legacy) | Target |
|--------|-------------------|--------|
| **Framework** | Vite + React 19 | Next.js 16 (App Router) |
| **Routing** | React Router (HashRouter), 8 routes | App Router file-based routes |
| **Layout** | Single `<Layout>` with sidebar + mobile tabs | Root layout + dashboard layout (protected) |
| **Data** | `StorageService` → localStorage | Payload REST/Local API + Postgres |
| **Styling** | CDN Tailwind + inline `<style>` in index.html | Tailwind 4 (already in project) + globals.css |
| **Icons** | Font Awesome (CDN) | Lucide React (already in project) or keep FA |
| **Charts** | Recharts | Recharts (already in project) |

**Routes in legacy app:**

| Path | Page | Purpose |
|------|------|---------|
| `/` | Dashboard | Hub: stats (paid/outstanding/clients/invoices), area chart, recent invoices |
| `/clients` | Clients | Contact list, add client form (name, company, email, phone, address) |
| `/invoices` | Invoices | List / Create+Edit form / Print preview; AI “Quantum Drafting” (Gemini) for line items |
| `/quotes` | Quotes | List quotes, create quote (client + line items), status |
| `/tasks` | Tasks | List tasks, add task, toggle complete, link to client, priority |
| `/transactions` | Transactions | Ledger: list payments, add transaction (amount, client, reference, method) |
| `/insights` | AI Insights | Gemini business insights from invoices + clients |
| `/settings` | Settings | Global settings: business name, address, email, phone, website, logo, invoice prefix, tax rate, currency |

---

### 1.2 Next.js structure to mirror current views

Use the existing **payload-starter** layout split: public site vs authenticated app. Put all invoice-app views under an **authenticated dashboard** so only logged-in users see them.

**Suggested App Router structure:**

```
src/app/
├── (frontend)/
│   ├── (site)/           # Public marketing/landing (existing)
│   │   └── page.tsx
│   ├── (auth)/           # Login, register, etc. (existing)
│   │   └── login/, register/, ...
│   └── (admin)/          # Existing payload-starter “dashboard”
│       └── dashboard/
│           └── page.tsx   # Replace or redirect to new hub
├── (payload)/            # Payload admin (existing)
└── api/                  # Existing + new API routes for AI
```

**Option A — Single “app” segment (recommended for clarity):**

```
src/app/(frontend)/(admin)/
├── layout.tsx            # Dashboard layout (sidebar + mobile tabs from _legacy Layout)
├── page.tsx              # Hub (current Dashboard)
├── clients/
│   └── page.tsx
├── invoices/
│   ├── page.tsx          # List
│   ├── new/
│   │   └── page.tsx      # Create
│   └── [id]/
│       └── page.tsx      # Edit / Preview
├── quotes/
│   └── page.tsx
├── tasks/
│   └── page.tsx
├── transactions/
│   └── page.tsx
├── insights/
│   └── page.tsx
└── settings/
    └── page.tsx
```

**Option B — Flat under (admin):**  
Same pages as above but all under `(admin)/` with the same layout. Choose one and stick to it.

---

### 1.3 View adaptation checklist (by page)

- **Layout**
  - Port `_legacy/components/Layout.tsx` to `src/app/(frontend)/(admin)/layout.tsx`.
  - Replace `<Link>` / `useLocation` with Next.js `Link` and `usePathname()`.
  - Keep: desktop sidebar (Core / Sales Engine / Intelligence / System), mobile bottom tab bar, blur orbs, “Lumina” branding.
  - Use existing design tokens (e.g. `glass`, `btn-press`) in Tailwind/globals so the look stays the same.

- **Dashboard (Hub)**
  - File: `(admin)/page.tsx`.
  - Replace `StorageService.getInvoices()` / `getClients()` with Payload `getPayload()` or fetch from Payload API.
  - Keep: StatCards (Cash Flow, Capital Out, Network, Registry), AreaChart (Recharts), “Recent Flow” list, quick actions (Initiate Billing, Register New Contact).
  - Use Server Components for initial data where possible; client components only where needed (e.g. chart, interactivity).

- **Clients**
  - File: `(admin)/clients/page.tsx`.
  - List: fetch clients from Payload (list collection).
  - Add client: form → Payload `create` (server action or API route). Fields: name, company, email, phone, address (and later tags, socials, activity logs when those exist in Payload).
  - Keep: card grid, “New Registry” modal/sheet behavior (can be client component or dialog).

- **Invoices**
  - Files: `(admin)/invoices/page.tsx` (list), `invoices/new/page.tsx`, `invoices/[id]/page.tsx` (edit + preview).
  - List: fetch invoices from Payload; show status, client, total; link to edit/preview.
  - Create/Edit: client select, line items (description, quantity, rate), status, tax, discount, shipping, notes. Compute subtotal/tax/total on client or server.
  - Preview/Print: same as legacy “white” print view; optionally add PDF generation later.
  - AI “Quantum Drafting”: move Gemini call to a **server action** or **API route** (e.g. `POST /api/ai/parse-invoice`); pass prompt, return `{ items, clientName?, notes? }`; keep existing UX.

- **Quotes**
  - File: `(admin)/quotes/page.tsx`.
  - List + create flow: same UX as legacy; data from Payload (Quotes collection with relation to Clients and line items).
  - Optional: “Convert to invoice” later.

- **Tasks**
  - File: `(admin)/tasks/page.tsx`.
  - List, add, toggle complete, optional client link; data from Payload (Tasks collection).

- **Transactions**
  - File: `(admin)/transactions/page.tsx`.
  - Table + “Log Payment” form; data from Payload (Transactions collection, relation to Client).

- **AI Insights**
  - File: `(admin)/insights/page.tsx`.
  - Replace `StorageService.getInvoices/getClients` with Payload data; call Gemini from **server action** or **API route** (e.g. `POST /api/ai/insights`); keep “Refresh Matrix” and prose display.

- **Settings**
  - File: `(admin)/settings/page.tsx`.
  - Form bound to **global or singleton** in Payload (see Part 2). Save via Payload update; keep current fields (business name, address, email, phone, website, logo URL, invoice prefix, tax rate, currency).

---

### 1.4 Cross-cutting adaptations

| Item | Legacy | Next.js approach |
|------|--------|-------------------|
| **Navigation** | `react-router-dom` `Link`, `useLocation` | Next `Link`, `usePathname()` (or `useSelectedLayoutSegment`) |
| **Data loading** | `useEffect` + `StorageService` in each page | Server Components: `getPayload()` or fetch; Client: `useEffect` + fetch to Payload API or server actions |
| **IDs** | Client-generated (`c-${Date.now()}`, etc.) | Payload IDs (or custom slugs) |
| **Styling** | CDN Tailwind + index.html styles | Tailwind 4 in project; move `.glass`, `.tab-bar-glass`, `.ios-header`, `.btn-press`, `.spring-up`, etc. into `src/app/globals.css` or a shared CSS module |
| **Icons** | `<i className="fa-solid fa-*">` | Replace with Lucide icons (e.g. `ChartPie`, `Users`, `FileText`, `ListTodo`, `Settings`) or add Font Awesome and keep classes |
| **Auth** | None (demo only) | Payload auth: protect `(admin)/*` with middleware; use `getPayload().auth()` or cookies for current user |

---

## Part 2: Features to develop (Payload as CMS/backend)

### 2.1 Payload collections to add

Define these **in addition** to existing Users and Media:

| Collection | Slug | Purpose | Key fields (conceptual) |
|------------|------|---------|--------------------------|
| **Clients** | `clients` | Contacts / customers | name, company, email, phone, address, tags (array), socials (object), activityLogs (array or relation) |
| **Invoices** | `invoices` | Invoices | invoiceNumber, client (relation), date, dueDate, status (select), lineItems (array: description, quantity, rate), taxRate, discount, shipping, notes, subtotal, tax, total (computed or stored) |
| **Quotes** | `quotes` | Quotes/proposals | quoteNumber, client (relation), date, status (select), lineItems (array), total |
| **Tasks** | `tasks` | CRM tasks | title, dueDate, priority (select), client (relation, optional), completed (checkbox) |
| **Transactions** | `transactions` | Payment ledger | date, amount, client (relation), reference, method (select) |
| **Settings** | `settings` or global | Singleton for app config | businessName, businessAddress, businessEmail, businessPhone, businessWebsite, logo (upload or Media relation), invoicePrefix, taxRateDefault, currency |

- **Relations:** Client as `relationship` to Clients in Invoices, Quotes, Tasks, Transactions.
- **Line items:** Either `array` field (array of objects) or a separate `InvoiceLineItem` collection with relation to Invoice (and similarly for Quotes). Array is simpler for v1.
- **Access:** Restrict by user (e.g. only admins or “staff” role) or tenant if you add multi-tenancy later.

### 2.2 Feature list (to develop)

**Phase 1 — Parity with legacy (data in Payload)**

1. **Dashboard (Hub)**  
   - Stats from Payload: total paid, outstanding, client count, invoice count.  
   - Recent invoices list.  
   - Area chart (e.g. last 6 months revenue or paid amount).  
   - Quick actions: “New Invoice”, “New Contact”.

2. **Clients (Contacts)**  
   - List all clients (from Payload).  
   - Add client (form → Payload create).  
   - Edit client (future: link to edit page or modal).  
   - Optional: “Records” / activity log per client (Phase 2).

3. **Invoices**  
   - List with status, client, total; filter by status later.  
   - Create invoice: client, line items, dates, status, tax/discount/shipping, notes.  
   - Edit invoice.  
   - Preview/print view (same as legacy).  
   - Optional: delete or “cancel” (status) later.

4. **Quotes**  
   - List quotes; create quote (client + line items, status).  
   - Optional: “Send proposal” (e.g. email or PDF) and “Convert to invoice” later.

5. **Tasks**  
   - List tasks; add task (title, due date, priority, optional client); toggle completed.  
   - Optional: delete, edit, filter by client/priority.

6. **Transactions (Ledger)**  
   - List payments; add transaction (amount, client, reference, method).  
   - Optional: link transaction to invoice (e.g. reference or relation).

7. **Settings**  
   - Single form for business identity + billing parameters; save to Payload (global or singleton Settings).

8. **AI Insights**  
   - Button to “Refresh” insights; server fetches invoices + clients from Payload, calls Gemini, returns text; display in same prose block as legacy.

9. **Invoice AI draft (Quantum Drafting)**  
   - Text input + “Generate” in invoice create form; server action or API route calls Gemini; prefill line items (and optional client/notes).

**Phase 2 — Enhancements (Payload + product)**

10. **Payload Admin usage**  
    - Use Payload admin for power users: manage Clients, Invoices, Quotes, Tasks, Transactions, Settings, Media.  
    - Optional: custom React components in admin for line items or rich previews.

11. **Activity log per client**  
    - Logs (note, call, email, meeting) as array on Client or separate Activity collection; show “Records” on client card or detail page.

12. **Invoice numbering**  
    - Enforce unique invoice numbers (e.g. prefix + sequence); hook or beforeValidate in Payload.

13. **Quote → Invoice**  
    - “Convert to invoice” from quote: create invoice from quote’s client + line items.

14. **PDF export**  
    - Generate invoice PDF (e.g. react-pdf or server-side lib) and optional download/email.

15. **Email reminders**  
    - Use existing Gemini `generateReminder` from a server action; send via Resend (or existing email stack).

16. **Search & filters**  
    - Filter invoices/quotes by status, date range; search clients by name/company/email (Payload `where` + query params).

17. **Media for logo**  
    - Settings: logo as Media upload (relation) instead of URL only.

18. **Permissions**  
    - Different roles (e.g. admin vs staff) with Payload access control; optional tenant by organization.

---

### 2.3 AI / external services (keep, move to server)

- **Gemini**  
  - Used today for: (1) parse invoice draft (line items + optional client name/notes), (2) business insights, (3) payment reminder email.  
  - Store API key in env (e.g. `GEMINI_API_KEY`); call only from **server** (server actions or API routes).  
  - No change to product behavior; only move from client-side to server.

- **Resend** (or current email)  
  - Use for verification (already in payload-starter) and later for invoice/reminder emails.

---

### 2.4 Suggested implementation order

1. **Payload:** Add collections (Clients, Invoices with line items, Quotes, Tasks, Transactions, Settings).  
2. **Next.js:** Dashboard layout + Hub page (read from Payload).  
3. **Next.js:** Clients list + create (form → Payload).  
4. **Next.js:** Invoices list + create/edit + preview; AI draft via server action.  
5. **Next.js:** Quotes, Tasks, Transactions, Settings pages (CRUD from Payload).  
6. **Next.js:** AI Insights page (server action with Payload data + Gemini).  
7. **Polish:** Styling parity (globals.css), Lucide icons, auth middleware for `(admin)/*`.  
8. **Phase 2:** Activity logs, quote→invoice, PDF, email reminders, filters/search.

---

## Summary

- **Part 1** adapts the existing 8 views into the Next.js App Router under a single dashboard layout, replaces localStorage with Payload, and moves AI and styling into server and shared CSS.  
- **Part 2** defines Payload collections (Clients, Invoices, Quotes, Tasks, Transactions, Settings) and a phased feature list so the app reaches parity with the clone and then grows with Payload as the single source of truth and admin.

Use this plan as the reference for implementing the Next.js + Payload monolith and for prioritizing features.
