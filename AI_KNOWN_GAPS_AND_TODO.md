# Known Gaps & TODO — For AI-Assisted Development

> **Re-audited 2026-06-26 — this file was found significantly stale.** The
> codebase had moved substantially via external edits since this was first
> written (FX gain/loss, fixed assets UI, aging report UI, inventory
> valuation UI, approval rules UI, zakat UI, and batch/serial tracking are
> now ALL implemented — see strikethrough items below). **Lesson:** always
> re-verify a claim in this file against the actual code before acting on
> it — `git log`/direct reads, not this document, are the source of truth.

This file is a working backlog for AI coding assistants (Claude, etc.) picking up this
codebase. It captures real findings from a structural audit of this auto-parts ERP
(Laravel 11 DDD backend + React/TS frontend), separated into three categories so the
next agent doesn't have to re-derive them from scratch. Update this file as items are
closed or new gaps are found — do not let it go stale.

Conventions: every claim below has file:line evidence as of the audit date. Before
acting on any item, **re-verify the file/line still matches** — code moves.

## How to use this file
- Pick one item. Re-verify its evidence is still accurate (grep the symbol/path).
- Follow the Audit → Design → Implement → Test → Re-audit workflow for anything that
  touches Sales/Inventory/Accounting — those domains have zero tolerance for silently
  changing inventory or journal-entry behavior as a side effect of an unrelated fix.
- After closing an item, delete it from this file (or move to "Closed" with date) —
  don't let resolved items rot here.

---

## 0. Closed since the original audit (verified 2026-06-26 — do not re-implement)

- ~~Automated FX gain/loss posting~~ — **DONE**. `FXGainLossService.php` implements
  both realized (on payment settlement, called from `CollectPaymentUseCase.php`) and
  unrealized (month-end revaluation with auto-reversal) gain/loss posting.
- ~~Batch/lot/serial/expiry tracking~~ — **DONE**. `stock_lots` table now has
  `serial_number`, `lot_number`, `expiry_date`, `production_date`.
- ~~Bank reconciliation frontend~~ — **DONE**. `frontend/src/app/.../banking/page.tsx`.
- ~~Fixed assets & depreciation frontend~~ — **DONE**. `fixed-assets/page.tsx`, full
  CRUD + depreciation schedule UI.
- ~~Approval rules configuration frontend~~ — **DONE**. `approvals/page.tsx`.
- ~~AR/AP aging detail report frontend~~ — **DONE**. `reports/advanced/page.tsx`.
- ~~Inventory valuation report frontend~~ — **DONE**. `InventoryValuationTab.tsx`.
- ~~Zakat report & payment frontend~~ — **DONE**. `reports/zakat/page.tsx`, full
  calculator with method selection.
- ~~Customer tier/segment pricing applied automatically~~ — **DONE (2026-06-26)**.
  Implemented as a suggestion, not a forced backend override (preserves backward
  compatibility — existing invoice creation still lets the caller send
  `unit_price` explicitly). New `ProductController::resolvePrice` endpoint
  (`GET /inventory/products/{id}/resolve-price?customer_id=`) maps VIP ->
  wholesale_price, Gold -> semi_wholesale_price, else -> sell_price. Wired into
  POS (`ProPosScreen.tsx` auto-switches the price-level toggle when a tiered
  customer is selected) and the manual invoice form (`InvoiceFormContext.tsx`'s
  `addItem` resolves the tier base price before applying channel markup). Test:
  `backend/tests/Feature/Inventory/ProductResolvePriceTest.php`.
- ~~Self-reported `paid_amount`~~ / ~~dual permission systems (Spatie half)~~ —
  see `AI_SECURITY_AUDIT_NOTES.md` Closed section, both fixed 2026-06-26.
