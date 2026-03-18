# ergCompare Frontend

Next.js frontend for ergCompare, focused on EV vs ICE fleet comparison workflows.

## What This App Does

- email/password login against the Flask backend
- dashboard of saved comparison reports
- vehicle catalog filtered by selected market
- new comparison flow with map-based location selection
- EV vs ICE comparison results and report views
- account settings and password change

## Stack

- Next.js 16
- React 19
- TypeScript
- TanStack Query
- Mapbox via `react-map-gl`
- Recharts

## Architecture

This frontend uses a small BFF layer through Next.js route handlers.

```text
Browser -> Next.js app -> Flask backend
```

Key points:

- login is proxied through `src/app/api/auth/login/route.ts`
- backend JWTs are stored in an HTTP-only cookie
- server-side fetches forward that JWT to the backend as a Bearer token
- comparison, catalog, auth, and ICE parameter requests go through `src/app/api/*`

## Requirements

- Node.js 18+
- pnpm
- running ergCompare backend

## Environment Variables

Create `./.env.local` with values appropriate for your environment:

```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<your-mapbox-token>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:5000
```

Notes:

- `NEXT_PUBLIC_APP_URL` should match the actual local URL and port you choose
- `NEXT_PUBLIC_BACKEND_URL` must point to the Flask backend
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` your mapbox access token
- `.env.local` is gitignored and must not be committed

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the app:

```bash
pnpm dev
```

This frontend does not require a specific port. If the default port is busy, run it on any open port:

```bash
pnpm dev -- --port 3010
```

If you change the port, update `NEXT_PUBLIC_APP_URL` to match it.

## Main Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
```

## Important App Areas

- `src/app/login` - login screen
- `src/app/(dashboard)` - authenticated dashboard area
- `src/app/api` - frontend BFF route handlers
- `src/lib/auth.ts` - auth and cookie helpers
- `src/lib/backend.ts` - backend fetch helper
- `src/lib/query-hooks.ts` - TanStack Query hooks
- `src/components/Map` - location picker map
- `src/components/modals` - selection modals

## Backend Dependency

This app depends on the Flask backend for:

- login and session validation
- EV catalog data
- ICE parameter lookup
- report create/read/delete
- password change

If the backend is not running or is misconfigured, login and comparison flows will fail.

## Deployment

Frontend deployment is handled by Vercel.

Current behavior:

- pushes to the `main` branch trigger deployment to Vercel
- Vercel handles the Next.js build and hosting
- frontend environment variables are configured in Vercel, not in this repo

There is no frontend GitHub Actions deployment workflow in this repository. The deployment is managed directly by the Vercel project integration.

At deploy time, make sure these environment variables exist in Vercel:

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_BACKEND_URL`

## Notes

- vehicle images are loaded from the existing S3 asset bucket by vehicle ID
- market-aware ICE defaults are fetched through `/api/ice-parameter`
- report pages use the saved comparison payload, so historical reports stay stable even if backend defaults change later

## Related Repo

- `fleets-backend` - Flask backend API, auth, reports, migrations, and deployment target
