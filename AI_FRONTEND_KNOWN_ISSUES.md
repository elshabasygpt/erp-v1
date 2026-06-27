# Frontend Known Issues — For AI-Assisted Development

Findings specific to `frontend/src`. Verified by direct inspection (grep/read), not
guessed. See `AI_PROJECT_INDEX.md` for how this fits with the other `AI_*.md` files.

---

## Closed (fixed 2026-06-26 — kept for context, do not re-investigate)

### The `permissions` array used to be effectively always empty — FIXED, root cause was deeper than it looked

What was originally diagnosed as "`AuthController` doesn't flatten `role.permissions`"
was the visible symptom of a second, deeper bug: `PermissionModel` (the app's custom
model for the `permissions` table) was a plain `BaseModel`, never wired into Spatie's
package config (`config/permission.php` still pointed `'permission' =>
Spatie\Permission\Models\Permission::class`, the package's own stock model). That
stock model has no connection override, so it read/wrote on the app's *default*
connection — while `RoleModel` is hard-pinned to `'tenant'`. Roles and permissions
were silently living in two different databases; `$role->permissions` was always
empty no matter what `RoleController::syncPermissions()` did.

**Fix:** `PermissionModel` now extends `Spatie\Permission\Models\Permission` directly
(with `protected $connection = 'tenant'` and `HasUuids`), and `config/permission.php`
points `'permission'` at it. `AuthController::login/register/me` now also explicitly
flatten `$user->role->permissions->pluck('name')` into `user.permissions` in every
auth response. Covered by `backend/tests/Feature/Auth/PermissionsFlatteningTest.php`.

If you're investigating a permission-related bug and this section makes you think
"didn't I just read this was broken?" — that was true before this date, verify
against current code before assuming the old description still applies.

---

## Open issues

### 1. Loading/error state handling is inconsistent across components

- Roughly half of `frontend/src/components/**/*.tsx` (68 of 140 at last check)
  reference `loading`/`isLoading` state at all. The rest either don't fetch data
  (fine) or fetch without a loading indicator (inconsistent UX — a slow network
  shows a blank/stale section with no feedback).
- A global `ErrorBoundary` exists and is wired at the root
  (`frontend/src/app/[locale]/layout.tsx` uses `frontend/src/components/ui/ErrorBoundary.tsx`),
  so a render-time crash won't blank the whole app — that part is fine. The gap is
  narrower: individual data-fetching components catching their own fetch errors and
  showing an inline retry vs. just `toast.error(...)` and leaving stale/empty UI
  (the pattern in `InvoiceFormContext.tsx::handleSubmit`, for example, is fine —
  toast + stay on form — but not every component follows it).
- **Not urgent**, but worth a pass before a big push toward production hardening:
  pick one loading-skeleton pattern and one error-retry pattern and apply
  consistently, rather than fixing component-by-component reactively.

### 2. `InvoiceFormContext.tsx` (manual invoice creation screen) doesn't send `printed_name`

- The POS screen (`frontend/src/components/pos/ProPosScreen.tsx`) sends
  `printed_name` per line (added when the Product Alias feature shipped — see
  prior session). The separate manual "create invoice" desktop form
  (`frontend/src/components/sales/create/InvoiceFormContext.tsx::handleSubmit`)
  builds its own `items` payload and does **not** include `printed_name` at all.
- Backend already accepts `items.*.printed_name` as nullable on both create paths,
  so this isn't broken, just incomplete — a customer's preferred alias name won't
  show on invoices created from this screen, only from POS. Low priority unless
  this screen is the primary invoicing path for some tenants.

---

## How to verify these are still accurate

```bash
# permissions flattening — check if AuthController still doesn't flatten role.permissions
grep -n "permissions" backend/app/Presentation/Controllers/API/Auth/AuthController.php

# loading state coverage — rough count
grep -rl "isLoading\|setLoading\|loading &&" frontend/src/components --include="*.tsx" | wc -l
find frontend/src/components -name "*.tsx" | wc -l
```
