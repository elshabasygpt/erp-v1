# Integration Audit — Cross-Module Wiring

**Date:** 2026-06-28
**Scope:** Read-only audit of how modules connect (not per-module correctness). Findings carry evidence as `file:line`. Fix plan + execution status tracked at the bottom.

> Method used: traced each chain from `route → controller → use-case → repository → DB`, confirmed side-effects on neighbouring modules, atomicity (shared `DB::transaction`), reversibility, and `SUM(debit) == SUM(credit)`.

---

## 1. Sales → Inventory → Accounting — **STRONG**

| Check | Status | Evidence |
|---|---|---|
| Atomicity (stock + journal + status in one txn) | ✅ | `ConfirmInvoiceUseCase.php:60-296` |
| Stock deducted on confirm | ✅ | `ConfirmInvoiceUseCase.php:143-151`; `InventoryValuationService.php:140-171` |
| Journal balance enforced before persist | ✅ | `JournalEntry.php:88-126` via `->post()` `ConfirmInvoiceUseCase.php:451` |
| Locked availability check (no TOCTOU) | ✅ | `EloquentProductRepository.php:128-136`; `InventoryValuationService.php:47` |

**⚠️ Latent foot-gun:** two classes named `ConfirmSalesReturnUseCase`. The HTTP-wired one is correct. The duplicate `Sales/UseCases/Returns/ConfirmSalesReturnUseCase.php:67-111` writes the reversing entry with raw inserts + `is_posted => true`, **bypasses the balance check, and omits the COGS/Inventory reversal line**. A return through that path leaves the GL un-reversed.

---

## 2. Customer ↔ Sales — **PROBLEMS**

1. **🔴 BROKEN — installment reminders dead:** `SendInstallmentRemindersCommand.php:24,48` queries a non-existent table `installment_payments` (real table is `invoice_installments`), and filters `status = 'pending'` while the schema default is `unpaid` (`migrations/tenant/2026_05_23_034108_create_ar_tables.php:14-23`). Never matches a row.
2. **🔴 BROKEN — installments never paid down:** `CollectPaymentUseCase` never updates `invoice_installments.paid_amount/status`, never sets `payment_allocations.installment_id`, and there is no sales-side "pay installment" endpoint. Plan permanently diverges from the receivable.
3. **⚠️ Credit-limit TOCTOU + duplication:** check is unlocked (`CreateInvoiceUseCase.php:116-138`); balance increment happens later under lock in `ConfirmInvoiceUseCase`. Logic duplicated in 3 places; clean `Sales/Services/CreditLimitChecker.php` is dead code.
4. **⚠️ Customer balance multi-source:** payment decrements `customer.balance` by the full amount regardless of allocations, **without `lockForUpdate`** (`CollectPaymentUseCase.php:111`).
5. **⚠️ Aliases not resolved server-side:** `printed_name` is unvalidated free text on the invoice write path; server never calls `resolveAlias`.

---

## 3. Purchase → Inventory → Accounting — **HIGHEST RISK**

| Check | Status | Evidence |
|---|---|---|
| Stock increase on confirm | ✅ | `ConfirmPurchaseUseCase.php:52-60` |
| Cost update feeds sale COGS (same `average_cost`) | ✅ | `InventoryValuationService.php:64-69` |
| **Supplier payment reduces supplier balance** | 🔴 BROKEN | `CreateSupplierPaymentUseCase` decrements safe only; never touches `supplier->balance` (cf. increment `ConfirmPurchaseUseCase.php:81-85`) |
| Allocation closes invoices | 🔴 BROKEN | `SupplierPaymentAllocationService.php:46-47` writes rows, does not update invoice paid amounts |
| Supplier journals balanced | 🔴 | `isPosted: true` w/o `post()` — balance check bypassed (`CreateSupplierPaymentUseCase.php:125`, `ProcessSupplierRefundUseCase.php:74`) |
| Purchase-return cost reversal | ⚠️ | credits Inventory at return price while stock value reduces at moving-average — GL vs stock drift |
| Purchase integration tests | 🔴 | no `tests/Feature/Purchases/` at all; txn bypassed entirely in `testing` env (`ConfirmPurchaseUseCase.php:98-102`) |

---

