# Swiftbook iOS & watchOS

Native Apple clients for the Swiftbook agent API. They live under `apps/ios` and are **not** mixed into the Next.js / Payload web app at the repo root.

## Layout

```
apps/ios/
  Swiftbook.xcodeproj    # Open this in Xcode
  Shared/                # API client, auth, chat streaming (both targets)
  Swiftbook/             # iPhone — chat UI (typing + voice recording)
  SwiftbookWatch/        # watchOS — voice-only agent UI
```

## Backend

The apps call the same endpoints as the web agent workspace:

| Endpoint | Purpose |
|----------|---------|
| `POST /api/users/login` | Email/password → JWT |
| `POST /api/agent/chat` | SSE agent stream (`Authorization: JWT …`) |
| `GET /api/agent/sessions` | Conversation list |
| `GET /api/agent/sessions/:id/history` | Thread history |

Run the web app locally (`pnpm dev` from repo root), then point the clients at it.

### API base URL

Set `SWIFTBOOK_API_BASE_URL` in the target build settings (Debug defaults to `http://127.0.0.1:3000`).

- **Simulator:** `http://127.0.0.1:3000` works.
- **Physical device:** use your Mac’s LAN IP, e.g. `http://192.168.1.10:3000`, and ensure the device can reach the dev server.

Update **Release** `SWIFTBOOK_API_BASE_URL` to your production host before shipping.

## Open in Xcode

```bash
open apps/ios/Swiftbook.xcodeproj
```

Always run the **Swiftbook** scheme (iPhone). It embeds the watch app. Do **not** run **SwiftbookWatch** alone in the simulator — WatchConnectivity will not link and the watch UI will stay on “Connecting to iPhone”.

**Simulator pairing:** run Swiftbook on the iPhone simulator, then open the Swiftbook Watch app from the watch face (same paired watch simulator). Keep the iPhone app in the **foreground** when using voice on the watch.

## Features

- **iPhone:** SwiftUI mobile dashboard (Insights, Contacts, Billing, Tasks, Settings) matching the web tab bar; branded dark UI; CRM Assistant chat (text + voice) from Insights.
- **Watch:** Sign in, voice-only (mic button), no keyboard composer. Speech recognition runs on the paired **iPhone** via WatchConnectivity (keep the iPhone app installed and reachable).

Auth tokens are stored in the Keychain per device. Sign in on each device (or add App Groups later to share tokens).

## Monorepo note

Web app code remains at the repository root (`src/`, `package.json`, etc.). Only Apple platform code belongs under `apps/ios/`.
