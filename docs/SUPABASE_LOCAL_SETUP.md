# Supabase local setup (Postgres only for Payload)

Use Supabase locally via Docker **only as Postgres**. Payload is the source of truth — no Supabase Auth, Storage, or Edge Functions.

---

## Prerequisites

### 1. Docker Desktop

- Ensure **Docker Desktop** is running.
- Verify: `docker info` (no "Cannot connect" error).

### 2. Supabase CLI

**Install (macOS, zsh):**

```bash
# Option A: npx (no global install; requires Node 20+)
npx supabase --version

# Option B: dev dependency (recommended for this project)
pnpm add -D supabase
# Then: pnpm exec supabase --version

# Option C: Homebrew
brew install supabase/tap/supabase
```

**Verify:**

```bash
npx supabase --version
# or: pnpm exec supabase --version
```

You should see a version (e.g. `2.x.x`).

---

## Initialize local Supabase inside the project

### 1. Create a dedicated folder and init

From the **project root** (invoiceApp):

```bash
mkdir -p infra
cd infra
npx supabase init
# or: pnpm exec supabase init
cd ..
```

This creates **infra/supabase/** (not a top-level `supabase/`).

### 2. What `supabase init` creates

| Path | Purpose |
|------|---------|
| **infra/supabase/config.toml** | Main config: ports, project_id, API/DB/Studio, auth, etc. |
| **infra/supabase/migrations/** | SQL migrations (empty at first). |
| **infra/supabase/seed.sql** | Optional seed data. |

### 3. Configure local ports and project_id

Edit **infra/supabase/config.toml**.

- **project_id**  
  - Required. Defaults to the **directory name** where you ran `supabase init` (e.g. `supabase`).  
  - Used in **Docker container and volume names** (e.g. `supabase_db_<project_id>`).  
  - Set something unique if you run multiple Supabase projects on the same machine (e.g. `invoiceapp`).

- **Ports**  
  - Use non-conflicting ports if 54321–54324 are already in use (e.g. by another Supabase or Postgres).

**Example snippet** (this project uses 54331+ so it does not conflict with readytowork-local):

```toml
# infra/supabase/config.toml

project_id = "invoiceapp"

[api]
port = 54331

[db]
port = 54332

[studio]
port = 54333
```

This project uses **54332** for the DB (and 54331/54333 for API/Studio) so it does not conflict with other local Supabase projects (e.g. readytowork-local on default 54321–54329).

---

## Start Supabase locally

From **project root**:

```bash
cd infra
npx supabase start
# or: pnpm exec supabase start
cd ..
```

Or use the project scripts (after `pnpm install`):

```bash
pnpm supabase:start
```

First run downloads Docker images and can take a few minutes.

### Read DB URL and status

```bash
cd infra
npx supabase status
# or: pnpm supabase:status
cd ..
```

Example output (invoiceApp uses 54331+ to avoid conflict with other Supabase):

```
         API URL: http://127.0.0.1:54331
          DB URL: postgresql://postgres:postgres@127.0.0.1:54332/postgres
      Studio URL: http://127.0.0.1:54333
```

- **DB URL** is what Payload uses (`DATABASE_URI`).
- **DB port** for this project is **54332**.

**Docker:** Containers are named like `supabase_*_invoiceapp` (or your `project_id`). List them:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

---

## Connect Payload to local Postgres

### DATABASE_URI format

Use the **exact** connection string from `supabase status` (Payload accepts `postgres` or `postgresql`). For this project (port 54332):

```text
postgresql://postgres:postgres@127.0.0.1:54332/postgres
```

### Where to put it

In **invoiceApp** root, edit **.env**:

```bash
# .env
DATABASE_URI=postgresql://postgres:postgres@127.0.0.1:54322/postgres
PAYLOAD_SECRET=your-secure-secret-key-min-32-chars-change-in-production
# ... rest unchanged
```

Then restart the app: `pnpm dev`.

---

## Verify the database

### Connect with psql and list tables

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" -c "\dt"
```

After Payload has run at least once and created its schema:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" -c "\dt public.*"
```

You should see Payload tables (e.g. `users`, `media`, `payload_preferences`, etc.).

### Sanity check query

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" -c "SELECT current_database(), current_user;"
```

Expected: `postgres` / `postgres` — confirms you’re on the local Supabase Postgres instance.

---

## Best-practice local workflow

### Stop / start the stack

```bash
cd infra
npx supabase stop    # stop containers, keep data
npx supabase start   # start again
cd ..
# Or: pnpm supabase:stop / pnpm supabase:start
```

### Full reset (wipe DB and volumes)

```bash
cd infra
npx supabase stop --no-backup
npx supabase start
cd ..
```

- **stop --no-backup** removes local DB data and related volumes.  
- After that, run `pnpm dev` so Payload can recreate tables.

### What to delete for a clean slate

- **Containers:** `supabase stop` (or `docker compose down` if you use compose).
- **Volumes:** `supabase stop --no-backup` deletes Supabase-managed volumes. To remove all Supabase volumes:  
  `docker volume ls | grep supabase` then `docker volume rm <name>`.

---

## Supabase local vs plain Postgres container

| | **Supabase local** | **Plain Postgres container** |
|--|--------------------|------------------------------|
| **What you get** | Postgres + API (PostgREST), Studio, Auth, Storage, Realtime, etc. in Docker. | Only Postgres. |
| **Use case here** | Use **only** the Postgres service; same stack as production Supabase if you later use hosted Supabase. | Simpler if you never need Supabase services. |
| **Connection** | Same `postgresql://...` URL; Payload doesn’t care which one runs the DB. | Same; just point `DATABASE_URI` at the container’s host:port. |

For this project we use **Supabase local** so the DB matches Supabase’s Postgres; we ignore Auth/Storage/Edge and use Payload only.
