# AI Project Index — Read This First

This file is the entry point for any AI coding assistant working in this repo. It
tells you which markdown files exist, what each one is for, and which one is
authoritative when two seem to overlap. Keep this index updated whenever a new
top-level `AI_*.md` or report file is added — a stale index is worse than no index.

## Reading order for a new session

1. **This file** — orientation.
2. **`AI_VERIFICATION_PROTOCOL.md`** — the checklist to run after implementing
   *any* task, before reporting it as done. Re-reading changes, tracing the full
   request path, running regressions (not just your new test), checking
   atomicity/race-condition/accounting invariants, and trying to break your own
   feature. This is a gate, not optional — read it now if you're about to start
   implementing something.
3. **`AI_KNOWN_GAPS_AND_TODO.md`** — what's structurally missing or half-built in
   the product, organized by: missing entirely / backend-only-no-frontend /
   partially implemented. Start here before proposing a new feature — it might
   already be half-built.
4. **`AI_SECURITY_AUDIT_NOTES.md`** — concrete, reproduced bugs and security gaps
   (race conditions, trust-boundary issues, dead code paths). Check this before
   touching Sales/Invoicing/Auth — some of what looks like a bug you just found is
   already documented with root cause.
5. **`AI_ACCOUNTING_COMPLETION_TODO.md`** — accounting-specific incomplete work,
   plus the mandatory test pattern (`SUM(debit) == SUM(credit)`) every accounting
   change must satisfy.
6. **`AI_FRONTEND_KNOWN_ISSUES.md`** — frontend-specific gaps (permission-gating
   that doesn't actually gate anything, inconsistent loading/error states).
7. **`AI_MASTER_PLAN_AND_REVIEW.md`** — the current all-in-one execution plan:
   overall review, phased roadmap (`P0`..`P3`), prioritized task backlog, and
   the recommended next tasks to tackle across the whole project.
8. **`AI_PRODUCT_FORM_REVIEW.md`** — focused review of the add/edit product (item)
   screen specifically: a data-integrity bug (profit%/discount fields collected
   but silently dropped), missing fields (multi-image, lead time, MOQ,
   multi-supplier cost), and UX papercuts. Read this before touching
   `InventoryFormModal.tsx` or `ProductController::store/update`.
9. **`AI_SMACC_FEATURE_BENCHMARK.md`** — competitive feature benchmark against
   SMACC (a Gulf-region accounting/ERP/POS suite), filtered to what's relevant for
   auto-parts retail, cross-referenced against the gaps above. Use this when
   prioritizing what to build next, not as a list of confirmed current gaps on its
   own — it's a benchmark, not an audit.

## Older reports (historical — read for context, don't treat as current state)

These predate the `AI_*.md` series and were produced by earlier sessions/audits.
They describe the state of the system *at the time they were written*. Code has
moved since. Don't cite them as evidence of current behavior — re-verify against
the actual files first.

- `CERTIFICATION_REPORT.md`
- `FINAL_CTO_REPORT.md`
- `FINAL_ENTERPRISE_AUDIT.md`
- `POST_REMEDIATION_METRICS.md`
- `QUEUE_RECOVERY.md`
- `erp_product_roadmap.md`

If you find a claim in one of these that contradicts what you observe in the code,
**trust the code**, and consider updating or removing the stale claim.

## House rules for this codebase (carried over from prior sessions)

- This is a multi-tenant ERP: central DB (tenant registry/subscriptions) + one
  Postgres database per tenant. `TenantScope` auto-filters tenant tables — don't
  add manual `tenant_id` filtering in queries on tenant-scoped models.
- DDD layering is enforced: `Domain/*/Entities` + `Domain/*/Repositories`
  (interfaces) → `Application/*/UseCases` + `Application/*/DTOs` →
  `Infrastructure/Eloquent/Models` + `Infrastructure/Eloquent/Repositories` →
  `Presentation/Controllers/API`. Don't put business logic in controllers or
  Eloquent models.
- For any change touching Sales/Inventory/Accounting: **Audit → Design →
  Implement → Test → Re-audit**. Never skip a phase. Backward compatibility
  (existing invoices/stock/journal entries must remain reproducible) is a hard
  constraint, not a nice-to-have.
- Migrations: tenant-scoped tables (products, invoices, customers, etc.) belong in
  `database/migrations/tenant/`, not `database/migrations/`. This has been gotten
  wrong by automated edits before (see `AI_SECURITY_AUDIT_NOTES.md`) and silently
  breaks the entire test suite without breaking anything you'd notice in normal
  dev usage — always run a fresh migration before trusting a migration PR.
- Test verification pattern for PHP: `php -c /tmp/php_test.ini vendor/bin/phpunit
  --filter=<Name>` (the project's php.ini doesn't load `fileinfo` by default,
  which breaks `Storage::fake()`-based tests — use the patched ini).