## 4. Payments / Treasury → Accounting → Balances — **PROBLEMS**

1. **🔴 BROKEN — all safe-balance updates unlocked (double-spend / lost updates):**
   - `TransferBetweenSafesUseCase.php:37-70`
   - `CreateTreasuryPaymentUseCase.php:37-47`
   - `CreateTreasuryReceiptUseCase.php:37-43`
   - `CollectPaymentUseCase.php:140-143` (`depositToSafe`)
   - `CreateSupplierPaymentUseCase.php:44-49` (safe read)
   All do float read-modify-write on `safe.balance` with no `lockForUpdate`/`increment`.
2. **🔴 Journal balance never enforced at persist:** `EloquentJournalEntryRepository::create()` writes lines verbatim without `isBalanced()`; use-cases hardcode `isPosted: true`. The `JournalEntry::post()` guard is dead on these paths.
3. **⚠️ Overpayment / unallocated drift:** allocation only checked against remaining payment, not invoice outstanding; AR and sub-ledger drift on unallocated payments (`CollectPaymentUseCase.php:73-111`).
4. **✅ Treasury is NOT a silo** — treasury movements post to the GL (`CreateTreasuryPaymentUseCase.php:66-108`, etc.).

---

## 5. Multi-Tenancy & Region / VAT / Currency

**Tenancy**
- ✅ Migration placement correct (tenant tables under `migrations/tenant/`).
- ⚠️ ~230 manual `tenant_id` filters (house-rule violation, not a leak — primary isolation is the separate tenant DB). Doubled filters in `ExpenseController`, `ApprovalController`, `ProfitDistributionController`, `PartnerController`.
- ⚠️ `SettingsController` uses `DB::table('tenant_settings')` without pinning `->connection('tenant')`.

**Region / VAT / Currency**
1. ⚠️ VAT default is Saudi-biased: every `tax_rate` read falls back to `?? 15`, and DTO defaults are `15`. An Egyptian tenant missing `tax_rate` is silently billed 15% instead of 14% (`InvoiceController.php:165`, `CreateInvoiceDTO`, `InvoiceItemDTO.php:14,23`).
2. ⚠️ Egyptian invoice printing shows SAR — `InvoicePrintTemplate.tsx` hardcodes `formatSAR`; `PurchasesContent/Stats` hardcode `ر.س`.
3. ⚠️ No Egyptian (ETA) e-invoicing backend despite UI promising it (`RegionalSettingsSection.tsx:49-53`); only ZATCA exists.
4. ✅ ZATCA correctly guarded to `country === 'SA'` (`ConfirmInvoiceUseCase.php:73-99`).
5. 🧹 Stale `SalesContent.tsx.bak` with hardcoded `* 0.15`.

---

# Fix Plan (ordered)

### P0 — data-integrity correctness (execute now)
- **P0-1** Central journal-balance guard in `EloquentJournalEntryRepository::create()` — reject unbalanced entries on every path.
- **P0-2** `lockForUpdate` on all safe-balance reads (Transfer, TreasuryPayment, TreasuryReceipt, CollectPayment deposit, SupplierPayment).
- **P0-3** Supplier payment reduces `supplier->balance` (under lock), mirroring the purchase increment.
- **P0-4** Fix installment reminder command: correct table (`invoice_installments`) + status values.

### P1 — correct but risk/coverage (after P0 verified)
- **P1-1** Quarantine/fix the duplicate `Returns/ConfirmSalesReturnUseCase` (balance check + COGS reversal).
- **P1-2** Lock the credit-limit check (route it through `CreditLimitChecker`).
- **P1-3** Region-aware VAT default + currency in print template.

### P2 — coverage & cleanup
- **P2-1** Purchase integration tests; stop bypassing txn in `testing`.
- **P2-2** Installment pay-down path + endpoint.
- **P2-3** Remove duplicate `tenant_id` filters + `.bak` file.

---

# Execution Log

### P0 — DONE & verified (2026-06-28)

