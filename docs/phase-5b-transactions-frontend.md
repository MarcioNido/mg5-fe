# Phase 5B.2: Transactions frontend

## Outcome and scope

The Transactions dashboard is now a tenant-aware working surface for listing, filtering, creating, editing, categorizing, splitting, and conditionally deleting transactions. It consumes the Phase 5B.1 public contract through the existing same-origin BFF and central browser client. Matching review, reconciliation, category administration, automatic rules, aggregates, and bulk operations remain outside this phase.

The interface is English, uses `en-CA`, treats `America/Toronto` as the business timezone, and uses CAD as the presentation fallback. Financial values remain decimal strings in API types, state, validation, and payloads.

## Feature architecture

`features/transactions/` contains explicit transaction/category DTOs, the tenant-aware service, category loading hook, applied/draft filters, responsive transaction list, create/edit dialog, split editor, hierarchical category helpers, exact decimal helpers, and the tenant-keyed view orchestrator. `app/dashboard/transactions/page.tsx` only mounts `TransactionsView`.

Shared date-only presentation and Toronto “today” behavior live in `lib/format/date.ts`. Existing account loading, money presentation, tenant context, request generation, error mapping, and API client are reused unchanged.

## Endpoints and filters

The feature consumes:

- `GET /api/transactions`
- `POST /api/transactions`
- `PATCH /api/transactions/{id}`
- `DELETE /api/transactions/{id}`
- `PATCH /api/transactions/bulk-category`
- `GET /api/categories`

Every call is tenant-aware and supplies the selected slug. Reads accept an `AbortSignal`. The list sends flat `page`, `per_page`, `account_id`, `status`, `origin`, `category_id`, `uncategorized`, `date_from`, `date_to`, and `search` parameters. Empty filters are omitted, search is trimmed, `per_page` is fixed at 25, and backend ordering is preserved.

Filter edits are drafts until Apply filters or Enter in Search. Apply and Clear return to page 1. Category and Uncategorized are mutually exclusive. Review uncategorized immediately enables `uncategorized=true`, clears category, and provides a visible exit. A date-to value before date-from is rejected accessibly before a request; Laravel 422 remains authoritative.

## List and transaction semantics

Desktop uses a compact, accessibly named table. Mobile uses cards rather than horizontal table navigation. Both expose date, description, optional truncated notes, account, category state, textual status and origin, account currency, and an explicit Edit action. Origins are Manual, Imported (`csv`), and System.

Pending means expected activity that does not affect confirmed bank cash. Posted means manually confirmed activity that affects confirmed bank cash. A direct category displays its complete hierarchy; split transactions display their split count; no direct category and no splits displays Uncategorized. Uncategorized is a management follow-up, not a bank error.

An imported transaction ignored as a duplicate remains in the list with an explicit Ignored chip, muted presentation, and struck amount. Its original Posted status and Imported origin remain visible because ignoring is an independent, reversible financial exclusion rather than a rewritten bank status.

The view includes initial loading, retryable failure, unfiltered and filtered empty states, total count, accessible pagination, mutation refresh, and success feedback. Deleting the last item on a later page returns to the previous page. No optimistic update or client financial aggregation is used.

## Bulk categorization

Outside reconciliation review, desktop rows and mobile cards expose selection checkboxes. The table header and mobile page control select every eligible transaction on the current page. Selection is preserved across pagination, limited to 200 items, and cleared when filters, tenant, or transaction data are intentionally changed. Ignored and split transactions are visibly non-selectable because they require individual handling.

After the first selection, a responsive action bar shows the selected count and hierarchical category picker. Applying requires confirmation that existing direct categories will be replaced, sends one atomic tenant-aware request, then clears the selection, refreshes the list, and reports the exact updated count. A failed request retains both selection and category so it can be reviewed and retried. The reconciliation checklist remains a separate session-local interaction and never shows bulk classification controls.

## Creation, editing, and imported fields

The accessible dialog starts new transactions on the current Toronto business date and defaults to Pending. Account, date, signed amount, and description are required; notes are optional. The status helper explains the confirmed-cash effect, and the amount helper explains positive money-in and negative money-out values.

