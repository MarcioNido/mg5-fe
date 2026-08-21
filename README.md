# Money Guru 5 frontend

Clean Next.js App Router frontend for personal and clinic management finance. The UI uses English, CAD, `en-CA`, and the `America/Toronto` business timezone.

## Setup

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:8081`. The default environment expects the Laravel backend at `http://localhost:8000`.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Authentication uses a small same-origin Next.js API bridge. The Laravel Sanctum token remains in a server-managed `HttpOnly` cookie and is never exposed to browser JavaScript. Financial-profile selection comes from the authenticated backend tenant list and tenant-aware requests send `X-Tenant-Slug`.

See [Phase 4 documentation](docs/phase-4-clean-frontend-foundation.md) for the foundation and [Phase 5A.2 documentation](docs/phase-5a-accounts-imports.md) for account management, CSV upload/history/detail, polling, and tenant isolation.
