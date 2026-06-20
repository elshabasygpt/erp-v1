<?php

declare(strict_types=1);

namespace App\Domain\Accounting\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * FiscalPeriodService
 *
 * Manages accounting periods and enforces posting date validation.
 * Prevents transactions from being posted to closed or locked periods.
 */
final class FiscalPeriodService
{
    /**
     * Validate that a posting date falls within an open fiscal period.
     * If no fiscal periods exist at all, posting is allowed (graceful default).
     *
     * @throws \DomainException if the period is closed or locked
     */
    public function validatePostingDate(\DateTimeImmutable $date): void
    {
        $dateStr = $date->format('Y-m-d');

        $period = DB::connection('tenant')
            ->table('fiscal_periods')
            ->where('start_date', '<=', $dateStr)
            ->where('end_date', '>=', $dateStr)
            ->whereNull('deleted_at')
            ->first();

        // If no period covers this date, check if any periods exist at all
        if (! $period) {
            $anyPeriods = DB::connection('tenant')
                ->table('fiscal_periods')
                ->whereNull('deleted_at')
                ->exists();

            // If no fiscal periods configured yet, allow posting (backward compatible)
            if (! $anyPeriods) {
                return;
            }

            throw new \DomainException(
                "No fiscal period found for date {$dateStr}. ".
                'Please create a fiscal period covering this date, or post to a different date.'
            );
        }

        if ($period->status === 'closed') {
            throw new \DomainException(
                "Cannot post to fiscal period '{$period->name}' ({$period->start_date} – {$period->end_date}). ".
                'The period is closed. Contact an admin to reopen it if needed.'
            );
        }

        if ($period->status === 'locked') {
            throw new \DomainException(
                "Cannot post to fiscal period '{$period->name}'. ".
                'The period is permanently locked and cannot be modified.'
            );
        }
    }

    /**
     * Close a fiscal period. Requires admin permission (checked at controller level).
     */
    public function closePeriod(string $periodId, string $userId, ?string $notes = null): void
    {
        $period = DB::connection('tenant')
            ->table('fiscal_periods')
            ->where('id', $periodId)
            ->whereNull('deleted_at')
            ->first();

        if (! $period) {
            throw new \DomainException('Fiscal period not found.');
        }

        if ($period->status !== 'open') {
            throw new \DomainException("Period '{$period->name}' is already {$period->status}.");
        }

        // --- ERP Forensic Audit Requirement: Fiscal Year Closing Validation ---
        // Ensure no draft or pending transactions exist within this period before closing
        
        $pendingInvoices = DB::connection('tenant')->table('invoices')
            ->whereBetween('invoice_date', [$period->start_date, $period->end_date])
            ->whereIn('status', ['draft', 'pending_approval'])
            ->exists();
            
        if ($pendingInvoices) {
            throw new \DomainException("Cannot close period '{$period->name}': There are draft or pending sales invoices in this period. Confirm or cancel them first.");
        }

        $pendingPurchases = DB::connection('tenant')->table('purchase_invoices')
            ->whereBetween('invoice_date', [$period->start_date, $period->end_date])
            ->whereIn('status', ['draft', 'pending_approval'])
            ->exists();
            
        if ($pendingPurchases) {
            throw new \DomainException("Cannot close period '{$period->name}': There are draft or pending purchase invoices in this period. Confirm or cancel them first.");
        }

        $unpostedJournals = DB::connection('tenant')->table('journal_entries')
            ->whereBetween('date', [$period->start_date, $period->end_date])
            ->where('is_posted', false)
            ->exists();

        if ($unpostedJournals) {
            throw new \DomainException("Cannot close period '{$period->name}': There are unposted journal entries in this period. Post or delete them first.");
        }

        $tenant = app('current_tenant'); // Ensure tenant context for updates
        $tenantId = $tenant->id ?? 'tenant_context';
        
        DB::connection('tenant')->table('fiscal_periods')
            ->where('tenant_id', $tenantId)
            ->where('id', $periodId)
            ->update([
                'status' => 'closed',
                'closed_by' => $userId,
                'closed_at' => now(),
                'close_notes' => $notes,
                'updated_at' => now(),
            ]);
    }

    /**
     * Reopen a previously closed period. Requires admin permission.
     */
    public function reopenPeriod(string $periodId, string $userId): void
    {
        $period = DB::connection('tenant')
            ->table('fiscal_periods')
            ->where('id', $periodId)
            ->whereNull('deleted_at')
            ->first();

        if (! $period) {
            throw new \DomainException('Fiscal period not found.');
        }

        if ($period->status === 'locked') {
            throw new \DomainException("Period '{$period->name}' is permanently locked and cannot be reopened.");
        }

        if ($period->status !== 'closed') {
            throw new \DomainException("Period '{$period->name}' is not closed.");
        }

        $tenant = app('current_tenant'); // Ensure tenant context for updates
        $tenantId = $tenant->id ?? 'tenant_context';
        DB::connection('tenant')->table('fiscal_periods')
            ->where('tenant_id', $tenantId)
            ->where('id', $periodId)
            ->update([
                'status' => 'open',
                'reopened_by' => $userId,
                'reopened_at' => now(),
                'updated_at' => now(),
            ]);
    }

    /**
     * Permanently lock a closed fiscal period after year-end closing is complete.
     */
    public function lockPeriod(string $periodId, string $userId): void
    {
        $period = DB::connection('tenant')
            ->table('fiscal_periods')
            ->where('id', $periodId)
            ->whereNull('deleted_at')
            ->first();

        if (! $period) {
            throw new \DomainException('Fiscal period not found.');
        }

        if ($period->status !== 'closed') {
            throw new \DomainException("Period '{$period->name}' must be closed before it can be locked.");
        }

        $tenant = app('current_tenant'); // Ensure tenant context for updates
        $tenantId = $tenant->id ?? 'tenant_context';
        DB::connection('tenant')->table('fiscal_periods')
            ->where('tenant_id', $tenantId)
            ->where('id', $periodId)
            ->update([
                'status' => 'locked',
                'updated_at' => now(),
            ]);
    }

    /**
     * Create a new fiscal period.
     */
    public function createPeriod(string $name, string $startDate, string $endDate): string
    {
        // Validate no overlapping periods
        $overlap = DB::connection('tenant')
            ->table('fiscal_periods')
            ->whereNull('deleted_at')
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('start_date', [$startDate, $endDate])
                    ->orWhereBetween('end_date', [$startDate, $endDate])
                    ->orWhere(function ($q2) use ($startDate, $endDate) {
                        $q2->where('start_date', '<=', $startDate)
                            ->where('end_date', '>=', $endDate);
                    });
            })
            ->exists();

        if ($overlap) {
            throw new \DomainException("A fiscal period already exists that overlaps with {$startDate} – {$endDate}.");
        }

        $id = Str::uuid()->toString();

        $tenantId = app('current_tenant'); // Ensure tenant context for inserts
        DB::connection('tenant')->table('fiscal_periods')->insert([
            'tenant_id' => $tenantId,
            'id' => $id,
            'name' => $name,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    /**
     * List all fiscal periods.
     */
    public function listPeriods(): array
    {
        return DB::connection('tenant')
            ->table('fiscal_periods')
            ->whereNull('deleted_at')
            ->orderBy('start_date', 'desc')
            ->get()
            ->toArray();
    }
}
