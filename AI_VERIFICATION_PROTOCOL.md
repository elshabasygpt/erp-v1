# AI Verification Protocol — Don't Report "Done" Until This Passes

This file is a checklist for AI coding assistants to run **after implementing any
task** in this repo, before telling the user it's finished. It exists because "I
wrote the code" and "the feature actually works" are different claims, and this
codebase has repeatedly had cases where code looked complete but had a silent gap
(see `AI_SECURITY_AUDIT_NOTES.md` for real examples: a TOCTOU race, an orphaned-draft
bug, a field that was collected in the UI but silently dropped before reaching the
database). Treat this as a gate, not a suggestion.

See `AI_PROJECT_INDEX.md` for how this fits with the other `AI_*.md` files.

---

## Step 1 — Re-read what you actually changed

Don't trust your memory of what you wrote. Open every file you touched and read it
fresh, end to end (not just the diff). Specifically check for:

- Did every place that *should* call your new code actually call it? (e.g. a new
  validation rule added to `store()` but forgotten in `update()` — this exact
  mistake happened twice in this codebase's history, see commit-level evidence in
  `AI_SECURITY_AUDIT_NOTES.md`.)
- Does data round-trip? If you added a field to a create payload, does the read
  path (show/edit/list) actually return it back, or does it silently default to
  empty/zero on next load? (This exact bug existed for `profit_percent`/`discount`
  on the product form — collected, sent nowhere, always read back as 0.)
- Did you leave a duplicate/redundant check, a stray `dump()`/`Log::info()` debug
  line, or a TODO comment that should have been resolved?

## Step 2 — Trace the full request path, not just the function you edited

For any backend change: trace from the HTTP route → controller validation →
use-case/service → repository/model → database, and back. A field that's
validated but not in `$fillable` is silently dropped. A field that's in
`$fillable` but not validated is a mass-assignment risk. A check added in a
use-case that's never actually reachable (see the `UpdateInvoiceUseCase` dead-code
finding in `AI_SECURITY_AUDIT_NOTES.md`) gives zero real protection despite reading
correctly in isolation.

For any frontend change: trace from the UI control → local state → the payload
object actually sent to `api.ts` → what the backend validates → what comes back →
how it's merged back into local/list state after save. A value can be correctly
captured in form state and still never appear in the network request if it's
missing from the payload object literal.

## Step 3 — Run tests, and read the actual output

- Run the specific test(s) for what you changed. If none exist, write at least one
  before claiming the task done — see `backend/tests/Feature/Sales/CreditLimitEnforcementTest.php`
  or `backend/tests/Feature/Inventory/ProductFormFieldsTest.php` for the pattern
  this codebase uses (one test per scenario, including the "this must NOT happen"
  negative cases, not just the happy path).
- Run a broader regression pass on the affected area (e.g. `--filter="Invoice"` or
  `--filter="Product"`), not just your new test file. New code can pass its own
  test while breaking something adjacent.
- **Do not silently accept "tests are red" as someone else's problem without
  checking.** If a failure looks unrelated to your change, prove it: run that
  specific failing test in isolation, on a clean state, without your change
  present (e.g. `git stash` or just re-run the exact same test alone) and confirm
  it fails the same way. Only then is it safe to call it pre-existing. This
  codebase has had migrations silently misplaced into the wrong directory and
  duplicate-column migrations that broke the *entire* suite — "not my problem"
  was wrong more than once this session before actually checking.
- For PHP: use `php -c /tmp/php_test.ini vendor/bin/phpunit --filter=<Name>` — the
  default php.ini here doesn't load `fileinfo`, which breaks any
  `Storage::fake()`-based test silently with a confusing `finfo` error.
- For frontend: run `npx tsc --noEmit -p .` and actually grep the output for the
  files you touched — a clean exit code with the full project can still hide
  errors in your files if you don't look.

## Step 4 — Check the invariants that must never break

- **Accounting changes**: every confirmed transaction's journal entry must satisfy
  `SUM(debit) == SUM(credit)`. See `AI_ACCOUNTING_COMPLETION_TODO.md` for the exact
  test pattern. If your change touches anything in Sales/Purchases/Inventory and
  you didn't write a test asserting this, you're not done.
- **Multi-tenancy**: never add a query against a tenant-scoped model without
  relying on `TenantScope` (don't manually filter `tenant_id` — and don't
  accidentally bypass the scope either, e.g. by querying a different connection
  directly with raw SQL).
- **Atomicity**: if a feature spans more than one use-case call (e.g. create then
  confirm), check whether they share a transaction. If not, ask: what happens to
  the first half if the second half throws? (Real bug found and fixed this
  session — see "Atomicity gap" in `AI_SECURITY_AUDIT_NOTES.md`.)
- **Race conditions**: if a check-then-update sequence touches a balance, stock
  level, or any shared counter, the check must happen against a row-locked read
  (`lockForUpdate()`), not an earlier unlocked one, or two concurrent requests can
  each pass a check that, combined, violates the invariant.
- **Migrations**: tenant-scoped tables belong in `database/migrations/tenant/`,
  not the central `database/migrations/`. Run a fresh migration (not just
  `migrate`) before trusting a new migration file — `migrate:fresh` is the only
  way to catch a misplaced or duplicate-column migration before it silently
  breaks the whole test suite for whoever runs it next.

## Step 5 — Actually try to break it (don't just confirm the happy path)

Ask, for the specific feature you just built:
- What happens with a zero/empty/null input where a real value was expected?
- What happens if the same action is attempted twice (double-submit, idempotency)?
- What happens if two requests touching the same row happen concurrently?
- What happens if the user lacks the permission your feature assumes they have?
- What happens if a failure occurs halfway through a multi-step operation — is
  there a half-applied state left behind?
- For UI you added: does it differ when the underlying record doesn't have the
  field set yet (e.g. an old product created before this feature existed)?

If you find a real issue during this step, fix it, then **repeat steps 3-5** —
don't fix-and-stop without re-verifying.

## Step 6 — Report honestly, including caveats

Don't say "100% done, no issues" if there are known pre-existing unrelated
failures in the suite, or a deliberately deferred edge case. State exactly what
passed, what's pre-existing and unrelated (with evidence you actually checked, per
Step 3), and what's explicitly out of scope. The user has consistently valued this
over an inflated "certified" claim — see the tone of `AI_SECURITY_AUDIT_NOTES.md`
and the final reports for the Product Alias and Credit Limit features as the
calibration for how much honesty/detail is expected here.

---

## Quick checklist (copy this into your final response if useful)

- [ ] Re-read every changed file end-to-end, not just the diff
- [ ] Traced the full path: UI/route → validation → business logic → persistence → read-back
- [ ] Wrote or ran a test for the new behavior, including a negative case
- [ ] Ran a broader regression on the affected area, not just the new test
- [ ] Any failure claimed "pre-existing" was actually verified in isolation
- [ ] Checked accounting balance / tenant scoping / atomicity / race conditions if relevant
- [ ] Tried at least one "break it" scenario from Step 5
- [ ] Frontend: `tsc --noEmit` checked and grepped for the touched files
- [ ] Final report states caveats honestly, doesn't overclaim
