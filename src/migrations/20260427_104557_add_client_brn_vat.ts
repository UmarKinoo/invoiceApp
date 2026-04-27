import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_transactions_type" AS ENUM('income', 'expense');
  ALTER TYPE "public"."enum_invoices_status" ADD VALUE 'partial' BEFORE 'paid';
  ALTER TYPE "public"."enum_transactions_method" ADD VALUE 'check';
  ALTER TABLE "media" ALTER COLUMN "alt" SET DEFAULT 'Company logo';
  ALTER TABLE "clients" ALTER COLUMN "email" DROP NOT NULL;
  ALTER TABLE "clients" ALTER COLUMN "phone" SET NOT NULL;
  ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp(3) with time zone;
  ALTER TABLE "clients" ADD COLUMN "brn" varchar;
  ALTER TABLE "clients" ADD COLUMN "vat_number" varchar;
  ALTER TABLE "transactions" ADD COLUMN "type" "enum_transactions_type" DEFAULT 'income' NOT NULL;
  ALTER TABLE "transactions" ADD COLUMN "invoice_id" integer;
  ALTER TABLE "transactions" ADD COLUMN "notes" varchar;
  ALTER TABLE "settings" ADD COLUMN "logo_id" integer;
  ALTER TABLE "settings" ADD COLUMN "logo_white_id" integer;
  ALTER TABLE "settings" ADD COLUMN "business_brn" varchar;
  ALTER TABLE "settings" ADD COLUMN "vat_registration_number" varchar;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settings" ADD CONSTRAINT "settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settings" ADD CONSTRAINT "settings_logo_white_id_media_id_fk" FOREIGN KEY ("logo_white_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "transactions_invoice_idx" ON "transactions" USING btree ("invoice_id");
  CREATE INDEX "settings_logo_idx" ON "settings" USING btree ("logo_id");
  CREATE INDEX "settings_logo_white_idx" ON "settings" USING btree ("logo_white_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transactions" DROP CONSTRAINT "transactions_invoice_id_invoices_id_fk";
  
  ALTER TABLE "settings" DROP CONSTRAINT "settings_logo_id_media_id_fk";
  
  ALTER TABLE "settings" DROP CONSTRAINT "settings_logo_white_id_media_id_fk";
  
  ALTER TABLE "invoices" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'draft'::text;
  DROP TYPE "public"."enum_invoices_status";
  CREATE TYPE "public"."enum_invoices_status" AS ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled');
  ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."enum_invoices_status";
  ALTER TABLE "invoices" ALTER COLUMN "status" SET DATA TYPE "public"."enum_invoices_status" USING "status"::"public"."enum_invoices_status";
  ALTER TABLE "transactions" ALTER COLUMN "method" SET DATA TYPE text;
  ALTER TABLE "transactions" ALTER COLUMN "method" SET DEFAULT 'stripe'::text;
  DROP TYPE "public"."enum_transactions_method";
  CREATE TYPE "public"."enum_transactions_method" AS ENUM('stripe', 'paypal', 'bank_transfer', 'cash');
  ALTER TABLE "transactions" ALTER COLUMN "method" SET DEFAULT 'stripe'::"public"."enum_transactions_method";
  ALTER TABLE "transactions" ALTER COLUMN "method" SET DATA TYPE "public"."enum_transactions_method" USING "method"::"public"."enum_transactions_method";
  DROP INDEX "transactions_invoice_idx";
  DROP INDEX "settings_logo_idx";
  DROP INDEX "settings_logo_white_idx";
  ALTER TABLE "media" ALTER COLUMN "alt" DROP DEFAULT;
  ALTER TABLE "clients" ALTER COLUMN "email" SET NOT NULL;
  ALTER TABLE "clients" ALTER COLUMN "phone" DROP NOT NULL;
  ALTER TABLE "users" DROP COLUMN "last_login_at";
  ALTER TABLE "clients" DROP COLUMN "brn";
  ALTER TABLE "clients" DROP COLUMN "vat_number";
  ALTER TABLE "transactions" DROP COLUMN "type";
  ALTER TABLE "transactions" DROP COLUMN "invoice_id";
  ALTER TABLE "transactions" DROP COLUMN "notes";
  ALTER TABLE "settings" DROP COLUMN "logo_id";
  ALTER TABLE "settings" DROP COLUMN "logo_white_id";
  ALTER TABLE "settings" DROP COLUMN "business_brn";
  ALTER TABLE "settings" DROP COLUMN "vat_registration_number";
  DROP TYPE "public"."enum_transactions_type";`)
}
