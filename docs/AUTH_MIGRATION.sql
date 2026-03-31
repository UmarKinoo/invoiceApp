-- Add missing auth/session hardening fields.
-- Safe to run multiple times.

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "last_login_at" timestamp(3) with time zone;