| ID | Change | Files |
|---|---|---|
| P0-1 | Central balance guard — `create()` rejects any unbalanced entry before persisting | `EloquentJournalEntryRepository.php:21-34` |
| P0-2 | `lockForUpdate` on every safe-balance read | `TransferBetweenSafesUseCase.php:37-52` (both safes, deterministic order), `CreateTreasuryPaymentUseCase.php:39`, `CreateTreasuryReceiptUseCase.php:39`, `CollectPaymentUseCase.php:141`, `CreateSupplierPaymentUseCase.php:45` |
| P0-3 | Supplier payment now reduces `supplier->balance` (under lock), mirroring purchase increment | `CreateSupplierPaymentUseCase.php` (import + decrement after AP base calc) |
| P0-4 | Installment reminder command: `installment_payments`→`invoice_installments`, `status='pending'`→real statuses | `SendInstallmentRemindersCommand.php:24-30,48-54` |

**Verification:**
- `php -l` clean on all 7 changed files.
- Targeted suite (`Treasury|Accounting|CollectPayment|SupplierPayment|Installment`): **28/28 pass**.
- Regression suite (`Invoice|Sales|Purchase|Inventory|Stock|CreditLimit|Return`): **120/120 pass**.
- New `tests/Unit/JournalEntryBalanceGuardTest.php`: **2/2 pass** (locks the P0-1 invariant).

> Note on locks: `lockForUpdate` is a no-op under the SQLite test driver, so the concurrency fix is verified by reasoning + lint + green happy-path tests, not by a race test. It takes effect on PostgreSQL (prod/dev).

### P1-1 — DONE & verified (2026-06-28): sales-return path hardened

Investigating the duplicate `Returns/ConfirmSalesReturnUseCase` (the one the **primary** store→confirm flow actually uses) surfaced **three** real bugs, all now fixed:

| Bug | Fix | Files |
|---|---|---|
| Reversing entry omitted the COGS/Inventory reversal → GL drifts from physical stock | Added Inventory-debit / COGS-credit lines (resaleable goods only; net-zero so entry stays balanced) | `Returns/ConfirmSalesReturnUseCase.php` |
| Accounts resolved only by **hardcoded codes** (4102/2105/1103/1101) → whole entry silently skipped when a tenant's chart differs | Resolve via `AccountMappingService` first, fall back to legacy codes | `Returns/ConfirmSalesReturnUseCase.php` |
| `SalesReturnService` wrote stock-ledger types `sales_return`/`damaged_goods` — **not in the enum** (`purchase,sale,transfer,adjustment,return`) → every real sales return threw at the DB layer | Use `return` / `adjustment`; also removed a **double-increment** of `warehouse_products.quantity` (manual bump + `recordMovement`) | `SalesReturnService.php` |

**Verification:** new `AccountingIntegrityTest::test_sales_return_confirm_posts_cogs_and_inventory_reversal_and_balances` drives the real confirm path and asserts the reversal lines + ledger balance. Broad regression (`Return|Sales|Accounting|Inventory|Stock|Invoice|Treasury|Payment|Installment|Warranty`): **135/135 pass**.

> Note: the duplicate class name remains (two `ConfirmSalesReturnUseCase`). Both are now correct, but converging on one is still worth doing later (P2). A separate latent issue — the GOOD top-level use-case never sets `status='completed'`, and refund-method vocab differs (`store_credit` vs `credit_balance`) — was left untouched to avoid regression and is noted for follow-up.

### P1-2 — DONE & verified (2026-06-28): credit-limit TOCTOU closed

The credit-limit check was unlocked and lived only in the controller / `CreateInvoiceUseCase`, while the balance increment happened later in `ConfirmInvoiceUseCase` under a lock but **without re-checking** — so two concurrent confirmations could both pass a stale check.

| Change | Files |
|---|---|
| Authoritative credit-limit check moved **into** `ConfirmInvoiceUseCase`, under the existing customer-row lock, immediately before the balance mutation. Added `bool $allowCreditOverride = false` param. | `ConfirmInvoiceUseCase.php` |
| User-facing confirm paths pass the validated override flag; internal flows (approval, edit-reconfirm, warranty replacement) pass `true` to preserve their prior non-blocking behaviour. | `InvoiceController.php` (store + updateStatus), `ApproveRequestUseCase.php`, `UpdateInvoiceUseCase.php`, `WarrantyController.php` |
| Fixed the pre-existing 3-arg `execute()` mis-call in the integration test (audit-flagged: `$userId` was silently bound to `$warehouseId`). | `AccountingIntegrityTest.php` |

