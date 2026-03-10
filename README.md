# ergCompare Frontend

Next.js frontend for ergCompare, an EV vs ICE fleet comparison application.

This app provides:

- Email/password login against the Flask backend
- Dashboard of saved comparison reports
- New comparison flow with map-based location selection
- EV catalog selection from backend data
- Comparison results and TCO views
- Account settings and password change

## Stack

- Next.js 16
- React 19
- TypeScript
- TanStack Query
- Mapbox via `react-map-gl`
- Recharts

## Architecture

This frontend uses a BFF-style pattern with Next.js route handlers.

Request flow:

```text
Browser -> Next.js app -> Flask backend
```

Key points:

- The frontend does not issue JWTs itself
- Login happens through `src/app/api/auth/login/route.ts`
- The backend returns a JWT
- The frontend stores that JWT in an HTTP-only cookie named `ergcompare_access_token`
- Server-side fetches forward that token to the backend as a Bearer token

## Requirements

- Node.js 18+
- pnpm
- Running ergCompare backend (`fleets-backend`)

## Environment Variables

Create `./.env.local` with:

```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<your-mapbox-token>
NEXT_PUBLIC_APP_URL=http://fleets.localtest.me:3007
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:6009
```

Notes:

- `NEXT_PUBLIC_BACKEND_URL` must point to the Flask backend
- In local development the backend runs on port `6009`
- `.env.local` is gitignored and must not be committed

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the app:

```bash
pnpm dev --hostname 0.0.0.0 --port 3007
```

Open:

```text
http://fleets.localtest.me:3007
```

`localtest.me` resolves to `127.0.0.1`, so no hosts file edit is needed.

## Backend Dependency

This app depends on the Flask backend for:

- Login and session validation
- EV catalog data
- Project resolution
- Report create/read/delete
- Password change

If the backend is not running, login and dashboard data will fail.

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
- `src/app/api` - BFF route handlers
- `src/lib/auth.ts` - session and auth helpers
- `src/lib/backend.ts` - backend fetch helper
- `src/lib/query-hooks.ts` - TanStack Query hooks
- `src/components/Map` - Mapbox location picker
- `src/components/modals` - EV selection modal

## Auth Summary

Current auth model:

- Self-hosted JWT auth from the Flask backend
- No Auth0
- No frontend secret needed for JWT signing
- JWT secret lives only in backend environment variables

Cookie settings:

- `httpOnly: true`
- `sameSite: "lax"`
- `secure: true` in production

## Deployment

Recommended deployment target for this frontend: Vercel.

Why:

- This is not a static-only frontend
- It uses Next.js route handlers and server-side auth checks
- It needs a running Node/Next.js server environment

At deploy time, configure these env vars in Vercel:

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_BACKEND_URL`

The backend remains deployed separately.

## GitHub Readiness

Before pushing:

- Keep `.env.local` uncommitted
- Do not commit `.next/`
- Do not commit `node_modules/`
- Verify backend URLs are environment-driven, not hardcoded for production

## Notes

- Vehicle images are loaded from the existing S3 asset bucket using vehicle ID
- Map reverse geocoding uses the public Mapbox token
- Currency formatting on the results page still has follow-up work planned

## Related Repos

- `fleets-backend` - Flask backend API and JWT auth

