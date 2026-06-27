# Security & Correctness Audit Notes — For AI-Assisted Development

Findings from hands-on review of the Sales/Invoicing module (credit-limit
enforcement work). These are real, reproduced issues — not speculation. Each entry
has file:line evidence and current status. Treat "Open" items as the priority
backlog for closing security/correctness gaps in this codebase.

---

## Closed in this session (for reference — verify still true before re-touching)

- **TOCTOU race on customer credit limit.** The credit-limit check used to read
  `CustomerModel` via an unlocked `find()` before a later `lockForUpdate()` balance
  mutation, in `backend/app/Application/Sales/UseCases/ConfirmInvoiceUseCase.php`.
  Two concurrent invoice confirmations for the same customer could each pass the
  check against a stale balance, then both commit their debit — exceeding the limit
  despite each individual check "passing." **Fix:** the check now runs against the
  already row-locked model, in the same lock scope, immediately before the mutation.
- **Atomicity gap — orphaned draft invoices.** `CreateInvoiceUseCase` and
  `ConfirmInvoiceUseCase` each opened their own DB transaction. If confirmation
  failed (credit limit, insufficient stock, anything), the draft from the first
  transaction had already committed, leaving a phantom invoice row behind despite
  the API returning an error. **Fix:** `InvoiceController::store()` now wraps both
  calls in one outer transaction (`backend/app/Presentation/Controllers/API/Sales/InvoiceController.php`).
- **`$appends`-driven N+1 risk.** Adding a computed boolean to `UserModel::$appends`
  would have forced a `role` lazy-load on *every* serialization of *any* user,
  anywhere in the app (user lists, invoice `created_by`, activity logs). Removed;
  the field is now merged explicitly only into `AuthController::login/register/me`.
- **Two untracked migrations silently broke the entire test suite**: one added a
  `products` column to the *central* DB instead of the *tenant* DB
  (`database/migrations/` vs `database/migrations/tenant/` — `products` only exists
  per-tenant); another duplicated columns already added by an earlier migration on
  `data_imports`. Both are now fixed in place. **Lesson for future agents:** if
  `php artisan migrate:fresh` fails with "no such table" or "duplicate column" in
  tests that were previously green, suspect a misplaced/duplicate migration before
  assuming your own change broke something.

## Closed (fixed 2026-06-26)

- ~~Self-reported `paid_amount` is trusted with no payment-receipt verification~~
  — **FIXED**, using exactly the permission-gate approach this note originally
  suggested. New `App\Application\Sales\Services\DownPaymentAuthorizer` (called
  from both `CreateInvoiceUseCase` and `UpdateInvoiceUseCase`) throws unless the
  user has the `collect_payments` permission whenever a credit invoice's
  `paid_amount > 0`. Reused the existing `collect_payments` permission (already
  seeded under the 'crm' group for the proper `CollectPaymentUseCase` flow)
  rather than inventing a new one. Frontend (`PaymentSection.tsx`) disables the
  down-payment input with an explanatory message when the logged-in user lacks
  it, mirroring the `overrideCreditLimit` UX pattern. **Not addressed and still
  true:** this doesn't *verify* cash was physically received (no POS hardware
  integration exists) — it only restricts who's trusted to claim it, which is the
  realistic, proportionate fix given the architecture. Test:
  `backend/tests/Feature/Sales/DownPaymentAuthorizationTest.php`.

## Open — not fixed, flagged for follow-up
- **`UpdateInvoiceUseCase`'s confirm branch is dead code.** When `update()` is
  called with `status: 'confirmed'`, the code constructs the `Invoice` entity with
  `status: $dto->status` already `'confirmed'`, then immediately calls
  `$updatedInvoice->confirm()` — which throws because the entity's own state machine
  expects the *current* status to be `'draft'` before transitioning to confirmed.
  This means the second `if ($dto->status === 'confirmed')` block further down
  (stock deduction, customer balance update including the credit-limit check added
  in this session, journal entries) is **unreachable in production** — see
  `backend/app/Application/Sales/UseCases/UpdateInvoiceUseCase.php` lines ~116-135
  vs ~190-300. The credit-limit check added there is correctly wired but inert until
  this pre-existing entity bug is fixed. Confirming an invoice through `PUT
  /sales/invoices/{id}` with `status=confirmed` should be verified against the
  actual API behavior before assuming it works — the working path today is `PUT
  /sales/invoices/{id}/status` (routes to `ConfirmInvoiceUseCase` directly, which
  *is* correct and covered by tests).
- ~~Two parallel permission systems with no single source of truth~~ — **the
  Spatie half is now FIXED (2026-06-26).** Root cause was deeper than "AuthController
  doesn't flatten permissions": `PermissionModel` was never wired into
  `config/permission.php` (it pointed at Spatie's own stock `Permission` model,
  which has no connection override and was silently reading/writing on the
  *default* connection while `RoleModel` is pinned to `'tenant'` — two different
  databases that never joined). Fixed by making `PermissionModel` extend
  `Spatie\Permission\Models\Permission` with `$connection = 'tenant'`, pointing
  config at it, and flattening `role.permissions.pluck('name')` into
  `user.permissions` in `AuthController::login/register/me`. Test:
  `backend/tests/Feature/Auth/PermissionsFlatteningTest.php`.
  **Still open:** the ad-hoc `roles.meta_attributes` JSON column
  (`can_edit_discount`, `max_discount_pct`, `can_override_credit_limit`) is a
  *second*, separate mechanism that still exists alongside the now-working Spatie
  one. They haven't been unified — a developer still has to know which system
  gates which feature. Migrating `meta_attributes` flags onto real Spatie
  permissions (or vice versa) remains a good follow-up, just lower priority now
  that the Spatie path actually works end-to-end.
- **Migration hygiene.** Several recent migrations were found untracked in git and
  in the wrong directory or duplicating existing columns (see "Closed" section
  above for the two that were fixed). Recommend adding a CI check that runs
  `migrate:fresh` against a clean DB before merge, since these errors are silent
  until someone runs a full fresh migration (which most local dev loops skip).

## Verification pattern to reuse

For any fix touching invoice confirmation/balance/stock:
```
php -c /tmp/php_test.ini vendor/bin/phpunit --filter="Invoice|CreditLimit|AccountingIntegrity"
```
And confirm the "no orphaned draft" / "balanced journal entry" assertions still
pass — see `backend/tests/Feature/Sales/CreditLimitEnforcementTest.php` and
`backend/tests/Feature/Sales/InvoicePrintedNameTest.php` for the pattern.
