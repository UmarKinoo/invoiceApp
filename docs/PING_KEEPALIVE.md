# Ping keep-alive (avoid Supabase DB pause)

Supabase free tier can pause projects after inactivity. The app exposes `/api/ping`, which runs a tiny DB query so your database stays active.

## How it works

- **Route:** `GET /api/ping`
- **Uses:** Same DB as the app (`DATABASE_URI`). It runs `payload.count({ collection: 'health_check' })`.
- **Vercel:** If you deploy on Vercel, `vercel.json` runs this endpoint every 6 hours via cron.

## How to test

### 1. Local (dev server running)

```bash
# From project root, with dev server running (pnpm dev)
curl -s http://localhost:3000/api/ping | jq
```

**Expected when DB is OK:**

```json
{
  "status": "ok",
  "db": "connected",
  "health_check_count": 1
}
```

**Expected when DB is missing or down:**

```json
{
  "status": "error",
  "error": "..."
}
```
with HTTP 500.

### 2. Production (after deploy)

```bash
curl -s https://your-app.vercel.app/api/ping | jq
```

Same response shape. If you see `"status": "ok"` and `"db": "connected"`, the function is working and your DB is being hit regularly.

### 3. Vercel cron

- In Vercel: Project → Settings → Crons (or see [Vercel Cron](https://vercel.com/docs/cron-jobs)).
- Schedule is in `vercel.json`: `0 */6 * * *` (every 6 hours).
- Ensure `DATABASE_URI` is set in Vercel env for production so the ping uses your prod DB.

## Summary

- **Local:** `curl http://localhost:3000/api/ping`
- **Prod:** `curl https://YOUR_DOMAIN/api/ping`
- **Cron:** Vercel runs it every 6 hours if `vercel.json` crons are enabled.

If the response is `"status": "ok"`, the keep-alive is working and you’re less likely to lose the Supabase DB due to inactivity.