- ~~Salesperson commission payout~~ — **backend DONE (2026-06-26), frontend still
  needed.** `ConfirmInvoiceUseCase` now accrues commission (profit ×
  `users.commission_rate`) on confirmation, posting a balanced
  debit-commission-expense / credit-commission-payable journal entry. New
  `PayCommissionUseCase` + `CommissionController`
  (`GET /sales/commissions/unpaid`, `POST /sales/commissions/payout`) settle it:
  mark invoices paid, optionally withdraw from a safe, post the mirroring
  debit-payable / credit-cash entry. New table `commission_payouts`; new columns
  `invoices.commission_paid_at`/`commission_payout_id`. Test:
  `backend/tests/Feature/Sales/CommissionPayoutTest.php`. **Still open:** no
  frontend page yet — `salesApi.getUnpaidCommissions()`/`payCommission()` exist
  in `frontend/src/lib/api.ts` ready to wire into a payout screen (likely under
  HR/Payroll or a Sales "Commissions" tab).

## 1. Missing entirely (re-verified still missing)

- **OEM/part-number cross-reference ("find equivalent part").** Still missing — only
  exact/substring search matches `oem_number`/`part_number`, no "what else fits this
  code" resolver.
- **VIN decoding.** Still missing — `customer_vehicles.vin` is stored but never
  parsed/decoded to derive make/model/year/fitment.
- **Scrap/damaged/obsolete stock write-off.** Still missing as a dedicated flow with
  its own accounting treatment (separate from a customer return).

## 2. Backend-complete, no frontend UI (re-verified 2026-06-26)

- ~~Payroll items config~~ / ~~Late-attendance penalty rules~~ — **both DONE,
  this audit was wrong.** `AddPayrollItemModal.tsx` and
  `frontend/src/components/hr/PenaltiesContent.tsx` (271 lines, fully wired to
  the `penalty-rules` query) already exist.
- ~~Forecasting / auto-draft PO frontend~~ — **DONE.**
  `frontend/src/components/analytics/AIForecastingTab.tsx` calls both
  `/forecasting/inventory-forecast` and `/forecasting/auto-draft-po`.
- ~~Assembly/kit (BOM) full management~~ — **DONE.**
  `ProductComponentsTab.tsx` is a complete editor (add/remove/update quantities,
  product search, save via `inventoryApi.saveAssemblies()`), not just a
  read-only sub-tab as previously assumed.
- ~~Commission payout frontend~~ — **DONE (2026-06-27).**
  `frontend/src/components/sales/CommissionsScreen.tsx` (route
  `/dashboard/sales/commissions`, linked in the sidebar under Sales) lists
  unpaid commission grouped by salesperson with a per-group "Pay Commission"
  button and an optional safe selector.

## 3. Partially implemented / fixed (re-verified 2026-06-26)

- ~~Bulk product import job status~~ — **FIXED.** Two real bugs found and
  fixed: (1) `QUEUE_CONNECTION=sync` meant the "queued" job actually ran
  inline, blocking the HTTP request for the whole import — now dispatched on
  a dedicated `database` connection/`imports` queue via
  `->onConnection('database')->onQueue('imports')`, with a `queue-worker`
  service added to both `docker-compose.yml` and `docker-compose.prod.yml`
  (a worker MUST be running for imports to ever complete — see the comments
  there). (2) `virusScanHook()` hand-built `storage_path('app/'.$path)`, but
  Laravel 11's default `local` disk root is `storage_path('app/private')` —
  every real import attempt threw "File not found for virus scanning"
  unconditionally, regardless of the queue issue. Fixed to resolve the path
  via `Storage::disk('local')->path($path)`. Tests:
  `backend/tests/Feature/Inventory/ProductImportQueueConnectionTest.php`,
  `ProductImportVirusScanPathTest.php`.
- ~~Supplier core/exchange return accounting~~ — **confirmed DONE, not a gap.**
  `CreditCoreReturnUseCase.php` posts a full debit-AP/credit-core-inventory
  journal entry and updates the supplier balance; `ShipCoreReturnUseCase.php`
  handles the stock movement side. The original audit's "unverified" caveat
  is resolved — it's correct.
