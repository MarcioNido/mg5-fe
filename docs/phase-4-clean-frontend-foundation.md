# Phase 4: clean frontend foundation

## Outcome

The Money Guru 5 frontend is a clean Next.js App Router application based on the visual language of the licensed Minimals `simple-next-ts` 5.0 template. It keeps MUI, the green palette, compact cards, responsive drawer, and dashboard proportions while removing the template's demo pages, mocks, fictional authentication, sample navigation, and unrelated product modules.

The application is intentionally small. Phase 4 implements real login, session recovery, logout, route protection, financial-profile selection, and the dashboard shell. Financial workflows are honest placeholders until Phase 5; no mock balances, transactions, tables, or charts are present.

## Structure

- `app/`: App Router pages, dashboard layouts, error/loading boundaries, and the same-origin API bridge.
- `components/`: the MG5-only shell, navigation, profile selector, account menu, and placeholder presentation.
- `features/auth/`: authentication service, context, session gate, and login helpers.
- `features/tenants/`: tenant/profile context, selection persistence, and display helpers.
- `lib/api/`: one typed HTTP client, normalized errors, DTOs, and tenant-request invalidation.
- `lib/config/`: canonical routes and locale/product configuration.
- `lib/format/`: centralized `en-CA` / CAD formatting.
- `tests/`: focused Vitest coverage for authentication, session expiry, BFF token handling, tenant propagation/invalidation, protection, and redirects.

There is no Redux store or second HTTP library. React context holds only session and currently selected profile state.

## Running locally

Requirements: Node.js 20 and npm.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

The frontend listens on `http://localhost:8081` and expects the Laravel API at `http://localhost:8000` by default.

Validation commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Environment variables

- `MG5_API_URL`: server-only Laravel API origin. It must not use a `NEXT_PUBLIC_` prefix because only the Next.js API bridge needs it.
- `APP_URL`: canonical frontend origin for deployment/documentation. It is not a secret.

No token, API secret, or credential belongs in a `NEXT_PUBLIC_*` variable.

## Authentication and session storage

The Laravel contract is:

- `POST /api/auth/token` with `email` and `password` returns `{ user, token }`.
- `GET /api/auth/my-account` returns `{ user }`.
- `DELETE /api/auth/token` revokes the current Sanctum token.

The browser calls the same-origin Next.js `/api/**` bridge. On successful login, the bridge strips `token` from the JSON response and stores it in the `mg5_session` cookie with `HttpOnly`, `SameSite=Lax`, path `/`, and `Secure` in production. Browser JavaScript never receives the token. The bridge adds the Bearer token only on its server-to-server request to Laravel.

The BFF validates every `POST`, `PUT`, `PATCH`, and `DELETE` before forwarding it. A browser request with `Sec-Fetch-Site` must be `same-origin`, and an `Origin` header must match the externally visible request origin (including forwarded host/protocol support). Cross-origin and malformed origins receive `403` before Laravel is contacted. Requests without browser fetch metadata remain available to trusted server-to-server and test clients; CSRF-capable browser requests provide these headers.

Every BFF response—including authentication, tenants, financial data, validation failures, authorization failures, and API-unavailable errors—sets `Cache-Control: private, no-store`. Backend fetches also use `cache: 'no-store'`.

The cookie is a browser-session cookie rather than a long-lived persistent credential. Reloading the application recovers the user through `auth/my-account`. A backend `401` clears the cookie, emits one centralized session-expired event, clears client state, and returns the user to `/login`. Laravel currently answers successful logout with HTTP 200 and plain text `Token deleted`; the BFF normalizes that response to HTTP 204, and the central client also treats successful non-JSON responses as bodyless. Logout always clears the local cookie, including when Laravel is unavailable, and the UI absorbs the revocation failure after clearing local session state so it cannot become an unhandled console rejection.

The middleware's cookie check is an early navigation guard, not proof of authorization. Session recovery against Laravel remains authoritative.

The BFF removes the need for browser-to-Laravel CORS access and avoids tokens in local/session storage, URLs, logs, or client-visible environment variables.

## Financial-profile selection

`GET /api/tenants` supplies the profiles available to the authenticated user. The UI does not hard-code the available tenant list. Only the friendly display labels for the known `personal` and `clinic` slugs are specialized; any future tenant uses its backend name.

