# Phase 5D.2: Bank reconciliation frontend

## Purpose and workflow

The tenant-aware screen at `/dashboard/reconciliation` replaces the placeholder with a compact bank-balance confirmation workflow. A user selects an account and civil statement date, reviews MG5's read-only calculated posted balance, enters the exact balance observed at the bank, saves the comparison, and reviews the returned validity, latest reconciled-through date, and paginated history. This is management-finance balance confirmation, not transaction clearing or accounting-period close.

The route remains thin and mounts `ReconciliationView`. Public DTOs, services, the tenant-keyed workflow, and responsive history presentation live in `features/reconciliation/`.

## API contracts consumed

- `GET /api/accounts/{accountId}/reconciliations/preview?statement_date=YYYY-MM-DD`
- `GET /api/accounts/{accountId}/reconciliations?page={page}&per_page=15`
- `GET /api/accounts/{accountId}/reconciliations/latest`
- `POST /api/accounts/{accountId}/reconciliations`
- the existing `GET /api/accounts` through `useAccounts`

All calls use the central same-origin API client, selected `X-Tenant-Slug`, and existing BFF/authentication behavior. Preview, history, and latest reads forward `AbortSignal`. Store accepts both backend creation (`201`) and correction (`200`) responses through the normal successful-response path.

## Account, date, and preview behavior

The first account returned by the ordered account API is selected automatically unless the current selection remains valid. If an account refresh removes the current selection, the first replacement account is selected through the same complete reset path as a manual account change, so preview, latest-valid, history, result, draft, errors, pagination, and request identities cannot cross account boundaries. Account identity is shown with type and currency; the opening checkpoint date is supporting context and account numbers are omitted. Account loading, failure with Retry, and a true empty state with an Accounts link are distinct.

The statement date defaults through `todayInBusinessTimezone()` for America/Toronto and remains a strict `YYYY-MM-DD` civil string. A complete valid account/date automatically starts preview. Changing the account resets the date to today's Toronto date and clears all prior date-specific draft/result/read state. Changing account or date aborts or invalidates the old preview and removes stale amounts immediately. Preview explains that the calculation includes the opening checkpoint and posted transactions through the selected date; it is never represented as saved history.

## Exact decimals and result semantics

Preview, form state, validation, payloads, results, latest, and history retain monetary values as strings. The bank-balance input accepts an optional minus sign, one through 15 integer digits, and zero through four fractional digits; commas, currency symbols, incomplete decimals, and longer values are rejected. No value is converted to a JavaScript number for submission, equality, subtraction, or validity. Existing currency formatting performs presentation-only conversion.

The result uses the returned reconciliation resource exclusively. Backend `difference` means entered bank balance minus MG5 balance. Its exact string determines only textual sign meaning: positive is higher, negative is lower, and an all-zero decimal agrees. The browser never recalculates the authoritative difference. Valid results state the reconciled-through date and timestamp; invalid results remain “Needs attention,” explain likely investigation areas, link to Transactions with the account, posted status, and backend-provided review dates already applied, and never create or suggest a balancing adjustment.

## Statement transaction review

Preview returns a read-only `review_period`. Its start is the day after the latest prior valid reconciliation, falling back to the day after the opening checkpoint; its end is the selected statement date. The invalid-result action carries that period, the account, and `posted` status into `/dashboard/transactions`. Account and dates are locked while this mode is active so ordinary filters cannot silently broaden the reconciliation scope.

The transaction list adds an explicit checkbox to each active desktop row and mobile card, shows checked progress across pagination, and highlights checked rows. Transactions ignored as duplicates remain visible but their statement checkbox is disabled because they do not participate in the calculated MG5 balance. Progress is stored only in `sessionStorage`, keyed by tenant, account, and review dates. It survives page changes and a return to the same review in the browser tab, but it is not financial state, is not shared across browsers, and can be cleared without changing a transaction or reconciliation. The review notice links back to reconciliation and provides an explicit exit to the ordinary transaction list.

## Correction, latest-valid, and history

Submitting an existing account/date corrects that backend row. “Review this date” copies the history row's statement date and entered bank balance into the form, synchronously invalidates the previous preview, requests a fresh preview, focuses the form, and never submits automatically. A non-empty differing draft requires confirmation before replacement. Review actions are disabled for the duration of a store request and the handler also rejects synchronous late clicks; the returned resource is displayed only while the current account, statement date, and entered draft still match the submitted selection.

Latest-valid loads independently and is never inferred from history. Null displays “Not reconciled yet”; errors and retry remain isolated from history. History keeps backend order, uses fixed `per_page=15`, displays total count and accessible pagination, and presents a desktop table plus mobile cards. Rows show exact bank/MG5/difference amounts, textual Valid or Needs attention status, valid timestamps, and review actions. A newer invalid row remains visible even when latest-valid is older.

Successful store retains its authoritative result, returns history to page one, and revalidates preview, latest, and history. Refresh errors are displayed independently without removing the saved result or other useful retained data.

## Tenant invalidation, accessibility, and responsive behavior

The interactive boundary is keyed by selected tenant slug. Switching Personal/Clinic remounts it, discarding the account, date draft, bank balance, result, pagination, read data, errors, notices, and pending review state. Cleanup aborts reads, while the central request-generation guard rejects late reads and mutations from the old tenant.

The page uses semantic section headings; labelled account/date/balance controls; associated field errors; visible and announced loading/refresh feedback; textual validity and difference meaning; keyboard-operable review actions; result focus after save; and form focus after history review. History avoids horizontal navigation on mobile.

## Tests

Focused Vitest and Testing Library coverage verifies service paths and flat queries, tenant headers, read abort forwarding, `200`/`201`, exact string payloads, strict date/decimal helpers, first-account and Toronto-date defaults, account loading/error/empty states, independent reads, synchronous stale-preview removal, retry, currency display, ordered responsive history/status/timestamps/pagination, mutation-locked review actions, guarded exact-string submission and result association, contextual transaction links, URL filter sanitization, temporary checklist restoration and clearing, automatic account-fallback reset, result and refresh behavior, Laravel field errors, dirty correction review, and tenant replacement protection. The full lint, typecheck, test, build, and diff checks are run for the phase handoff.

## Limitations and next phase

There are no persistent per-transaction cleared flags, statement-line matching, accounting periods, force reconciliation, automatic adjustments, deletion, approvals, audit actors/reasons, undo, attachments, bank feeds, polling, or notifications. The statement checklist is deliberately session-local and does not change financial records.
