# Tech Intelligence Command Center

Local-first tech intelligence dashboard built with Next.js.

## Electron Phase 1

Phase 1 adds a thin Electron desktop shell around the existing app without rebuilding the React/Next.js UI.

### What Was Added

- Electron main process in `electron/main.js`
- Secure preload bridge in `electron/preload.js`
- Electron Forge config in `forge.config.js`
- Desktop renderer typing in `types/desktop.d.ts`
- A small desktop-aware control in the command center header
- IPC handlers for app info, ping, and JSON export

### Desktop API

The renderer only receives this narrow API:

```ts
window.desktop = {
  appInfo: () => Promise<{ name: string; version: string; platform: string }>,
  exportData: (payload: unknown) => Promise<{ success: boolean; path?: string; error?: string }>,
  ping: () => Promise<string>
}
```

The renderer does not receive raw `ipcRenderer`, filesystem access, `shell`, or broad Electron APIs.

### Run Desktop Development

```bash
npm run dev:desktop
```

This starts the Next.js dev server on `http://127.0.0.1:3000`, waits for it, then launches Electron Forge.

The existing web app can still run separately:

```bash
npm run dev
```

### Package And Make

```bash
npm run package:desktop
npm run make:desktop
```

### Production Loading Assumption

In development, Electron loads the local Next.js dev server.

In packaged mode, Phase 1 tries to load `out/index.html` if a future static export exists. If it does not, it can load `NEXT_APP_URL` when that value points to `localhost` or `127.0.0.1`. Fully bundled offline Next.js serving is intentionally deferred.

### Deferred To Phase 2

- Local database
- Background ingestion
- Notifications
- Offline cache expansion
- Richer file import/export
- Fully bundled local Next.js runtime or static export strategy
- Auto-updater and installer polish
