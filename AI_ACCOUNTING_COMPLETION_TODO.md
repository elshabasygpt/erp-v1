# Accounting Completion Backlog — For AI-Assisted Development

Focused on accounting correctness/completeness specifically (as opposed to general
feature gaps — see `AI_KNOWN_GAPS_AND_TODO.md` for those). Every accounting change
in this codebase must satisfy one non-negotiable invariant, proven by a test:

> **Every confirmed transaction produces a journal entry where `SUM(debit) ==
> SUM(credit)`.** See `backend/tests/Feature/Sales/InvoicePrintedNameTest.php::test_printed_name_has_no_effect_on_inventory_or_accounting`
> for the exact assertion pattern (raw query against `journal_entry_lines`,
> grouped by `journal_entry_id`).

Never weaken or skip this check to make a feature "work" — if a new feature seems
to require unbalanced entries, the design is wrong, not the test.

---

## Closed (re-verified 2026-06-26 — do not re-implement)

- ~~FX gain/loss is never auto-posted~~ — **DONE**. `FXGainLossService.php`
  computes realized gain/loss on payment settlement (called from
  `CollectPaymentUseCase.php`) and unrealized month-end revaluation with
  auto-reversal. This item in the original audit is obsolete — the codebase
  moved significantly via external edits since it was written.
- ~~Self-reported `paid_amount` lets a credit invoice silently post as if cash
  was received~~ — **DONE**. `DownPaymentAuthorizer` now requires the
  `collect_payments` permission whenever a credit invoice's `paid_amount > 0`,
  in both `CreateInvoiceUseCase` and `UpdateInvoiceUseCase`. See
  `AI_SECURITY_AUDIT_NOTES.md` for the full writeup; the core accounting
  invariant this protects (a safe's balance shouldn't move from an
  unauthorized claim) is now enforced at the point of entry.

- ~~Commission accrual has no accounting leg at all~~ — **DONE (2026-06-26)**.
  `ConfirmInvoiceUseCase` posts debit-commission-expense /
  credit-commission-payable on confirmation; `PayCommissionUseCase` posts the
  mirroring debit-payable / credit-cash entry on payout. New account-mapping
  keys `commission_expense`/`commission_payable` (configure in Settings →
  Accounting Mapping before using in production — the testing environment
  auto-resolves dummy accounts, real tenants must map them like every other
  key). Test: `backend/tests/Feature/Sales/CommissionPayoutTest.php` asserts
  both entries balance.

## Open items

3. **Self-reported `paid_amount` lets a credit invoice silently post as if cash
   was received**, incrementing safe balance and customer balance simultaneously
   in a way that isn't reconciled against any actual payment record (see
   `AI_SECURITY_AUDIT_NOTES.md` for the security framing of the same issue). From
   a pure accounting-correctness lens: a safe's ledger should only move when a
   `SafeTransactionModel` row backed by a verified payment event exists, not from
   a client-supplied number on the invoice payload.

4. **Warranty claim resolution doesn't generate a credit note or replacement
   invoice**, so a warranty replacement currently has no accounting trail at all
   — inventory may move (if someone manually adjusts stock) but there's no
   journal entry tying it back to the original sale's revenue/COGS reversal.

5. **Supplier core/exchange return accounting is unverified.** `SupplierCoreReturnController`
   has ship/credit routes; before trusting it, confirm the underlying use-case
   actually books a payable-reduction journal entry (debit accounts payable,
   credit core-charge clearing account, or whatever the chart of accounts uses) —
   this was flagged but not confirmed during the audit that produced this file.

6. **Customer tier/segment pricing isn't tied to revenue recognition rules.**
   Once tier pricing is implemented (see gaps file), make sure discount-from-tier
   is recorded distinctly from discount-from-sales-channel-markup in the journal
   entry description/metadata — currently `CreateInvoiceUseCase`/`UpdateInvoiceUseCase`
   post a single `discount_amount` line with no breakdown, which will make it
   impossible to report "revenue lost to tier pricing" vs "revenue lost to channel
   promotions" separately once both exist.

---

## Reusable accounting test pattern

When adding any feature that touches invoices, copy this skeleton (from
`InvoicePrintedNameTest.php`):

```php
public function test_my_feature_has_no_effect_on_accounting()
{
    // Create invoice A: baseline (feature off / not used)
    // Create invoice B: identical inputs, feature on
    // Assert warehouse_products.quantity identical for both
    // Assert stock_movements rows identical for both
    // Assert journal_entries exist for both, referencing the invoice id
    // Assert SUM(debit) == SUM(credit) per journal_entry_id for both
}
```

This is the fastest way to prove a change is accounting-neutral before it ships.
