<?php

namespace App\Presentation\Controllers\API\Accounting;

use App\Application\Accounting\UseCases\PostAssetDepreciationUseCase;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Infrastructure\Eloquent\Models\FixedAssetDepreciationEntryModel;
use App\Infrastructure\Eloquent\Models\FixedAssetModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FixedAssetController extends BaseTenantController
{
    public function __construct(
        private readonly AccountMappingService $accountMapping
    ) {}

    public function index(Request $request): JsonResponse
    {
        $assets = FixedAssetModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->with('account')
            ->latest()
            ->get();

        return $this->success($assets);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'                   => 'required|string|max:255',
            'name_ar'                => 'nullable|string|max:255',
            'serial_number'          => 'nullable|string',
            'purchase_date'          => 'required|date',
            'purchase_cost'          => 'required|numeric|min:0',
            'salvage_value'          => 'nullable|numeric|min:0',
            'useful_life_years'      => 'required|integer|min:1',
            'depreciation_method'    => 'nullable|in:straight_line,declining_balance,sum_of_years_digits',
            'account_id'             => 'nullable|exists:tenant.accounts,id',
            'depreciation_account_id'=> 'nullable|exists:tenant.accounts,id',
            'expense_account_id'     => 'nullable|exists:tenant.accounts,id',
            'notes'                  => 'nullable|string',
        ]);

        $validated['salvage_value']            = $validated['salvage_value'] ?? 0;
        $validated['current_value']            = $validated['purchase_cost'];
        $validated['accumulated_depreciation'] = 0;
        $validated['tenant_id']                = $this->getTenantId($request);

        $asset = FixedAssetModel::query()->create($validated);

        return $this->success($asset, 'Fixed asset created successfully', 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $asset = FixedAssetModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->with('account')
            ->findOrFail($id);

        return $this->success($asset);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $asset = FixedAssetModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->findOrFail($id);

        $validated = $request->validate([
            'name'                   => 'sometimes|required|string|max:255',
            'name_ar'                => 'nullable|string|max:255',
            'serial_number'          => 'nullable|string',
            'account_id'             => 'nullable|exists:tenant.accounts,id',
            'depreciation_account_id'=> 'nullable|exists:tenant.accounts,id',
            'expense_account_id'     => 'nullable|exists:tenant.accounts,id',
            'notes'                  => 'nullable|string',
        ]);

        $asset->update($validated);

        return $this->success($asset, 'Fixed asset updated successfully');
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $asset = FixedAssetModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->findOrFail($id);

        if ($asset->status !== 'active') {
            return $this->error('Only active assets can be deleted. Dispose or sell the asset first.', 422);
        }

        $asset->delete();

        return $this->success(null, 'Fixed asset deleted successfully');
    }

    public function calculateDepreciation(Request $request, $id, PostAssetDepreciationUseCase $useCase): JsonResponse
    {
        $asset = FixedAssetModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->findOrFail($id);

        if ($asset->status !== 'active') {
            return $this->error('Asset is not active', 400);
        }

        try {
            $entry = $useCase->execute($asset, new \DateTimeImmutable, auth()->id() ?? null);
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 400);
        }

        if ($entry === null) {
            return $this->success($asset->refresh(), 'No depreciation due for this period');
        }

        return $this->success($asset->refresh(), 'Depreciation posted successfully');
    }

    public function depreciationSchedule(Request $request, $id): JsonResponse
    {
        $asset = FixedAssetModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->findOrFail($id);

        $entries = FixedAssetDepreciationEntryModel::query()
            ->where('fixed_asset_id', $asset->id)
            ->orderBy('period_end')
            ->get();

        return $this->success($entries);
    }

    /**
     * Dispose or sell a fixed asset.
     * Creates GL entry: removes asset cost, removes accumulated depreciation,
     * records proceeds, and posts gain/loss on disposal.
     */
    public function dispose(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'disposal_date'   => 'required|date',
            'disposal_type'   => 'required|in:sold,disposed,written_off',
            'sale_proceeds'   => 'nullable|numeric|min:0',
            'cash_account_id' => 'nullable|uuid|exists:tenant.accounts,id',
            'notes'           => 'nullable|string',
        ]);

        $asset    = FixedAssetModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->findOrFail($id);

        if ($asset->status !== 'active') {
            return $this->error('Asset is already disposed or sold.', 422);
        }

        try {
            DB::connection('tenant')->beginTransaction();

            $tenantId      = (string) $this->getTenantId($request);
            $bookValue     = (float) $asset->current_value;
            $purchaseCost  = (float) $asset->purchase_cost;
            $accumDepr     = (float) $asset->accumulated_depreciation;
            $proceeds      = (float) ($validated['sale_proceeds'] ?? 0);
            $gainLoss      = $proceeds - $bookValue;

            $count       = JournalEntryModel::count() + 1;
            $entryNumber = 'JE-DISP-' . date('Y') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

            $je = JournalEntryModel::create([
                'id'             => Str::uuid()->toString(),
                'tenant_id'      => $tenantId,
                'entry_number'   => $entryNumber,
                'date'           => $validated['disposal_date'],
                'description'    => 'Asset Disposal: ' . $asset->name . ' (' . $validated['disposal_type'] . ')',
                'reference_type' => 'fixed_asset_disposal',
                'reference_id'   => $asset->id,
                'is_posted'      => true,
                'created_by'     => auth()->id(),
            ]);

            $assetAccountId  = $asset->account_id    ?? $this->accountMapping->resolve('inventory');
            $accumDeprAccId  = $asset->depreciation_account_id ?? $this->accountMapping->resolve('accumulated_depreciation');
            $gainLossAccId   = $this->accountMapping->resolve('asset_disposal_gain_loss');
            $cashAccountId   = $validated['cash_account_id'] ?? $this->accountMapping->resolve('cash');

            // 1. Remove asset cost (Credit asset account)
            JournalEntryLineModel::create([
                'id'               => Str::uuid()->toString(),
                'tenant_id'        => $tenantId,
                'journal_entry_id' => $je->id,
                'account_id'       => $assetAccountId,
                'debit'            => 0,
                'credit'           => $purchaseCost,
                'description'      => 'Remove asset cost',
            ]);

            // 2. Remove accumulated depreciation (Debit accumulated depreciation)
            if ($accumDepr > 0) {
                JournalEntryLineModel::create([
                    'id'               => Str::uuid()->toString(),
                    'tenant_id'        => $tenantId,
                    'journal_entry_id' => $je->id,
                    'account_id'       => $accumDeprAccId,
                    'debit'            => $accumDepr,
                    'credit'           => 0,
                    'description'      => 'Remove accumulated depreciation',
                ]);
            }

            // 3. Record cash proceeds (Debit cash if sold)
            if ($proceeds > 0) {
                JournalEntryLineModel::create([
                    'id'               => Str::uuid()->toString(),
                    'tenant_id'        => $tenantId,
                    'journal_entry_id' => $je->id,
                    'account_id'       => $cashAccountId,
                    'debit'            => $proceeds,
                    'credit'           => 0,
                    'description'      => 'Proceeds from asset disposal',
                ]);
            }

            // 4. Record gain or loss
            if (abs($gainLoss) > 0.001) {
                JournalEntryLineModel::create([
                    'id'               => Str::uuid()->toString(),
                    'tenant_id'        => $tenantId,
                    'journal_entry_id' => $je->id,
                    'account_id'       => $gainLossAccId,
                    'debit'            => $gainLoss < 0 ? abs($gainLoss) : 0,  // loss = debit
                    'credit'           => $gainLoss > 0 ? $gainLoss : 0,        // gain = credit
                    'description'      => $gainLoss >= 0 ? 'Gain on disposal' : 'Loss on disposal',
                ]);
            }

            // Mark asset as disposed
            $asset->update([
                'status'        => $validated['disposal_type'] === 'sold' ? 'sold' : 'disposed',
                'current_value' => 0,
                'notes'         => $validated['notes'] ?? $asset->notes,
            ]);

            DB::connection('tenant')->commit();

            return $this->success([
                'asset'         => $asset->fresh(),
                'journal_entry' => $je->load('lines'),
                'book_value'    => round($bookValue, 2),
                'proceeds'      => round($proceeds, 2),
                'gain_loss'     => round($gainLoss, 2),
                'gain_or_loss'  => $gainLoss >= 0 ? 'gain' : 'loss',
            ], 'Asset disposed successfully');
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return $this->error('Failed to dispose asset: ' . $e->getMessage(), 500);
        }
    }
}
