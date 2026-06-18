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
