# Auth redirect loop fix (Payload + Next.js)

Use this when you see an infinite redirect between `/login` and `/dashboard` (or similar) that only stops after clearing browser cache/cookies. It can happen in dev and production.

---

## Root cause

1. **Proxy/middleware** redirects “auth” routes (e.g. `/login`) to the app (e.g. `/dashboard`) whenever a **cookie exists**, without validating the token.
2. **Layout/page** uses **token validation** (e.g. `getUser()` / `payload.auth()`) and redirects to `/login` when the token is invalid or expired.
3. With an **expired/invalid token**:
   - `GET /dashboard` → layout validates → invalid → redirect to `/login` (307).
   - `GET /login` → proxy sees cookie → redirect to `/dashboard` (307).
   - Repeat → **infinite loop**.

Clearing cache fixes it because it removes the stale cookie.

---

## Fix 1: Don’t redirect auth routes based on cookie presence only

**In your proxy or middleware** (the thing that runs before the page):

- **Remove** the logic that says: “if path is `/login` (or `/register`, etc.) **and** cookie exists → redirect to `/dashboard`.”
- Let the **login page** (and other auth pages) decide. They already call `getUser()` (or equivalent), validate the token, and redirect to `/dashboard` only when the user is actually valid.

So:

- **Protected routes:** keep “no cookie → redirect to login”.
- **Auth routes:** do **not** redirect to dashboard just because a cookie exists; always `NextResponse.next()` and let the page validate.

Example (conceptual):

```ts
// BAD: causes loop when token is expired
if (AUTH_ROUTES.includes(pathname) && token) {
  return NextResponse.redirect(new URL('/dashboard', request.url))
}

// GOOD: remove that block; let the login page call getUser() and redirect only when valid
return NextResponse.next()
```

---

## Fix 2: Clear invalid token when auth fails

**In `getUser()` (or wherever you validate the token):**

When validation fails (e.g. `payload.auth()` throws or returns no user), **delete the auth cookie** so the next request doesn’t send a bad token.

```ts
export async function getUser(): Promise<User | null> {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: await configPromise })
    const { user } = await payload.auth({ headers })
    return user || null
  } catch (error) {
    console.error('Error getting user:', error)
    try {
      const cookieStore = await cookies()
      cookieStore.delete('payload-token')
    } catch {
      // ignore
    }
    return null
  }
}
```

---

## Fix 3: Cookie SameSite

Use **`sameSite: 'lax'`** for the auth cookie (not `strict`) so it’s sent on normal top-level navigations (e.g. after a 307 redirect). Avoids edge cases where the first request after redirect doesn’t send the cookie.

```ts
cookieStore.set('payload-token', result.token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  expires: expiresDate,
})
```

---

## Fix 4: Don’t cache auth redirects (optional)

On proxy/middleware responses for auth-related paths, set:

```ts
res.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate')
```

so a cached “redirect to dashboard” isn’t served to an unauthenticated user.

---

## Checklist for another project

- [ ] Proxy/middleware: **no** redirect from `/login` (or auth routes) to `/dashboard` based only on “cookie exists”.
- [ ] `getUser()` (or equivalent): on auth failure, **delete** the auth cookie.
- [ ] Auth cookie: **`sameSite: 'lax'`**.
- [ ] (Optional) Proxy/middleware: **Cache-Control: no-store** on auth/protected routes.

---

*Saved from invoiceApp – Payload 3 + Next.js.*
