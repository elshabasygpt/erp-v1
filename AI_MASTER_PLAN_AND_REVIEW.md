# AI Master Plan & Review

Master execution file for the current state of the ERP codebase.
This document combines:

1. Current review snapshot
2. Prioritized execution plan
3. Concrete task backlog
4. Review and verification checklist

Date: 2026-06-26
Scope: Full project (`backend`, `frontend`, infra-facing app flows, finance-sensitive paths)

This file is intended to be actionable, not archival. Update statuses as work lands.

---

## 1. Executive Review

### Overall state

The project is no longer in "prototype only" shape. It already contains substantial
ERP depth across:

- sales
- purchases
- inventory
- accounting
- CRM
- HR
- treasury
- analytics

However, the system is still uneven. Some domains are production-near, while others
contain correctness gaps, incomplete frontend flows, or backend/frontend mismatch.

### What is strongest today

- Multi-tenant application structure exists and is consistent enough to build on.
- Core sales, purchases, inventory, and accounting modules are present.
- Several previously missing features are now implemented:
  - batch/lot tracking support
  - approval rules frontend
  - inventory valuation frontend
  - forecasting frontend
  - payroll penalties/items frontend
  - supplier/core return accounting
  - commission accrual backend
- The codebase already carries useful internal audit notes and backlog files.

### What is weakest today

- Correctness and workflow consistency across all confirm/complete/status-change paths
- Gaps between backend capability and frontend exposure
- Permission model consistency
- Migration hygiene / regression discipline
- Product catalog depth needed for auto-parts procurement operations
- Operational polish in error/loading/retry handling

### Bottom-line assessment

The project is viable, but not yet uniformly production-safe. The top priority is
not "more features" in the abstract; it is closing the remaining correctness gaps in
financial and stock-affecting flows, then finishing the daily-use screens that are
already half-built in the backend.

---

## 2. Priority Plan

## Phase P0 - Production Safety

Goal: Ensure that money, stock, approvals, and status transitions behave correctly.

Focus:

- sales confirmation correctness
- purchase confirmation correctness
- inventory movement invariants
- accounting integrity
- permission consistency
- migration and test hygiene

Definition of done:

- No known broken confirm/status path remains in Sales/Purchases/Inventory
- Journal entries remain balanced on all affected paths
- Stock movement side effects are verified
- CI-equivalent local checks exist for migration freshness and critical tests

## Phase P1 - Daily Operations Completion

Goal: Make day-to-day business operations complete from the UI, not just supported in backend code.

Focus:

- purchase workflow completion
- sales workflow completion
- commission payout frontend
- supplier payment and treasury integration visibility
- document attachments / references

Definition of done:

- Typical business user can complete the full daily cycle without admin/dev workarounds

## Phase P2 - Catalog & Procurement Depth

Goal: Deepen the product and purchasing model so the ERP fits auto-parts operations better.

Focus:

- multi-supplier product sourcing
- lead time / MOQ
- richer product media
- cross-reference intelligence
- VIN / fitment intelligence

Definition of done:

- Product master data supports realistic procurement and parts-search workflows

## Phase P3 - UX Consistency & Reporting

Goal: Improve operator confidence and management visibility.

Focus:

- consistent loading/error/retry UX
- reporting drill-down
- audit views
- exception monitoring

Definition of done:

- Users can trust the system both when things go right and when they go wrong

---

## 3. Prioritized Task Backlog

Status legend:

- `OPEN`
- `IN PROGRESS`
- `DONE`
- `BLOCKED`

### P0.1 Sales correctness and confirmation flows

- `OPEN` Fix `UpdateInvoiceUseCase` confirm branch so confirming through update is valid and not dead code.
- `OPEN` Re-audit all sales status transitions: draft, confirmed, cancelled, return paths.
- `OPEN` Verify `safe_id`, payment method, and treasury side effects are consistent across all sales confirmation paths.
- `OPEN` Add/expand tests covering:
  - confirm from update path
  - no orphan draft rows on failure
  - balanced journal entries
  - no silent stock drift

### P0.2 Inventory and approval correctness

