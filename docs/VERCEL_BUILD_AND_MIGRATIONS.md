# Vercel build command – do NOT run migrations

## What happened

If you set the Vercel **Build Command** to something like:

```bash
pnpm payload migrate && pnpm build
```

then **every deploy** runs `payload migrate` against the database pointed to by `DATABASE_URI`. On Vercel, that is usually your **production** database.

- `payload migrate` applies all pending migrations.
- Some migrations can **drop tables**, **recreate schemas**, or **wipe data**.
- So running migrate during build can **delete all production data** (invoices, clients, etc.).

## Correct setup

**Build Command (Vercel):** use only the app build. Do **not** run any DB commands.

```bash
pnpm build
```

**Database on Vercel:** The app connects to Postgres using `DATABASE_URI` (or, if unset, `SUPABASE_URL`). For production you must set **one** of these to your **production** Postgres connection string (e.g. Supabase pooler URL: `postgresql://postgres.xxx:password@xxx.pooler.supabase.com:6543/postgres`). If neither is set or both point to localhost, the deployed app will not see your prod data.

(or leave it empty so Vercel uses the default from `package.json`: `next build`).

**Do not use:**

- `pnpm payload migrate && pnpm build`
- `pnpm payload db push && pnpm build`
- Any command that touches the database during build

## When to run migrations

Run migrations **only** when you intend to change the schema, and **only** against the DB you mean to change:

1. **Locally:**  
   `pnpm payload migrate` (or `payload migrate`) while your app uses local DB (e.g. `DATABASE_URI=postgresql://...@127.0.0.1:54332/...`).

2. **Production:**  
   - Option A: Run migrate **manually** from your machine, with `DATABASE_URI` set to the **production** URL (and only when you’re sure the migrations are safe).
   - Option B: Use a one-off script or job that runs migrate once per deployment, **outside** the Vercel build step (e.g. a separate GitHub Action or a script you run by hand after deploy).
   - **Always** backup the production DB before running migrations (e.g. Supabase dashboard backup / point-in-time recovery if available).

## Recovery

If production data was already lost because migrate ran during build:

1. **Supabase:** Check [Supabase Dashboard → Database → Backups](https://supabase.com/dashboard) (or your project’s backup / PITR) and restore to a time before the bad deploy, if a backup exists.
2. **Change the Vercel Build Command** to `pnpm build` (or default) and redeploy so future deploys never run migrate during build.
3. If you have no backup, the data may be unrecoverable; avoid running migrate in the build from now on.

## Summary

| Do | Don’t |
|----|--------|
| Build command = `pnpm build` | Build command = `pnpm payload migrate && pnpm build` |
| Run migrations manually or in a separate job | Run migrations during Vercel build |
| Backup prod before running migrate | Run migrate on prod without a backup |