**Verification:** 2 new tests in `CreditLimitEnforcementTest` prove the use-case enforces the limit when called **directly** (bypassing the controller) and honours the override flag. Broad regression (`CreditLimit|Invoice|Sales|Accounting|Approval|Warranty|Inventory|Stock|Treasury|Payment|Return|Installment`): **146/146 pass**.

> Permission/override gating stays in the controllers (they hold the auth context). The dead `CreditLimitChecker` service was deliberately **not** adopted: it gates on a `Gate('overrideCreditLimit')` ability that `InvoicePolicy` does not define, so routing through it would deny every override. Noted for a future, separate cleanup.

### P1-3 — DONE & verified (2026-06-28): region-aware VAT default + currency display

| Change | Files |
|---|---|
| New `TaxRateResolver::resolve()` — single source for the default VAT rate; derives from country (EG→14, SA→15) when `tax_rate` is unset instead of hardcoding `15`. Replaced all 8 scattered `tax_rate ?? 15` reads. | `Domain/Shared/Services/TaxRateResolver.php` (+ `InvoiceController`, `WarrantyController`, `WorkshopController`, `CreateQuotationUseCase`, `CreateSalesOrderUseCase`, `FulfillSalesOrderUseCase`, `ProductImport`) |
| Invoice print template now formats money via region-aware `formatAmount` (was hardcoded `formatSAR` → SAR even for EG tenants). | `frontend/src/components/sales/InvoicePrintTemplate.tsx` |
| Purchases list & stats now use region-aware `formatAmount` (were hardcoded `ر.س`). | `frontend/src/components/purchases/PurchasesContent.tsx`, `PurchasesStats.tsx` |
| Removed stale `SalesContent.tsx.bak` (hardcoded `* 0.15`). | — |

**Verification:** new `TaxRateResolverTest` (explicit rate wins / EG→14 / SA→15): **3/3 pass**; sales+invoice regression (`Invoice\|Quotation\|SalesOrder\|Workshop\|ProductImport`): **32/32 pass**. Frontend `tsc --noEmit` clean on all changed files.

> Out of scope (feature gap, not a wiring bug): no Egyptian **ETA** e-invoicing backend exists despite the UI promising it — only ZATCA. Tracked separately. `zatca-qr.ts`'s `0.15` default is left as-is (ZATCA is Saudi-only, so 15% is correct there).

### P2-2 — DONE & verified (2026-06-28): installment pay-down wired up

| Change | Files |
|---|---|
| `CollectPaymentUseCase` now cascades each invoice allocation onto that invoice's installment schedule (oldest due first, under a row lock), updating `paid_amount`/`status`. Installments were previously never paid down. | `CollectPaymentUseCase.php` (`applyPaymentToInstallments`) |
| Fixed a latent collision: `reference_number` was `REC-{YmdHis}` — two payments in the same second hit the unique constraint. Now suffixed with a short random token. | `CollectPaymentUseCase.php` |

**Verification:** new `CustomerInstallmentsTest::test_collecting_a_payment_pays_down_installments_oldest_first` (full + partial cascade across two payments). Payment/CRM/installment regression: **52/52 pass**.

### Added coverage for P0-3 (was previously unverified)
New `AccountingIntegrityTest::test_supplier_payment_reduces_supplier_balance_and_posts_balanced_entry` drives the real `CreateSupplierPaymentUseCase`: credit purchase raises supplier balance → payment drives it to zero, reduces the safe, and the ledger stays balanced.

### P2 — REMAINING (not started; higher risk or large feature — recommend separate scoped tasks)
- Remove the `testing`-env transaction bypass in purchase use-cases (risk: it likely exists to avoid RefreshDatabase savepoint issues — needs care).
- Converge the duplicate `ConfirmSalesReturnUseCase` classes (both now correct; convergence has status/refund-method edge cases).
- Dedupe the ~230 redundant manual `tenant_id` filters (low value, high churn).
- Egyptian **ETA** e-invoicing backend (net-new feature).
- Optional dedicated sales-side "pay single installment" endpoint (the cascade above already keeps the schedule correct).
</content>
</invoke>
