# SMACC Feature Benchmark — For Auto-Parts ERP Development

SMACC is a Gulf-region cloud accounting/ERP/POS suite, widely used by retail and
distribution businesses in Saudi/GCC. This file lists its feature set relevant to
an **auto-parts retail/wholesale** business, and maps each feature against what
this codebase already has (cross-referenced to `AI_KNOWN_GAPS_AND_TODO.md` and
`AI_ACCOUNTING_COMPLETION_TODO.md`) so it's an actionable backlog, not just a
wishlist. Status is "Have" / "Partial" / "Missing" based on the audits already
done in this repo — re-verify before trusting a "Have" on a stale claim.

Source: SMACC's published feature pages (see Sources at bottom). This file
summarizes publicly documented capabilities, not a hands-on trial.

---

## 1. Core Financial Accounting

| SMACC feature | Relevance to auto-parts | Status here |
|---|---|---|
| General ledger, journal entries, real-time financial statements | Core — every sale/purchase must hit the GL | **Have** — `JournalEntryRepositoryInterface`, balanced-entry pattern enforced by tests |
| AR/AP with aging | Track customer credit (garages buying on account) and supplier payables | **Partial** — `GetAgingReportUseCase` exists backend-only, no frontend report (see gaps file §2) |
| Multi-currency | Relevant if importing parts priced in USD/EUR while selling in local currency | **Partial** — `ExchangeRateModel` exists but FX gain/loss isn't auto-posted (see accounting TODO §1) |
| Debit/credit notes | Needed for price corrections, supplier core-charge credits | **Partial** — sales returns exist; supplier core-return accounting unverified (see security notes) |
| Customer credit limit enforcement | Garages/workshops often buy on credit — must cap exposure | **Have** — implemented this session (`CreditLimitChecker`, race-condition-safe) |

## 2. Inventory Management (highest relevance for auto-parts)

| SMACC feature | Relevance to auto-parts | Status here |
|---|---|---|
| Barcode creation + bulk printing (EAN, QR, Code39) | Parts need barcodes for fast POS/warehouse scanning | **Check** — `barcode` column exists on products; verify if there's a barcode *generation/print* tool, or only manual entry/lookup |
| Multi-warehouse / multi-branch stock tracking | Parts stores commonly run multiple branches/warehouses | **Have** — `WarehouseModel`, `WarehouseProductModel`, branch transfers exist |
| Reorder point alerts | Critical — stockouts on fast-moving parts (filters, pads, belts) lose sales | **Have** — `stock_alert_level` on products, low-stock endpoints exist |
| Batch/serial/lot tracking | Less critical for most parts, but relevant for batteries (serial + warranty) and lubricants (batch/expiry) | **Missing** — `StockLotModel` is cost-layer (FIFO) only, no expiry/serial fields (see gaps file §1) |
| Weighted-average costing | Alternative to FIFO for fungible parts | **Check** — confirm whether this project supports average costing as an option alongside FIFO cost layers, or FIFO-only |
| Kit/BOM (bundle) management | Relevant for "service kits" (e.g. brake kit = pads + sensor + clips sold as one SKU) | **Partial** — backend `AssemblyController`/BOM exists, frontend kit editor incomplete (see gaps file §2) |
| Cycle counts / stock takes | Needed for periodic physical inventory reconciliation | **Check** — verify whether a stock-take/cycle-count workflow exists at all; not confirmed in prior audits |

## 3. Point of Sale (POS)

| SMACC feature | Relevance to auto-parts | Status here |
|---|---|---|
| Touch UI, offline mode | Counter sales for walk-in customers, must survive internet drops | **Have** — `ProPosScreen.tsx` preloads catalog, works offline-first (confirmed earlier session) |
| Real-time inventory sync | Avoid overselling the last unit across POS + online/branch | **Have** — same stock tables used everywhere, no separate POS-only stock |
| Simplified e-invoice at POS | Fast checkout without full invoice form | **Have** — POS has its own invoice flow distinct from the desktop create-invoice screen |
| Shift open/close with cash drawer reconciliation | Cashier accountability, end-of-day cash count | **Partial** — `PosShiftController` exists but reconciliation depth is thin (see gaps file §3) |