- `OPEN` Integrate stock transfer approval with `ApprovalWorkflowService`.
- `OPEN` Add dedicated scrap/damaged/obsolete write-off flow with accounting treatment.
- `OPEN` Re-audit all inventory-affecting operations:
  - purchase confirm
  - purchase return complete
  - sales confirm
  - sales return complete
  - adjustments
  - stock transfer receive
  - assembly confirm
- `OPEN` Add invariant tests for stock quantities and valuation after these flows.

### P0.3 Permissions and access model

- `OPEN` Unify or clearly rationalize the two permission systems:
  - Spatie permissions
  - `roles.meta_attributes`
- `OPEN` Decide whether `meta_attributes` becomes:
  - real permissions
  - policy flags
  - or temporary compatibility layer
- `OPEN` Audit all finance-sensitive actions for permission enforcement consistency.

### P0.4 Migration hygiene and regression discipline

- `OPEN` Add a documented required verification path for fresh migrations on a clean DB.
- `OPEN` Add CI or scripted local validation for:
  - `migrate:fresh`
  - core feature tests
  - accounting integrity tests
- `OPEN` Audit recent top-level and tenant migrations for misplaced schema changes.

### P1.1 Purchases completion

- `DONE` Align purchase status handling between frontend and backend (`confirmed` vs old placeholder statuses).
- `DONE` Expose lot/serial/production/expiry tracking in purchase invoice UI.
- `DONE` Add treasury safe support for cash purchase confirmation.
- `OPEN` Run and verify the new purchase `safe_id` migration on the target environment.
- `OPEN` Add supplier invoice reference number to purchase invoices.
- `OPEN` Add invoice attachment upload/view for purchases.
- `OPEN` Improve product selection in purchase invoice modal:
  - larger result set
  - searchable async lookup
  - quick add where appropriate
- `OPEN` Auto-update supplier price list records from confirmed purchase prices, not just purchase date.
- `OPEN` Add clearer feedback when safe balance is insufficient for cash purchase confirmation.

### P1.2 Purchase returns and supplier settlement

- `DONE` Fix purchase return completion payload mismatch (`warehouse_id` vs old incorrect payload).
- `OPEN` Re-audit supplier payment flows against AP balances and treasury movements.
- `OPEN` Surface supplier settlement history more clearly in UI.
- `OPEN` Add tests covering:
  - supplier payment allocation
  - supplier refund
  - purchase return accounting integrity

### P1.3 Sales daily-use completion

- `OPEN` Build frontend for commission payout using the existing backend endpoints.
- `OPEN` Fix manual invoice creation so it sends `printed_name` like POS does.
- `OPEN` Re-audit down-payment, safe selection, and payment collection UX for consistency.
- `OPEN` Add operator-visible handling for approval-required invoice confirmations.

### P1.4 Treasury visibility

- `OPEN` Add clearer cross-links between:
  - invoices
  - purchase payments
  - safe transactions
  - commission payouts
- `OPEN` Add treasury transaction drill-down by reference type/id.

### P2.1 Product master data depth

- `OPEN` Add multi-image product support.
- `OPEN` Add product lead time support in UI and backend-facing workflow.
- `OPEN` Add MOQ support.
- `OPEN` Add multi-supplier cost management for products.
- `OPEN` Add real-time duplicate checking for:
  - SKU
  - OEM number
  - part number
- `OPEN` Make bin-location persistence atomic with product save where practical.

### P2.2 Auto-parts intelligence

- `OPEN` Implement OEM/part-number cross-reference resolver.
- `OPEN` Implement VIN decoding workflow.
- `OPEN` Improve fitment editing consistency between create/edit product experiences.
- `OPEN` Review supersession/cross-reference UX for large catalogs.

### P3.1 Frontend consistency

- `OPEN` Standardize loading states across data-fetching screens.
- `OPEN` Standardize inline error/retry handling.
- `OPEN` Identify screens still relying only on `toast.error(...)` without durable inline state.
- `OPEN` Review mobile usability of the heaviest operational modals.

### P3.2 Reporting and auditability

