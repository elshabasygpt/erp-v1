# Add/Edit Product (Item) Feature — Review & Backlog

Review of the "add/edit product" screen specifically — the single highest-traffic
form in an auto-parts ERP, since every part in the catalog goes through it. Based
on direct inspection of `frontend/src/components/inventory/InventoryFormModal.tsx`,
`frontend/src/hooks/useProductForm.ts` (or equivalent), `backend/app/Presentation/Controllers/API/Inventory/ProductController.php`,
`ProductModel.php`, and the `products`-table migration history. File:line evidence
is in the original audit transcript — re-verify before acting since this form is
actively touched by feature work (aliases, alternatives, kits all landed there
recently).

See `AI_PROJECT_INDEX.md` for how this fits with the other `AI_*.md` files.

---

## Current state: what the form already does well

The form is already ahead of a generic retail ERP for auto-parts specifically:
**OEM number, part number, brand, quality grade (Original/OEM/Aftermarket/Used),
country of origin, warranty months (auto-creates a warranty record on sale), core
charge (boolean + amount), "is kit" with a components sub-tab, "superseded by"
(part obsolescence chaining), vehicle compatibility picker, and product
aliases/cross-references** are all present in both the DB and the UI. This is
notably more complete than SMACC's generic feature set (see
`AI_SMACC_FEATURE_BENCHMARK.md` §7) — don't regress these while fixing the gaps
below.

## 1. Bugs — fields collected but silently dropped

- **`profitPercent` and `discount` are computed/shown in the form but never sent to
  the backend.** The frontend calculates `sellPrice` client-side from
  `costPrice + profitPercent`, but only the final `sellPrice` is submitted —
  `profitPercent` itself isn't persisted. On edit, profit % is *re-derived* from
  stored cost/sell price rather than being a real stored value. If a user expects
  "I set 30% margin" to stick as a policy for future cost changes, it doesn't —
  it's a one-time calculator, not a stored markup rule. **Fix:** either store
  `profit_percent` on the product (and recompute `sell_price` automatically when
  `cost_price` changes), or relabel the UI so it's clearly a one-time calculator,
  not a saved setting.
- **`is_favorite` exists in the DB with no UI control at all** — dead column.

## 2. Missing entirely (no DB column, no UI field)

- **Multiple product images.** Only a single `image_url`. Auto-parts customers
  frequently need to see a part from multiple angles (box contents, the actual
  part vs. stock photo) before confirming compatibility — this is a real
  conversion-rate issue for any storefront/catalog use of this data, not just
  cosmetic.
- **Lead time per product.** Referenced by `smartOrderDrafter.ts` (forecasting/
  auto-draft-PO feature — see `AI_KNOWN_GAPS_AND_TODO.md` §2) but there's no field
  to actually set it per product. The forecasting feature is half-built without
  this.
- **Minimum order quantity (MOQ).** Relevant when a supplier only sells a part in
  boxes of 12, not individually — affects PO quantity rounding.
- **Weight/dimensions.** Needed for any future shipping-cost calculation
  (e-commerce/delivery orders) — not urgent if this ERP is counter-sale-only today,
  but worth flagging if online ordering is on the roadmap.

## 3. Exists in backend, not exposed in the add-product UI

- **Unit-of-measure conversions** (`ProductUnitModel`, e.g. "box of 12" vs "piece").
  The API supports creating/editing units (`ProductController::store/update` lines
  handling `units`), but the add-product form itself has no inline UI for it —
  users must save the product first, then go find a separate Units tab. For a
  parts business where "sold by piece, bought by box" is the norm, this should be
  inline on the main form, not a second workflow.
- **Multi-supplier with per-supplier cost.** `ProductDefaultSupplierModel` exists
  but isn't exposed in the form. Auto-parts retailers routinely source the same
  part from 2-3 distributors at different prices — the form only has a single
  implicit cost price, no "this part costs X from supplier A, Y from supplier B."

## 4. UX papercuts (small, but compound on a high-traffic form)

- **No real-time SKU/barcode/OEM-number duplicate check.** Backend validates
  uniqueness on submit, but the user only finds out after filling the whole form
  and clicking Save — should be an inline async check as they type, especially for
  barcode (often scanned, so a duplicate usually means "this part already exists,
  you're about to create a dupe").
- **Vehicle compatibility picker is create-mode only** — editing an existing
  product's fitment requires switching to a separate tab instead of using the same
  inline picker. Inconsistent mental model between create and edit.
- **Image upload is base64-inline, not a real file upload** — works, but bloats
  the request payload and skips any server-side image compression/resizing. Will
  become a real problem once products carry multiple images (see §2).
- **"Superseded By" dropdown loads the entire product list with no search-as-you-type
  pagination** — will get slow once the catalog passes a few thousand SKUs (typical
  for an auto-parts store carrying multiple brands/vehicle lines).
- **Bin location is saved via a separate API call from the rest of the product**,
  not atomically with the main save — a failure between the two calls leaves the
  product saved but the bin location not, with no rollback or user-visible warning.
- **No required-field affordance beyond `name_ar`** — e.g. nothing visually flags
  that cost/sell price should probably be required before a product can be sold,
  so it's easy to save a part with `sell_price = 0` by mistake.

## 5. Bulk import vs. manual form — field parity gap

The bulk import path (`ProductImport.php`) accepts `customer_aliases` and a direct
`stock` quantity on import — fields the manual single-product form has no
equivalent for (you can't set initial stock or a customer-specific alias while
manually creating one product; you'd have to create the product, then separately
go to the Aliases tab and the stock-adjustment screen). Worth deciding if this gap
is acceptable (bulk import is for migrations/initial load, manual form is for
day-to-day single additions) or should be closed for consistency.

---

## Suggested priority order

1. Fix the silently-dropped `profitPercent`/`discount` fields (data integrity bug,
   cheap fix).
2. Inline unit-of-measure conversion UI on the main form (high daily-use value for
   a parts business).
3. Real-time SKU/barcode duplicate check (prevents the most common data-entry
   mistake — accidental duplicate part creation).
4. Multi-image support (conversion-rate impact if catalog is customer-facing
   anywhere, e.g. a future B2B portal).
5. Multi-supplier cost UI, lead time, MOQ — needed once purchasing/forecasting
   features (already flagged as backend-only) get a frontend.
