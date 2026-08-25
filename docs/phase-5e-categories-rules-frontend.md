# Phase 5E.2: Categories and automatic rules frontend

## Outcome and routes

`/dashboard/categories` and `/dashboard/rules` are tenant-aware management screens for Personal and Clinic. Categories organize cash activity for management reporting. Automatic rules apply focused, literal description matching without turning the product into a general ledger or accounting configuration system. Each route remains a thin App Router page that mounts its client-side feature view.

## API contracts consumed

Categories consume `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories/{id}`, and `DELETE /api/categories/{id}`. Rules consume paginated `GET /api/rules`, `POST /api/rules`, `PATCH /api/rules/{id}`, and `DELETE /api/rules/{id}`. The Rules selectors also reuse `GET /api/accounts` and `GET /api/categories`.

All calls use the central same-origin client and selected `X-Tenant-Slug`; browser components never call Laravel directly. Read requests forward `AbortSignal`, public write payloads remain flat, Laravel validation details are preserved, and delete services accept 204 without parsing JSON.

## Canonical categories and hierarchy

`features/categories/` owns the shared DTO, service, hook, canonical `income`, `expense`, and `transfer` values, and their English labels. Transactions safely re-export the same model and helpers to retain existing behavior.

The browser builds one hierarchy from the flat category index, regardless of type. Roots and children sort case-insensitively by name with ID as the deterministic tie-breaker. Full selector labels use ` › `. Missing parents and malformed cycles terminate safely and keep items visible. Pure helpers calculate descendants and valid parent choices. Edit choices exclude the category and its descendants and reject a move that would place any part of its subtree below level three; top level remains available.

## Category workflows

The responsive category tree exposes textual type chips and accessible Edit/Delete actions. One dialog handles create and edit, trims and validates Name, explains that Type is local rather than inherited, displays only safe hierarchy paths, and sends only `name`, `type`, and nullable `parent_id`. Dirty dismissal requires confirmation, focus enters Name, and a synchronous lock prevents duplicate mutation clicks.

Deletion requires confirmation and explains that only unused categories can be removed and deletion never cascades. Active children, transactions, splits, or active rules can block deletion through the backend `category` validation key. That blocker remains visible in the confirmation. Unused trees can be removed bottom-up. There is no restore, force delete, bulk move, reassignment, or cascading delete.

## Automatic-rule semantics and workflows

Rule filters cover literal Search, Account, and hierarchy-labelled Category with fixed `per_page=25`. Apply and Clear return to page one. The list retains useful rows during refresh, distinguishes a true empty list from filtered no-results, provides backend pagination, and moves to the preceding page after deleting its final row. Desktop uses a table and mobile uses cards; neither displays account numbers.

The shared create/edit dialog trims and validates the 120-character Match text, defaults scope to All accounts, requires a category, and sends only `match_text`, nullable `account_id`, and `category_id`. `%` and `_` are explained as literal characters rather than wildcards. A global rule covers all accounts in the selected tenant; an account-specific rule covers only that account.

Rules match descriptions using case-insensitive literal contains behavior. Only uncategorized transactions without splits are safely changed. When multiple rules match, ascending creation ID determines precedence, so the oldest matching rule wins; alphabetical list order is not presented as priority. Create and update report that safe reprocessing was queued in the background and do not poll or claim completion. Deleting a rule stops future categorization but does not undo historical category assignments; editing also has no historical undo.

## Tenant invalidation, accessibility, and responsive behavior

Both interactive boundaries are keyed by selected tenant slug. Switching Personal/Clinic discards lists, filters, pagination, dialogs, drafts, validation, notices, and errors. Reads abort on cleanup, and the central request-generation guard rejects late tenant results.

Pages use semantic headings and list/table structures, labelled controls, associated helper and error text, visible loading/refresh feedback, textual types and scopes, keyboard-operable actions, destructive confirmations, dialog focus management, and mobile layouts without horizontal page navigation.

## Tests and deferred limitations

Focused Vitest and Testing Library tests cover tenant-aware service paths, methods, signals, payloads and 204 responses; query generation; hierarchy paths and deterministic ordering; cycle safety; descendants and three-level parent rules; and no-tenant, loading, retryable-error, true-empty, filtered-empty, responsive list, filter, selector, pagination, and scope states. Form coverage verifies hierarchy-labelled options, flat numeric IDs, global and account-specific rules, client and Laravel field errors, literal matching help, dirty-close confirmation, synchronous mutation locks, and pending create/update isolation across tenant replacement. Deletion coverage verifies category blockers and bottom-up removal, successful close/refresh/notices, rule historical-no-undo messaging, retained failures, current-page refresh, and last-page fallback.

Deferred features include rule priority editing, drag-and-drop, preview/dry-run, run-now, execution history, queue status/polling, historical undo, category restore/force-delete, bulk movement, reporting, formal accounting mappings, budgets, tax calculations, loans, and asset schedules.
