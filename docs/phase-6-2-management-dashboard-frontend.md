# Phase 6.2: Management dashboard frontend

## Outcome and route

`/dashboard` now provides the first tenant-aware management dashboard for Personal and Clinic profiles. The App Router page remains a thin server component that mounts the client-side feature in `features/dashboard/`. The dashboard is read-only and presents only confirmed balance, posted movement, reconciliation, category-group, and workflow facts supplied by the Phase 6.1 API.

## API and request behavior

The feature consumes `GET /api/dashboard/summary?month=YYYY-MM` through the central same-origin `apiRequest` client. Requests carry the selected `X-Tenant-Slug`, forward an `AbortSignal`, preserve central API errors, and never call Laravel directly from the browser. There is no polling, caching layer, or dashboard mutation. Users can explicitly refresh the selected tenant and month; useful same-month data remains visible with an announced refreshing state.

The month query helper produces the stable flat query `month=YYYY-MM`. The interactive boundary validates exact possible civil months and prevents selection after the current month in `America/Toronto`.

## Month and date semantics

The selected month defaults to the current Toronto civil month and is retained as a strict `YYYY-MM` string without UTC conversion. Period activity covers the complete inclusive civil range returned in `period.start_date` and `period.end_date`, including for the current month. It is not labelled month to date.

Account balances use a different date concept: they are current through the returned `as_of_date`. The interface explains that each balance uses its opening checkpoint plus posted transactions through that date. Civil dates use the existing date-only formatter.

## Current balances and reconciliation

Each currency total is rendered independently as “Total {currency} balance.” No tenant-wide cross-currency monetary total is calculated or shown. Accounts display only safe public identity: name, public type label, currency, current confirmed balance, last posted transaction date or “No posted activity,” reconciliation status, and the latest valid statement date when available. Account numbers and tenant identifiers are never rendered.

The four backend statuses map to:

- `never_reconciled`: Not reconciled
- `up_to_date`: Up to date
- `activity_after_reconciliation`: New activity since reconciliation
- `latest_attempt_invalid`: Reconciliation needs attention

Attention states include textual explanations and do not rely on colour alone. The reconciliation attention total is displayed directly from `workflow.accounts_needing_attention_count`; the browser does not recalculate it. When attention exists, the dashboard links to `/dashboard/reconciliation`. Nothing is described as an accounting-period close.

## Per-currency posted activity

The selected-month section states that it contains posted bank movement for the complete selected month and that management cash activity is not accounting profit. The tenant-wide posted transaction count is presented only as a record count.

Every returned currency bucket remains visibly stacked. Each shows signed categorized income, expense movement, transfer movement, uncategorized movement, authoritative confirmed net movement, and its posted record count. CAD, USD, and any other currency remain separate and are neither converted nor combined. A no-activity response displays an explanatory empty state and does not manufacture a CAD bucket.

All financial DTO values remain signed four-place decimal strings. Presentation formatting is guarded and falls back to “Not available.” Exact sign styling inspects the string form only. The browser performs no monetary addition, net calculation, comparison, or floating-point financial decision.

## Management category groups

Each currency bucket renders the active top-level groups returned by the API. Desktop uses a compact table; mobile uses stacked cards. Group name, canonical type label, signed net change, and independent income, expense, and transfer subtotals are all visible even when child allocation types differ from the root type. Names remain user-managed labels and never trigger semantic financial calculations. Buckets without groups show categorization guidance and a supported `/dashboard/categories` link.

## Current workflow

The dashboard displays the backend’s tenant-wide current counts for pending transactions, uncategorized posted transactions, uncategorized pending transactions, and accounts needing reconciliation attention. These counts are explicitly independent of the selected month. Supported route-only actions lead to Transactions, Categories, Accounts, or Reconciliation; no unsupported destination filters are implied.

## Tenant and request isolation

The dashboard boundary is keyed by selected tenant slug. Switching Personal/Clinic remounts the feature and discards the selected month, balances, totals, activity, workflow, reconciliation messages, errors, refresh state, and retained responses. The replacement profile starts at the current Toronto month.

Reads abort during effect cleanup. Both the local aborted-signal guard and the central tenant request generation prevent a late old-tenant response from rendering. Response data is also tagged with its requested month. A month change immediately hides the prior month’s amounts while retaining only the tenant-wide workflow counts; late old-month responses are ignored.

## Accessibility and responsive behavior

The route has one descriptive page heading, semantic section headings, a labelled native month input, a labelled Refresh action, live loading and refreshing status, textual reconciliation meanings, visible currency codes, and clear destination links. Desktop tables are replaced by mobile cards below the established breakpoint so the page does not require horizontal navigation. Empty, tenant-loading, no-tenant, initial-loading, retryable-error, refreshing, no-account, and no-period-activity states remain distinct.

## Tests

Focused Vitest and Testing Library coverage verifies the exact endpoint/query, tenant header, read signal, strict month helpers, Toronto month boundary, display formatting, reconciliation labels, exact sign detection, authenticated/profile headings, loading/error/empty states, supported links, current balance wording, all reconciliation states, authoritative attention count, one/no/multiple currency behavior, signed activity and group subtotals, same-month refresh retention, workflow retention across month changes, and stale old-month/old-tenant response protection.

## Deliberate limitations

The dashboard has no charts, trends, comparisons, exchange-rate conversion, combined cross-currency amounts, profit or net-income claims, taxable-income or tax-liability estimates, tax reserves, formal free cash flow, available-to-invest figures, semantic category-name mappings, loan principal/interest schedules, budgets, forecasts, exports, caching, polling, or mutations. Those concepts require future stable backend contracts before they can be presented reliably.
