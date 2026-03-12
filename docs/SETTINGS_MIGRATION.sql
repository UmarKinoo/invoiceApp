-- Run this if you add logo upload + BRN/VAT to Settings and need to update the DB manually.
-- Otherwise run: pnpm payload migrate
-- Run once per database (local and prod).

-- Logo (upload relation to media)
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logo_id" integer REFERENCES "media"("id");
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logo_white_id" integer REFERENCES "media"("id");

-- Payment details on invoice
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "business_brn" varchar;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "vat_registration_number" varchar;
