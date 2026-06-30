# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Orientation

Read in this order before starting any implementation:
1. `AI_PROJECT_INDEX.md` — house rules, reading order, known pitfalls
2. `AI_VERIFICATION_PROTOCOL.md` — mandatory gate before reporting any task done
3. `AI_KNOWN_GAPS_AND_TODO.md` — what's half-built (re-verify against code before acting)
4. `AI_SECURITY_AUDIT_NOTES.md` — reproduced bugs and race conditions in Sales/Auth
5. `AI_ACCOUNTING_COMPLETION_TODO.md` — accounting-specific gaps + debit=credit test pattern

Historical reports (`CERTIFICATION_REPORT.md`, `FINAL_CTO_REPORT.md`, etc.) describe past state — trust the code over them.

---

## Commands

### Backend (Laravel 11, PHP 8.2+)

```bash
cd backend

# Dependencies
composer install

# Development
php artisan key:generate
# NOTE: Laravel's migrator is non-recursive (Migrator::getMigrationFiles uses
# glob('*_*.php')), so a bare `migrate` runs ONLY database/migrations/*.php
# (just the tenant_backups tables) — it does NOT descend into central/ or
# tenant/. Each must be run with an explicit --path:
php artisan migrate                                       # root only (tenant_backups)
php artisan migrate --path=database/migrations/central    # central: tenants, tenant_users, jobs, failed_jobs, job_batches
php artisan migrate --path=database/migrations/tenant     # tenant tables (per-tenant DB)

# Run all tests
php -c /tmp/php_test.ini vendor/bin/phpunit

# Run a single test or filter
php -c /tmp/php_test.ini vendor/bin/phpunit --filter=InvoiceTest

# Code formatting
./vendor/bin/pint
```

> **Why the custom php.ini?** The system php.ini doesn't load `fileinfo`, which breaks any `Storage::fake()`-based test with a confusing `finfo` error.

### Frontend (Next.js 14, Node 20)

```bash
cd frontend

npm install
npm run dev        # http://localhost:3000
npm run build
npm run lint

# Type-check manually (CI runs this non-blocking, but check it yourself)
npx tsc --noEmit -p . 2>&1 | grep "src/"
```

### Docker (full stack)

```bash
docker compose up -d           # dev stack: nginx, app (PHP-FPM), frontend, postgres, redis
docker compose -f docker-compose.prod.yml up -d  # production HA (3 app replicas, 2 frontend)
```

---

## Architecture

### Backend — Domain-Driven Design (strict 4 layers)

```
Domain/          → Entities + Repository interfaces (no framework deps)
Application/     → UseCases + DTOs (orchestrate domain; return entities or arrays)
Infrastructure/  → Eloquent Models + Repository implementations + external services
Presentation/    → Controllers (HTTP only; call use-cases, return JSON)
```

**Never** put business logic in controllers or Eloquent models. Route → controller → use-case → repository → database is the only valid flow.

Controller location: `app/Presentation/Controllers/API/{Domain}/{Resource}Controller.php`  
Use-case location: `app/Application/{Domain}/UseCases/{Action}UseCase.php`  
Eloquent model location: `app/Infrastructure/Eloquent/Models/{Domain}/{Model}Model.php`

### Multi-Tenancy

- **Central DB** — tenant registry, subscriptions, global config.
- **Per-tenant DB** — one PostgreSQL database per tenant, prefixed `tenant_*`.
- `TenantScope` middleware auto-filters all tenant-scoped queries — **never add manual `tenant_id` filtering** on tenant-scoped models; it either duplicates the scope or bypasses it when done via raw SQL.
- **Migration placement is critical:** tenant-scoped tables (products, invoices, customers, stock, etc.) → `database/migrations/tenant/`. Central tables → `database/migrations/`. Getting this wrong silently breaks the entire test suite without any obvious error during normal dev.
- Always run `php artisan migrate:fresh` (not just `migrate`) before trusting a new migration PR.

### Frontend

- **Routing:** Next.js App Router under `src/app/[locale]/` — all routes are locale-prefixed.
- **Server state:** TanStack React Query (fetching, caching, invalidation).
- **Client state:** Zustand stores in `src/stores/`.
- **API layer:** All HTTP calls go through `src/lib/api.ts` (Axios instance with auth token injection). Domain hooks (`src/hooks/useSales.ts`, `useAccounting.ts`, etc.) wrap React Query + api.ts.
- **Offline support:** IndexedDB via `src/lib/offline-store.ts`.
- **i18n:** next-intl; locale files in `src/i18n/`.
- **Charts:** Recharts throughout the dashboard components.

---

## Critical House Rules

### Sales / Inventory / Accounting changes

Mandatory workflow: **Audit → Design → Implement → Test → Re-audit**. Never skip a phase.

Every confirmed transaction's journal entry must satisfy `SUM(debit) == SUM(credit)`. If your change touches any of these domains and you didn't write a test asserting this invariant, you're not done. See `AI_ACCOUNTING_COMPLETION_TODO.md` for the test pattern.

Backward compatibility is a hard constraint: existing invoices, stock movements, and journal entries must remain exactly reproducible after your change.

### Atomicity & race conditions

If a feature spans more than one use-case call, verify they share a database transaction. For any check-then-update against a balance, stock level, or shared counter, use `lockForUpdate()` — an unlocked check before an update is a TOCTOU race.

### Verification before reporting done

Re-read every file you changed end-to-end (not just the diff), trace the full path from HTTP route to DB and back, run tests including negative cases and a broader regression filter, and check that data round-trips (field collected in UI → in the request payload → validated → persisted → returned on read). See `AI_VERIFICATION_PROTOCOL.md` for the full checklist.

---

## Key Configuration

| Concern | Dev default | Prod override |
|---|---|---|
| Database | PostgreSQL 15 (Docker) | RDS / Cloud SQL |
| Cache/Queue | `file` / `sync` | Redis 7 |
| File storage | `local` | S3-compatible |
| Mail | Mailpit | SMTP |
| Tenant DB prefix | `tenant_` | same |

ZATCA (Saudi VAT) compliance lives in `app/Infrastructure/Zatca/` (backend) and `src/lib/zatca-qr.ts` (frontend QR generation).

Stripe keys (`STRIPE_KEY`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`) are required for subscription billing — subscription endpoints 500 without them.

---

## Testing Patterns

Feature tests live in `backend/tests/Feature/{Domain}/`. The pattern is one test class per scenario, including explicit negative cases ("this must NOT happen"). Reference examples:

- `tests/Feature/Sales/CreditLimitEnforcementTest.php`
- `tests/Feature/Inventory/ProductFormFieldsTest.php`
- `tests/Feature/Inventory/ProductResolvePriceTest.php`

CI runs `php artisan test` (backend) and `npm run build` (frontend) on every push to `main`/`develop`. TypeScript check runs non-blocking; treat any errors in files you touched as blocking anyway.