## 4. Tax & Compliance (Saudi/GCC specific — directly applicable since this codebase already targets ZATCA)

| SMACC feature | Relevance | Status here |
|---|---|---|
| ZATCA Phase 2 (UUID, QR code, Fatoora integration) | Mandatory for KSA businesses, including auto-parts retailers | **Partial** — `ZatcaPhase1Service` exists (Phase 1 QR only); confirm whether Phase 2 (clearance/reporting via Fatoora API) is implemented — not confirmed in prior audits, worth a dedicated check given this is a legal requirement, not optional |
| VAT return preparation | Periodic filing requirement | **Check** — not confirmed whether a VAT-return report exists distinct from the general accounting reports |
| Zakat report & payment | KSA-specific religious/statutory levy | **Partial** — backend exists, no frontend (see gaps file §2) |

## 5. Purchasing & Supplier Management

| SMACC feature | Relevance to auto-parts | Status here |
|---|---|---|
| Quotations → PO → supplier invoice → payment | Standard procurement cycle for restocking parts | **Have** — purchasing module exists with this flow |
| Supplier price lists | Compare prices across multiple parts distributors before ordering | **Partial** — `SupplierPriceListController` exists; bulk import use-case completeness unverified (see gaps file §3) |
| Core/exchange returns to supplier | Auto-parts specific: returning old alternators/starters for a core credit | **Partial** — routes exist, accounting trail unverified (see security/accounting notes) |

## 6. HR & Payroll (Saudi-specific)

| SMACC feature | Relevance | Status here |
|---|---|---|
| GOSI integration, end-of-service calculation, WPS bank file export | Mandatory for any KSA employer, including a parts retailer's staff | **Check** — not covered by prior audits in this repo; worth a dedicated HR-module audit if payroll is in scope at all |
| Attendance/leave with multi-currency payroll | Relevant if staff includes expat workers paid partly in home currency | **Check** — same, needs its own audit |

## 7. What's auto-parts-specific that SMACC does NOT cover (and this codebase should NOT skip)

SMACC is a generic retail/distribution ERP — it has no concept of vehicle fitment,
OEM cross-referencing, or VIN decoding. These remain genuinely missing from this
codebase too (see `AI_KNOWN_GAPS_AND_TODO.md` §1) and won't be filled by copying
SMACC's feature set:

- OEM/part-number cross-reference ("what else fits this code")
- VIN decoding → fitment resolution
- Vehicle make/model/year compatibility validation at the point of sale (does this
  brake pad actually fit the customer's car?)

These are the features that differentiate an auto-parts ERP from a generic retail
ERP, and should be prioritized ahead of re-implementing things SMACC already does
generically (like barcode printing) if development time is limited.

---

## Recommended priority order for closing gaps (combining this file + existing audits)

1. **ZATCA Phase 2 compliance check** — legal risk if Phase 1-only in a market that
   requires Phase 2 now; verify this first, it's not optional like a UX gap.
2. **Customer credit limit** — done this session.
3. **AR/AP aging report frontend** — backend-complete, cheap to expose, high value
   for collections follow-up (a core SMACC strength).
4. **Cash drawer reconciliation depth** — directly affects daily cash accuracy.
5. **OEM cross-reference search** — auto-parts-specific differentiator, not covered
   by any generic ERP benchmark including SMACC.
6. **Batch/serial tracking** — narrower need (batteries, lubricants), lower
   priority than the above.

---

Sources:
- [SMACC | Best Accounting Software & POS Management](https://smacc.com/ww/en/)
- [Accounting Software | SMACC](https://www.smacc.com/en/accounting-software/)
- [Financial Accounting Software | SMACC](https://www.smacc.com/en/accounting-software/financial-accounting-software/)
- [Warehouse Management System | Inventory Management Software | SMACC](https://www.smacc.com/en/accounting-software/inventory-management-software/)
- [Managing Barcoded Inventory with SMACC](https://www.smaccindia.com/benefits-of-barcode-inventory-system/)
- [SMACC: Pricing, Free Demo & Features | Software Finder](https://softwarefinder.com/accounting-software/smacc)
