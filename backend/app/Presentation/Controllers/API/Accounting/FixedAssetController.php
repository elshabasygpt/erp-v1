<?php

namespace App\Presentation\Controllers\API\Accounting;

use App\Application\Accounting\UseCases\PostAssetDepreciationUseCase;
use App\Infrastructure\Eloquent\Models\FixedAssetDepreciationEntryModel;
use App\Infrastructure\Eloquent\Models\FixedAssetModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\Request;

class FixedAssetController extends BaseTenantController
{
    public function index(Request $request)
    {
        $assets = FixedAssetModel::query()->where(['tenant_id' => $this->getTenantId($request)])->with('account')->latest()->get();

        return $this->success($assets);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string',
            'purchase_date' => 'required|date',
            'purchase_cost' => 'required|numeric|min:0',
            'salvage_value' => 'nullable|numeric|min:0',
            'useful_life_years' => 'required|integer|min:1',
            'account_id' => 'nullable|exists:tenant.accounts,id',
            'depreciation_account_id' => 'nullable|exists:tenant.accounts,id',
            'expense_account_id' => 'nullable|exists:tenant.accounts,id',
            'notes' => 'nullable|string',
        ]);

        $validated['salvage_value'] = $validated['salvage_value'] ?? 0;
        $validated['current_value'] = $validated['purchase_cost'];
        $validated['accumulated_depreciation'] = 0;

        $validated['tenant_id'] = $this->getTenantId($request);
        $asset = FixedAssetModel::query()->create($validated);

        return $this->success($asset, 'Fixed asset created successfully', 201);
    }

    public function show(Request $request, $id)
    {
        $asset = FixedAssetModel::query()->where(['tenant_id' => $this->getTenantId($request)])->with('account')->findOrFail($id);

        return $this->success($asset);
    }

    public function update(Request $request, $id)
    {
        $asset = FixedAssetModel::query()->where(['tenant_id' => $this->getTenantId($request)])->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string',
            'status' => 'sometimes|required|in:active,disposed,sold',
            'account_id' => 'nullable|exists:tenant.accounts,id',
            'depreciation_account_id' => 'nullable|exists:tenant.accounts,id',
            'expense_account_id' => 'nullable|exists:tenant.accounts,id',
            'notes' => 'nullable|string',
        ]);

        $asset->update($validated);

        return $this->success($asset, 'Fixed asset updated successfully');
    }

    public function destroy(Request $request, $id)
    {
        $asset = FixedAssetModel::query()->where(['tenant_id' => $this->getTenantId($request)])->findOrFail($id);
        $asset->delete();

        return $this->success(null, 'Fixed asset deleted successfully');
    }

    public function calculateDepreciation(Request $request, $id, PostAssetDepreciationUseCase $useCase)
    {
        $asset = FixedAssetModel::query()->where(['tenant_id' => $this->getTenantId($request)])->findOrFail($id);

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

    public function depreciationSchedule(Request $request, $id)
    {
        $asset = FixedAssetModel::query()->where(['tenant_id' => $this->getTenantId($request)])->findOrFail($id);

        $entries = FixedAssetDepreciationEntryModel::query()
            ->where('fixed_asset_id', $asset->id)
            ->orderBy('period_end')
            ->get();

        return $this->success($entries);
    }
}