- ~~POS shift cash-drawer reconciliation~~ — **FIXED (2026-06-27), plus a
  deeper schema bug found along the way.** The `pos_shifts` migration was
  sitting in the *central* `database/migrations/` (not `tenant/`) despite
  being 100% per-tenant data, with `tenant_id`/`user_id` as `bigint`
  (`foreignId()`) instead of this app's UUID convention, and the `PosShift`
  model extended plain `Model` (no `TenantScope`, no tenant connection) — no
  real data existed yet, so the schema was corrected outright rather than
  patched around. `close()` now computes `cash_sales`/`card_sales` (from
  confirmed invoices since `opened_at`, by payment method) minus cash refunds,
  derives `expected_cash` and `cash_variance`, and the POS close-shift flow
  shows a reconciliation summary before letting the cashier open the next
  shift. Test: `backend/tests/Feature/Sales/PosShiftReconciliationTest.php`.
- **Warranty claim → replacement document** — still a real gap.
  `WarrantyController::updateClaim()` accepts a `replacement_invoice_id` field
  but only stores the reference — it assumes a replacement invoice already
  exists and was created manually elsewhere; nothing auto-generates one when
  a claim is approved.
- ~~Stock transfer approval integration~~ — **FIXED (2026-06-27).** Added
  `ApprovalWorkflowService::evaluateStockTransfer()` (entity_type
  `stock_transfer`, trigger_type `high_value_transfer`, comparing total item
  cost against a configurable threshold) and `findLatestRequest()`.
  `StockTransferService::approveTransfer()` now evaluates this *before* the
  stock-deduction transaction (a real bug was found and fixed here too: doing
  the check/`requestApproval()` call *inside* the transaction meant a
  blocking throw rolled back the very approval-request row meant to unblock
  it). The controller's hardcoded role check stays as a baseline gate;
  rule-triggered transfers additionally need an approved request in the
  Approvals inbox. Test:
  `backend/tests/Feature/Inventory/StockTransferApprovalTest.php`.
  **Found but explicitly NOT fixed (separate, larger issue, flag before
  touching):** `StockTransferModel`/`StockTransferItemModel` extend plain
  `Model`, not `BaseModel` — no `TenantScope`, relying entirely on manual
  `where('tenant_id', ...)` in the controller for isolation, the same
  architecture smell `PosShift` had before its fix above. No data-loss risk
  observed (every query already filters manually), but it's fragile — any
  future query that forgets the manual filter would leak cross-tenant data.

## Known pre-existing test fragility (found 2026-06-27, not caused by any fix
## in this file, do not chase as part of an unrelated task)

- `tests/Feature/Purchases/PurchaseWorkflowTest::test_confirmed_purchase_adds_stock`
  and `PurchasesTest::test_can_update_purchase_status` fail with "No treasury
  safe is configured for cash purchases" **even when run completely alone**
  on a fresh migrated DB — confirmed via direct `git stash` of unrelated
  changes to rule out a regression. The test never creates a `SafeModel`
  fixture itself; it appears to silently depend on a safe seeded by whichever
  test happens to run before it in the full suite, which is why it passes in
  some full-suite runs and fails in others depending on ordering. Needs its
  own `SafeModel::create(['type' => 'cash', ...])` in the test setup — out of
  scope for whatever you're working on unless you're specifically fixing
  Purchases tests.

---

## Process note for whoever closes one of these

Do not implement blindly. For anything touching Sales/Inventory/Accounting:
1. **Audit** the current code path end-to-end first (cite file:line for every claim).
2. **Design** with backward compatibility as a hard constraint — existing invoices,
   stock movements, and journal entries must remain byte-for-byte reproducible.
3. **Implement** the smallest correct change.
4. **Test** — include at least one test that proves the new feature has *zero* side
   effect on inventory quantities or journal-entry balance (debit == credit), the
   same pattern used in `backend/tests/Feature/Sales/InvoicePrintedNameTest.php` and
   `CreditLimitEnforcementTest.php`.
5. **Re-audit** — re-run the full feature suite, not just your new tests.
