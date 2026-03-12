-- Run this in Supabase SQL Editor (or psql) to add ledger fields.
-- Fixes: Cash Flow 0, Revenue 0, Ledger All(0) after ledger redesign.
-- Run once per database (local and prod).

-- 1. Add 'check' to transaction method enum
ALTER TYPE "public"."enum_transactions_method" ADD VALUE IF NOT EXISTS 'check';

-- 2. Add transaction type (income/expense)
DO $$ BEGIN
  CREATE TYPE "public"."enum_transactions_type" AS ENUM('income', 'expense');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "type" "public"."enum_transactions_type" DEFAULT 'income' NOT NULL;

-- 3. Link transaction to invoice (optional)
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "invoice_id" integer REFERENCES "invoices"("id");

-- 4. Transaction notes
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "notes" varchar;

-- 5. Add 'partial' to invoice status enum (for partial payments)
ALTER TYPE "public"."enum_invoices_status" ADD VALUE IF NOT EXISTS 'partial';

-- Existing transaction rows get type = 'income' from the DEFAULT above.
