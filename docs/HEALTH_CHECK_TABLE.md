# health_check table – "must be owner of table" fix

If you see:

```text
Error: Failed query: ALTER TABLE "health_check" ADD PRIMARY KEY ("id");
[cause]: error: must be owner of table health_check
```

the table exists but was created by a different database user (e.g. Supabase superuser). Payload needs to alter it, so the app’s DB user must own it.

**Fix (run in your DB as a superuser or current owner):**

```sql
-- Replace your_payload_db_user with the DB user your app uses (e.g. postgres, or the user in DATABASE_URI)
ALTER TABLE health_check OWNER TO your_payload_db_user;
```

Example for a local Supabase Postgres:

```sql
ALTER TABLE health_check OWNER TO postgres;
```

After this, Payload can run migrations on `health_check` and the error should stop.