Manual/unlinked transactions allow bank-field and enrichment editing. When `bank_fields_editable=false`, account, date, amount, and status are disabled, an import explanation is shown, and those keys are omitted from PATCH. Description, notes, direct category, and splits remain editable. Laravel general, field, and nested split errors are retained with the draft. Successful save is the only save path that closes the dialog.

Dirty dismissal asks for confirmation. Saving and deletion disable actions. Tenant changes remount the entire form boundary, so drafts and operation messages cannot cross profiles.

## Categories and exact splits

The flat category index is converted into sorted full-path options by following parent IDs through the complete list. The helper tolerates missing references and terminates cycles. An empty selection is Uncategorized.

Single-category mode sends `category_id` as an ID or null and sends `splits: []`, explicitly removing old splits. Split mode sends `category_id: null` and requires available categories, at least two rows, one category per row, valid signed decimal amounts, and an exact sum equal to the transaction amount. Switching modes preserves the inactive draft predictably while the final payload explicitly clears the inactive representation.

Decimal validation accepts signed values with up to four fractional digits. Calculations convert strings to `BigInt` units of 0.0001, then sum and compare only those units. `BigInt` is never serialized and no monetary calculation uses float. The editor announces either the exact remaining amount or that the split matches.

## Deletion

Delete is available only when `deletable=true`. Confirmation identifies the transaction using its description, civil date, and decimal amount. The UI waits for the 204 response, closes, refreshes, and reports success. Import-linked transactions explain why direct deletion is unavailable. A server-side 422 capability race remains visible.

When `can_ignore=true`, the dialog instead offers “Ignore as duplicate.” Confirmation explains that the import record remains visible but stops affecting balances, reports, rules, and reconciliation. An ignored row offers “Restore transaction” without destructive confirmation. Both actions wait for PATCH, close, refresh the list, and report success.

## Tenant invalidation and auxiliary data

The inner view is keyed by tenant slug. Switching Personal/Clinic immediately removes transactions, page/filter state, selection, dialog, drafts, notices, and errors from the old tenant. All reads are aborted on cleanup, while the central request-generation boundary also rejects late responses.

Accounts reuse `useAccounts`; categories use an equivalent abortable hook. Loading failure is distinct from a true empty result and has Retry. Either auxiliary failure leaves transaction listing available. No accounts disables creation and links to Accounts. No categories still permits uncategorized creation but disables split mode.

## Civil dates and accessibility

`transaction_date` remains `YYYY-MM-DD` in forms and payloads. `formatDateOnly` validates the calendar date, constructs a UTC display date to preserve the same civil day in every browser timezone, and falls back to “Not available.” It never calls `toISOString`. Toronto today is derived with `Intl.DateTimeFormat(...).formatToParts()` using the configured business timezone.

Loading indicators, tables, mobile lists, edit controls, pagination, feedback, validation, and empty/error states have accessible names or textual meaning. Status and origin never rely on colour alone. The responsive layout preserves editing without horizontal table navigation.

## Tests

Focused Vitest coverage includes flat/empty query parameters, tenant headers, POST/PATCH/DELETE/204, the BFF bulk-route allowlist and body forwarding, decimal-string payloads, Imported and Ignored presentation, reversible duplicate resolution, individual/page bulk selection and exclusions, atomic bulk application, hierarchical categories, exact positive/negative/four-place split arithmetic, 0.0001 mismatch, date-only fallback and Toronto today, desktop/mobile transaction presentation, category/split/uncategorized labels, pending creation defaults, imported PATCH field omission, dirty dismissal, conditional deletion, loading/error/empty/total states, Review uncategorized, Search Enter, date validation, filter clearing, and tenant remount/late-response protection.

## Limitations and Phase 5C handoff

This phase intentionally has no matching confirm/reject actions, reconciliation workflow, category or rule CRUD, totals, reports, graphs, bulk selection, attachments, or client-side reordering/aggregation. Phase 5C can add matching review and reconciliation navigation on top of the same transaction resource, tenant invalidation boundary, and exact decimal/date helpers without changing this screen into an administrative or reporting surface.
