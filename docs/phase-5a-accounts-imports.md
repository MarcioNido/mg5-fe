# Phase 5A.2: Accounts and CSV imports frontend

## Outcome

The Accounts and Imports dashboard routes now use the tenant-aware Laravel API through the existing same-origin BFF. The implementation adds no HTTP, upload, form, table, state-management, or notification dependency. It keeps the Phase 4 authentication, `TenantProvider`, centralized `apiRequest`, HttpOnly session cookie, same-origin mutation checks, and `private, no-store` behavior.

The interface is English, uses `en-CA`, displays account currency with CAD as the fallback, and formats timestamps in `America/Toronto`. Account currency input is normalized to uppercase and must contain exactly three ASCII letters. The presentation formatter catches unsupported/invalid currency codes and safely falls back to CAD. Decimal financial values remain strings in API types and state. Numeric conversion is used only inside the final presentation formatter; no frontend calculation or financial decision uses it.

## Feature structure

`features/accounts/` contains the account DTOs and labels, tenant-aware service, list hook, responsive account cards, masking helper, and create/edit dialog. `features/imports/` contains the import DTOs and status labels, tenant-aware service, native upload form, paginated history, safe detail presentation, and polling orchestration.

Shared display/error helpers live in `lib/format/` and `lib/api/ui-error.ts`. The canonical browser API remains `lib/api/client.ts`.

## API routes

Accounts use:

- `GET /api/accounts`
- `POST /api/accounts`
- `PATCH /api/accounts/{id}`

Imports use:

- `POST /api/files`
- `GET /api/files?page=&per_page=&account_id=&status=`
- `GET /api/files/{id}`

Every request sets `tenantAware: true` and supplies the selected slug, causing `X-Tenant-Slug` to be sent. History uses `per_page=15`; the service caps any supplied value at 50 and preserves filters while changing pages. Results remain in backend order.

## Accounts flow

The Accounts page lists the selected profile's accounts with loading, retry, and useful empty states. Account numbers are never logged and are masked in the list to their last four characters. The complete number is retained only in the edit form.

The MUI dialog supports `name`, `type`, optional `account_number`, currency, opening balance, and optional opening date. It focuses the name field, disables actions while saving, blocks unsafe dismissal of dirty data, displays Laravel 422 field errors, and refreshes the list after create/update. Opening balance validation accepts a signed decimal with up to four fractional places while Laravel remains authoritative. Currency is uppercased and client-validated as three ASCII letters before submission. Deletion is intentionally absent.

The account feature is keyed to the tenant slug. Switching profiles unmounts the old list and dialog immediately, aborts its tenant-aware requests through the Phase 4 generation boundary, and mounts clean state for the new profile.

## Upload flow and duplicate behavior

The native single-file form requires an account and accepts `.csv` or `.txt` up to 10 MB. It explains RBC/Triangle support, gives client-side extension/size feedback, and displays Laravel 422 errors. Its visible Choose file control is keyboard-focusable, activates with Enter or Space, exposes an accessible name and associated help/error text, and keeps the selected filename visible. The native input is visually clipped rather than removed from the accessibility tree. With a successful empty account response, upload is disabled and the user is linked to Accounts. If account loading fails, Imports instead shows the real error with Retry and keeps upload disabled; it never misrepresents that failure as an empty list.

Upload uses `FormData` keys `account_id` and `file`. The browser client deliberately does not set `Content-Type`; the browser-generated multipart boundary reaches the BFF. The BFF copies the complete multipart content type, forwards the body as an `ArrayBuffer`, sends `X-Tenant-Slug`, preserves backend statuses such as 200, 201, 422, and 503, and applies `Cache-Control: private, no-store`.

Success is determined only from `meta.duplicate_upload`. New imports announce `Statement uploaded successfully.` Duplicate uploads announce that the existing import is shown. The returned import is selected, history is refreshed, the file input is cleared, and the account selection remains available for consecutive uploads.

## History, statuses, and detail

History supports account and status filters plus Laravel pagination. Changing a filter returns to page 1. The table includes filename, account, source, Toronto upload time, row counters, textual status, and View. A missing `original_filename` displays `Imported CSV`.

Import statuses are Pending, Processing, Complete, Completed with errors, and Failed. Row statuses are Pending, Imported, Matched, Needs matching review, Duplicate, and Failed. Chips always include text, so color is not the sole indication.

Detail displays only the public Phase 5A.1 contract: line number, transaction date, description, amount string formatted for display, status, and error message. It does not define or access raw/normalized payloads, tenant IDs, fingerprints, account numbers from rows, bank references, occurrences, imported movement IDs, or matching actions.

## Polling and tenant invalidation

Only the selected import is polled, every three seconds, while its status is `pending` or `processing`. A single effect owns one abort controller and at most one timeout. Polling pauses while the document is hidden, stops on a terminal response or unmount, and supports manual retry. When an active import becomes terminal, history refreshes once.

Both Accounts and Imports render tenant-keyed state boundaries. A profile switch immediately replaces account data, resets history filters/page, clears selected detail and upload state, and destroys the old poll timer. The central request-generation invalidation also aborts in-flight requests and rejects late responses. AbortError is deliberately silent.

## Error handling

The central client continues to own 401 session expiration. A 401 during session recovery leaves no authenticated user and redirects to login after the BFF clears the invalid cookie. A 503 does not clear the HttpOnly cookie or redirect: `SessionGate` remains on the protected navigation, displays `Money Guru API is currently unavailable.`, and retries `auth/my-account` on demand. Other recovery failures use the same recoverable state with a safe message, avoiding the cookie-driven login/dashboard redirect loop. API errors provide friendly 400, 403, 404, 422, and fallback messages; the BFF converts backend connectivity failures to 503 without exposing HTML or stack traces. Views expose retry controls for account lists, import history, and detail.

## Tests and validation

Focused Vitest coverage includes tenant headers and stale-request rejection from Phase 4 plus cookie-backed session recovery returning 503, Retry, continued 401 login redirect, account loading/empty/error behavior, create/edit, decimal and currency validation/normalization/fallback, 422 fields, masking, tenant form isolation, FormData without manual content type, keyboard file activation, extension/size validation, account-loading failure versus no-account behavior, new/duplicate metadata and messages, paginated filters, filename fallback, safe detail fields, statuses, polling start/stop, terminal history refresh, tenant timer teardown, silent AbortError, and BFF multipart boundary/tenant/no-store preservation.

Validation commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
npm audit --omit=dev
```

## Limitations and Phase 5B handoff

There is no account deletion, transaction editing, categorization, rule management, reconciliation workflow, matching action, graph, multi-file upload, upload percentage, OFX/QFX reader, WebSocket, or client-side financial aggregation. Phase 5B can build the transaction list/review workflow on the same tenant-keyed request pattern and decimal-string types. Matching confirmation/rejection remains reserved for Phase 5C.
