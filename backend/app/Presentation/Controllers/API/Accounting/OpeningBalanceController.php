<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Accounting;

use App\Domain\Accounting\Services\OpeningBalanceService;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Infrastructure\Eloquent\Models\AccountModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OpeningBalanceController extends BaseTenantController
{
    public function __construct(
        private readonly JournalEntryRepositoryInterface $journalEntryRepository,
        private readonly AccountMappingService $accountMapping,
    ) {}

    /**
     * Return all accounts with their current opening-balance journal entry totals.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        $accounts = AccountModel::query()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'name_ar', 'type']);

        // Sum opening balance journal entries per account
        $balances = JournalEntryLineModel::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
            ->where('journal_entries.tenant_id', $tenantId)
            ->where('journal_entries.reference_type', 'opening_balance')
            ->where('journal_entries.is_posted', true)
            ->selectRaw('journal_entry_lines.account_id, SUM(debit) as debit, SUM(credit) as credit')
            ->groupBy('journal_entry_lines.account_id')
            ->get()
            ->keyBy('account_id');

        $result = $accounts->map(function ($account) use ($balances) {
            $b = $balances->get($account->id);
            return [
                'account_id'   => $account->id,
                'code'         => $account->code,
                'name'         => $account->name,
                'name_ar'      => $account->name_ar,
                'type'         => $account->type,
                'debit'        => $b ? (float) $b->debit  : 0,
                'credit'       => $b ? (float) $b->credit : 0,
                'balance'      => $b ? (float) $b->debit - (float) $b->credit : 0,
            ];
        })->filter(fn($a) => $a['debit'] > 0 || $a['credit'] > 0 || true);

        return $this->success($result->values());
    }

    /**
     * Post a direct opening balance for a GL account (الرصيد الافتتاحي للحساب).
     */
    public function setAccountBalance(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'account_id' => 'required|uuid',
            'debit'      => 'required_without:credit|numeric|min:0',
            'credit'     => 'required_without:debit|numeric|min:0',
            'notes'      => 'nullable|string',
        ]);

        $tenantId = $this->getTenantId($request);
        $userId   = auth()->id() ?? '';

        $account = AccountModel::query()
            ->where('tenant_id', $tenantId)
            ->findOrFail($validated['account_id']);

        $equityAccountId = $this->accountMapping->resolve('opening_balance_equity');

        $debit  = (float) ($validated['debit']  ?? 0);
        $credit = (float) ($validated['credit'] ?? 0);

        if ($debit === 0.0 && $credit === 0.0) {
            return $this->error('Either debit or credit must be > 0', 422);
        }

        $entry = DB::connection('tenant')->transaction(function () use ($account, $tenantId, $userId, $debit, $credit, $equityAccountId, $validated) {
            $entryNumber = $this->journalEntryRepository->getNextEntryNumber();

            $je = JournalEntryModel::create([
                'id'             => \Illuminate\Support\Str::uuid()->toString(),
                'tenant_id'      => $tenantId,
                'entry_number'   => $entryNumber,
                'date'           => now()->toDateString(),
                'description'    => 'Opening Balance: ' . $account->name . ($validated['notes'] ? ' — ' . $validated['notes'] : ''),
                'is_posted'      => true,
                'reference_type' => 'opening_balance',
                'reference_id'   => $account->id,
                'created_by'     => $userId,
                'posted_by'      => $userId,
                'posted_at'      => now(),
            ]);

            // Account side
            JournalEntryLineModel::create([
                'id'               => \Illuminate\Support\Str::uuid()->toString(),
                'journal_entry_id' => $je->id,
                'account_id'       => $account->id,
                'debit'            => $debit,
                'credit'           => $credit,
                'description'      => 'Opening balance',
            ]);

            // Equity contra side
            JournalEntryLineModel::create([
                'id'               => \Illuminate\Support\Str::uuid()->toString(),
                'journal_entry_id' => $je->id,
                'account_id'       => $equityAccountId,
                'debit'            => $credit,   // opposite
                'credit'           => $debit,
                'description'      => 'Opening balance equity',
            ]);

            return $je;
        });

        return $this->success($entry, 'Opening balance posted', 201);
    }

    /**
     * Customer opening balance — delegates to domain service.
     */
    public function setCustomerBalance(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'required|uuid',
            'amount'      => 'required|numeric',
        ]);

        $service = new OpeningBalanceService($this->journalEntryRepository, $this->accountMapping);

        try {
            $service->setCustomerOpeningBalance(
                $this->getTenantId($request),
                $validated['customer_id'],
                (float) $validated['amount'],
                auth()->id() ?? ''
            );
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success(null, 'Customer opening balance posted', 201);
    }

    /**
     * Supplier opening balance — delegates to domain service.
     */
    public function setSupplierBalance(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|uuid',
            'amount'      => 'required|numeric',
        ]);

        $service = new OpeningBalanceService($this->journalEntryRepository, $this->accountMapping);

        try {
            $service->setSupplierOpeningBalance(
                $this->getTenantId($request),
                $validated['supplier_id'],
                (float) $validated['amount'],
                auth()->id() ?? ''
            );
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success(null, 'Supplier opening balance posted', 201);
    }
}