- `OPEN` Add richer drill-down for:
  - inventory reconciliation
  - AP aging
  - safe transactions
  - purchase lifecycle
- `OPEN` Add exception reports:
  - draft documents stuck too long
  - failed confirmations
  - negative or near-zero treasury balances
  - products with incomplete commercial master data

---

## 4. Current Review by Domain

### Sales

State: `MEDIUM-HIGH maturity`

Strengths:

- Core invoicing exists
- POS and manual sales exist
- loyalty/segment pricing support exists
- warranty support exists
- commission accrual backend exists

Main gaps:

- dead/inconsistent confirm path in `UpdateInvoiceUseCase`
- commission payout frontend missing
- manual invoice screen missing `printed_name`
- permissions still need a unified long-term model

### Purchases

State: `MEDIUM maturity`

Strengths:

- purchase invoices, returns, installments, supplier pricing, smart ordering pieces exist
- recent workflow mismatches in statuses have been fixed
- lot/serial fields are now surfaced in purchase invoice UI
- treasury safe support for cash purchases has been added

Main gaps:

- migration/application of purchase `safe_id` still needs rollout verification
- supplier invoice attachments/reference metadata still missing
- product search and supplier-price update behavior need deepening

### Inventory

State: `MEDIUM maturity`

Strengths:

- products, warehouses, stocktakes, adjustments, assemblies, valuation, imports exist
- lot/serial tracking exists
- compatibility, aliases, alternatives, kits exist

Main gaps:

- no dedicated write-off flow
- approval integration for transfer is incomplete
- some product master data depth is still missing

### Accounting

State: `MEDIUM-HIGH maturity`

Strengths:

- journal entry model is present
- fiscal period, mappings, reports, FX pieces, VAT/Zakat pieces exist
- several accounting tests already exist

Main gaps:

- every operational path touching accounting still needs stronger regression coverage
- purchase-side treasury/accounting linkage needs full rollout verification

### Treasury

State: `MEDIUM maturity`

Strengths:

- safes and safe transactions exist
- treasury payment/receipt flows exist
- many modules already reference safes

Main gaps:

- better cross-linking and audit UX
- broader consistency across all finance entry points

### HR / CRM / Analytics

State: `MEDIUM maturity`

Strengths:

- meaningful feature depth already exists

Main gaps:

- these areas are less urgent than finance/stock correctness
- should mainly receive completion and polish after P0/P1

---

## 5. Review Checklist for Any Future Task

Use this checklist before marking a task done.

### For Sales / Purchases / Inventory / Accounting changes

- Audit the full request path end-to-end
- Confirm backend and frontend statuses match exactly
- Confirm side effects are atomic
- Confirm stock quantities are correct
- Confirm journal entries remain balanced
- Confirm tenant scoping remains correct
- Confirm approval rules are respected where required
- Confirm the UI handles loading, error, and retry states sensibly

### Required verification

- Re-read edited files after patching
- Run targeted PHP syntax checks for edited backend files
- Run targeted TypeScript validation where frontend files changed
- Run or extend focused tests where the flow is finance-sensitive
- Re-audit adjacent workflows, not only the happy path you changed

---

## 6. Suggested Next 10 Tasks

If the goal is maximum delivery value with minimum product risk, this is the
recommended order:

1. Fix `UpdateInvoiceUseCase` confirm path.
2. Add/verify tests for critical sales confirmation invariants.
3. Integrate stock transfer approval workflow.
4. Verify and roll out purchase `safe_id` migration in the real environment.
5. Build commission payout frontend.
6. Add supplier invoice reference and attachments.
7. Improve purchase product search UX.
8. Add dedicated inventory write-off flow.
9. Add multi-supplier product sourcing data.
10. Standardize frontend loading/error handling patterns.

---

## 7. Maintenance Notes

- If a task here is completed, change its status instead of leaving it implicit.
- If a new high-risk bug is found, add it under `P0` immediately.
- If a gap is discovered to already be fixed, mark it `DONE` and cite the file.
- Keep this file aligned with `AI_PROJECT_INDEX.md`.

