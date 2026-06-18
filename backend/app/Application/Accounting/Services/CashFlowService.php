<?php

declare(strict_types=1);

namespace App\Application\Accounting\Services;

use App\Domain\Accounting\Services\AccountMappingService;
use Illuminate\Support\Facades\DB;

final class CashFlowService
{
    public function __construct(
        private readonly AccountMappingService $accountMapping
    ) {}

    public function generateCashFlowStatement(\DateTimeImmutable $from, \DateTimeImmutable $to, string $tenantId): array
    {
        $cashAccountId = $this->accountMapping->resolve('cash');
        $bankAccountId = $this->accountMapping->resolve('bank');
        $cashAccounts = [$cashAccountId, $bankAccountId];

        // Identify all transactions that hit the cash or bank accounts
        // And group them by reference_type or opposite account
        $cashLines = DB::connection('tenant')->table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.tenant_id', $tenantId)
            ->whereIn('journal_entry_lines.account_id', $cashAccounts)
            ->where('journal_entries.is_posted', true)
            ->whereBetween('journal_entries.date', [$from->format('Y-m-d'), $to->format('Y-m-d')])
            ->selectRaw('journal_entries.reference_type, SUM(journal_entry_lines.debit) as inflow, SUM(journal_entry_lines.credit) as outflow')
            ->groupBy('journal_entries.reference_type')
            ->get();

        $operatingActivities = [];
        $investingActivities = [];
        $financingActivities = [];

        $totalInflow = 0;
        $totalOutflow = 0;

        foreach ($cashLines as $line) {
            $inflow = (float) $line->inflow;
            $outflow = (float) $line->outflow;

            $totalInflow += $inflow;
            $totalOutflow += $outflow;

            $net = $inflow - $outflow;
            $type = $line->reference_type ?? 'other';

            // Very simple mapping to activities
            // We could be more precise but this illustrates the concept
            if (in_array($type, ['sales_invoice', 'supplier_payment', 'expense', 'customer_payment'])) {
                $operatingActivities[] = ['type' => $type, 'amount' => $net];
            } elseif ($type === 'fixed_asset_purchase') {
                $investingActivities[] = ['type' => $type, 'amount' => $net];
            } else {
                // Everything else into operating for now
                $operatingActivities[] = ['type' => $type, 'amount' => $net];
            }
        }

        return [
            'period' => ['from' => $from->format('Y-m-d'), 'to' => $to->format('Y-m-d')],
            'operating_activities' => $operatingActivities,
            'investing_activities' => $investingActivities,
            'financing_activities' => $financingActivities,
            'net_cash_flow' => $totalInflow - $totalOutflow,
            'total_inflow' => $totalInflow,
            'total_outflow' => $totalOutflow,
        ];
    }
}
