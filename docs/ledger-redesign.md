# Ledger Redesign Plan

## Current State

The Transactions page is a standalone, manually-entered payment log disconnected from the invoicing system:

- **Data model** (`Transactions.ts`): Each transaction has `date`, `amount`, `client` (relationship), `reference` (free text), and `method` (stripe/paypal/bank/cash).
- **UI**: A table listing payments with a "Log Payment" dialog to manually add entries. Reference is plain text, not linked to an invoice.
- **Dashboard stats**: "Cash Flow" sums invoices with `status === 'paid'`, and "Capital Out" sums non-paid/non-cancelled invoices. These come from the Invoices collection, not Transactions.

**Core problem**: Invoices and Transactions live in two separate worlds. Marking an invoice as "paid" doesn't create a transaction. Logging a transaction doesn't update any invoice status. The dashboard ignores the transactions table entirely.

---

## Proposed Changes

### 1. Link transactions to invoices

Replace the free-text `reference` field with a relationship:

```typescript
{
  name: 'invoice',
  type: 'relationship',
  relationTo: 'invoices',
  required: false, // not all payments are for invoices (e.g. expenses)
}
```

### 2. Support partial payments

- An invoice for $10,000 might be paid in two $5,000 installments.
- **Amount due** = `invoice.total - sum(linked transactions)`
- **Auto-status**: when amount due hits 0 → `paid`, partially paid → `partial`, past due date with balance → `overdue`.

### 3. Auto-create transactions when invoice status changes

When a user marks an invoice as "paid", automatically create a transaction record (amount = remaining balance, date = today, method = selected).

### 4. Two-way: income and expenses

Add a `type` field:

- **income** – payments received (linked to invoices)
- **expense** – money going out (rent, tools, subscriptions)

Turns the dashboard "Cash Flow" into real P&L: `sum(income) - sum(expenses)`.

### 5. Dashboard should read from the ledger

Instead of computing stats from invoice statuses:

- **Revenue** = sum of all income transactions
- **Outstanding** = sum of unpaid invoice balances (total - linked payments)
- **Profit** = revenue - expenses (if expenses are tracked)

### 6. Reconciliation view

The ledger page should show:

- Which invoices have been fully paid, partially paid, or unpaid
- Unmatched transactions (payments not linked to any invoice)
- A running balance over time

### 7. Proposed data model

```
Transaction:
  - date (required)
  - type: 'income' | 'expense'
  - amount (required)
  - invoice (relationship to invoices, optional)
  - client (relationship to clients, required)
  - method: stripe | paypal | bank_transfer | cash | check
  - reference (auto-generated or manual, e.g. "PAY-001")
  - notes (optional)
```

---

## Files to modify

- `src/collections/Transactions.ts` – new schema
- `src/collections/Invoices.ts` – add hooks for auto-transaction creation
- `src/app/(frontend)/(admin)/dashboard/transactions/` – rebuild UI
- `src/app/(frontend)/(admin)/dashboard/dashboard-page-client.tsx` – stats from ledger
- `src/app/(frontend)/(admin)/dashboard/invoices/` – show payment history per invoice
