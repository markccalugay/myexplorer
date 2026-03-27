# Google Maps Config Contract

This note exists so future contributors do not have to rediscover the same Google Maps key failure mode through changelog archaeology.

## Canonical Local Setup

For the web app, the canonical local source of truth is:

- `.env.local`

Create it by copying:

- `.env.example`

Required key:

- `VITE_GOOGLE_MAPS_API_KEY`

Optional key:

- `VITE_GOOGLE_MAPS_MAP_ID`

## Why This Exists

MyExplorer has previously regressed into a fail-closed Maps state because the app reached runtime without a usable `VITE_GOOGLE_MAPS_API_KEY`, even after earlier work removed the checked-in fallback key.

The root lesson:

- the repo must not depend on memory or a silently running old Vite process for Maps to work

## Operational Rules

- Do not commit the real browser Maps API key into source control.
- Keep the real local key in `.env.local`.
- Restart the Vite dev server after changing env values because Vite reads them at process start.
- Use `npm run maps:doctor` to see which key source the repo is currently detecting.
- `npm run dev` and `npm run build` now run a preflight check first, so missing Maps config fails early instead of waiting until the app shell is already running.

## CI Contract

CI build verification uses an explicit placeholder `VITE_GOOGLE_MAPS_API_KEY` so the repo's build contract stays deterministic without requiring the production browser key in source control.

That placeholder exists only to let TypeScript/Vite build artifacts be produced during verification. It is not a substitute for a real local or deployed browser key.

## Future-Self Reminder

If the Maps banner ever reappears:

1. Run `npm run maps:doctor`
2. Verify the key source is `.env.local` or an intentionally injected runtime environment
3. Restart the dev server
4. Only after that investigate product code

If someone suggests reintroducing a checked-in fallback key, treat that as a temporary incident workaround, not a stable fix.
