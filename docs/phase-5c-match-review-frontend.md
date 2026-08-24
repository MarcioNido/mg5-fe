# Phase 5C.2: Matching review frontend

## Scope and workflow

Phase 5C.2 adds the tenant-aware matching review screen at `/dashboard/matching`. It is limited to ambiguous imported bank movements. Each review lets the user compare the temporary imported transaction with all actionable existing manual pending candidates, then explicitly confirm one candidate or reject candidates individually. It is not a transaction editor or reconciliation workflow.

The route page only mounts `MatchingView`. The feature implementation, public DTOs, service functions, comparison cards, and confirmation dialog live in `features/matching/`. The central route map and dashboard navigation expose the page as **Matching**.

## API contract consumed

The frontend consumes the approved Phase 5C.1 contract without adding private fields or changing matching rules:

- `GET /api/match-suggestions?page={page}&per_page=10[&account_id={id}]`
- `POST /api/match-suggestions/{suggestionId}/confirm`
- `POST /api/match-suggestions/{suggestionId}/reject`

All calls use the same-origin API client and selected `X-Tenant-Slug`. List reads accept and forward `AbortSignal`. The list is modelled as paginated review cases, and the backend's review and candidate ordering is retained. Amounts and confidence remain decimal strings in public state and DTOs.

## Grouped review presentation

One responsive card represents one imported bank movement. Its header includes the account, civil date, account-currency amount, bank source, original filename (or `Imported CSV`), and CSV line number. The imported transaction is labelled separately from every existing manual pending candidate.

Both sides show date, amount, description, notes, category hierarchy or Uncategorized, split category/amount/description details, status, and origin. Candidate fields that differ from the imported side have a textual `Different` marker and a visible border; meaning never depends on colour alone. Confidence is formatted as supporting information only and never recalculated, used as a threshold, reordered, or automatically selected.

## Confirm and reject semantics

The first action click only opens a keyboard-operable MUI dialog. The confirm explanation states that the chosen manual transaction becomes definitive, posted, and import-linked; its manual enrichment is preserved; the temporary imported transaction is removed; and other manual candidates remain independent pending items. The reject explanation states that only the selected candidate is rejected and that rejecting the last candidate keeps the imported transaction as definitive.

Mutations are not optimistic. Once the confirmed request starts, the modal closes; all matching action triggers are temporarily disabled so a second flow cannot replace the pending one, while every review card remains readable. The affected card reports textual progress. A failed request reopens only its original dialog with the public backend message and a retry action. Successful confirmation removes the review. A partial rejection removes only that candidate. A final rejection removes the review and explains that the imported transaction was kept. Every successful action revalidates the current list. Resolving the last card on a later page moves back one page.

Non-stale mutation failures remain in the open dialog with their public Laravel message and can be retried. A mutation `422` closes the dialog, announces “This review changed and has been reloaded.”, and reloads while preserving the selected tenant and applied account filter. Pagination is corrected if the reloaded page no longer exists.

## Tenant invalidation and filters

The interactive view is keyed by selected tenant slug. Switching Personal/Clinic remounts the entire feature boundary, aborts the previous list read, and discards old review data, draft/applied account filters, page, selected action, pending mutation state, and feedback. The central request-generation guard also rejects late responses from the previous tenant.

The optional account filter reuses `useAccounts`, with explicit Apply and Clear actions that return to page 1. An account-list failure has its own Retry action and disables only the filter; matching reviews still load. Initial loading starts on the first render, and retrying an empty failed query restores the loading state immediately, so neither path flashes an empty result. Successful same-query mutation revalidation retains any current cards and announces `Refreshing matching reviews…` through a polite status region. Initial loading, retryable list failure, unfiltered empty, filtered empty, total count, and accessible pagination are distinct states.

## Exact finance and civil dates

Financial DTO values remain strings and no client-side financial calculation is performed. Existing `formatDecimalCurrency` handles presentation using the account currency, with CAD fallback. Civil `YYYY-MM-DD` dates use `formatDateOnly`, which validates and renders through UTC so the displayed calendar day does not change with browser timezone. The application remains `en-CA` with America/Toronto as its business timezone.

## Accessibility and responsive behavior

Cards and stacked detail rows avoid wide horizontal tables on mobile. The page has semantic headings and articles, explicitly named candidate actions, textual status/origin/confidence, accessible pagination and loading indicators, confirmation consequences, visible mutation errors, and polite live result feedback. MUI dialogs provide focus trapping, Escape/cancel behavior when safe, and focus restoration to the triggering control.

## Tests

Focused Vitest and Testing Library coverage verifies flat query construction, empty filter omission, tenant headers, abort signal use, POST endpoints, both reject resolutions, decimal-string preservation, central navigation, grouped and ordered candidates, imported/candidate/category/split/positive/negative presentation, confidence, pagination, deterministic initial/retry/background loading states, error/empty/filter states, account failure isolation, globally locked mutation flows, guarded dialogs, confirm/partial reject/final reject behavior, stale `422`, visible mutation errors, and tenant remount/late-response protection.

## Limitations and next phase

There is no editing, candidate creation, approximate matching, matching algorithm, automatic selection, undo, bulk action, reconciliation, category/rule administration, aggregate, notification, or WebSocket behavior. Bank reconciliation remains the next phase and should stay separate from this decision-focused screen.