The selected slug is stored as `mg5:selected-tenant` in `localStorage`; it is not secret. On every session:

1. the stored slug is accepted only if it is still present in `/api/tenants`;
2. one available tenant is selected automatically;
3. multiple available tenants with no valid stored selection require an explicit choice;
4. tenant-aware calls require a selected slug and send `X-Tenant-Slug`;
5. switching profiles aborts active tenant requests and advances a generation counter, so a late response from the prior profile is rejected even if its transport ignores abort;
6. `403` and `404` are represented by centralized, user-facing API errors.

Future tenant data caches must key by tenant slug or be invalidated through the existing switch boundary.

## Routes and redirects

Canonical routes:

- `/login`
- `/dashboard`
- `/dashboard/transactions`
- `/dashboard/imports`
- `/dashboard/reconciliation`
- `/dashboard/accounts`
- `/dashboard/categories`
- `/dashboard/rules`

Permanent legacy redirects (HTTP 308):

- `/dashboard/banking/` → `/dashboard`
- `/dashboard/transactions/list/` → `/dashboard/transactions`
- `/dashboard/admin/categories/list/` → `/dashboard/categories`
- `/dashboard/admin/rules/list/` → `/dashboard/rules`

`/` routes to `/dashboard` when the session cookie exists and `/login` otherwise. Missing dashboard sessions redirect to login with a safe internal `returnTo`. Successful login returns only to `/dashboard/**`, preventing an open redirect, and defaults to `/dashboard`.

## Dependencies

The maintained runtime set is deliberately narrow: Next.js 16 (required to resolve current security advisories affecting the template and older supported lines), React 19, MUI 5, Emotion, and MUI icons. Vitest, jsdom, and Testing Library provide focused tests without an end-to-end framework. The route guard uses Next.js 16's `proxy.ts` convention.

Removed groups include Auth0, Firebase, Cognito, Redux, Axios, FullCalendar, data grids, date pickers, charts, maps, editors, drag-and-drop, PDF generation, lightboxes, carousel, internationalization, markdown, upload demos, and all e-commerce/chat/mail/blog/job/tour/invoice/kanban demo code and assets. npm is the only package manager and `package-lock.json` is the only lockfile.

The licensed Minimals notice is retained in `LICENSE.md`.

## Limitations and Phase 5 handoff

- The backend issues opaque Sanctum personal-access tokens without an explicit expiry in the current response. Expiry/rotation policy remains a backend operational decision.
- Account profile is the authenticated user's name/email popover; profile editing is not exposed because the backend has no scoped self-update contract in Phase 4.
- The BFF allowlist prepares existing financial endpoints, but their UI workflows are intentionally not called in this phase.
- No full browser E2E suite was added. Focused route/BFF/client tests cover the critical foundation, and manual responsive validation complements them.

No backend change is required for this architecture. A later deployment must only ensure the Next.js server can reach `MG5_API_URL`; direct browser CORS access is unnecessary.

Phase 5 should implement, in order: import history/status and CSV upload; transaction list/filter/edit and uncategorized review; pending-to-import matching; balance reconciliation; categories and rules; then accounts. Each workflow must use the existing client, require the selected tenant, display real API empty/error/loading states, and add focused tests without adding mock finance data.

## Final verification

Completed on 2026-08-20:

- `npm ci`: passed; 511 packages audited.
- `npm audit --omit=dev` and `npm audit`: passed with zero vulnerabilities.
- `npm run lint`: passed.
- `npm run typecheck`: passed in strict mode.
- `npm test`: 5 files and 20 focused tests passed, including the exact Laravel plain-text logout contract, full `authService.logout()` path, safe UI logout when revocation fails, same-origin acceptance, cross-origin rejection, and no-store response headers.
- `npm run build`: passed; all canonical pages were generated and the BFF remained dynamic.
- `git diff --check`: passed.
- Browser QA passed for desktop login, invalid credentials, successful login, session reload, explicit Clinic selection and persistence, dashboard and placeholder pages, mobile drawer open/close and navigation, legacy redirect, account menu, and logout. The browser console contained no errors or warnings.

Because the local Laravel service was not running during visual QA, an in-memory localhost server reproduced only the already-verified auth/session/logout/tenant response contracts. It created no files or financial data and was stopped immediately after validation.
