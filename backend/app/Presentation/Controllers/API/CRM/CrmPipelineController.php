<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\CRM;

use App\Infrastructure\Eloquent\Models\DealModel;
use App\Infrastructure\Eloquent\Models\PipelineStageModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmPipelineController extends BaseTenantController
{
    /** Seeded the first time a tenant opens the pipeline so the board isn't empty. */
    private const DEFAULT_STAGES = [
        ['name' => 'Lead', 'name_ar' => 'عميل محتمل', 'color' => '#94a3b8'],
        ['name' => 'Contacted', 'name_ar' => 'تم التواصل', 'color' => '#3b82f6'],
        ['name' => 'Proposal', 'name_ar' => 'عرض سعر', 'color' => '#a855f7'],
        ['name' => 'Won', 'name_ar' => 'تم الكسب', 'color' => '#22c55e'],
        ['name' => 'Lost', 'name_ar' => 'خسارة', 'color' => '#ef4444'],
    ];

    /** GET /crm/pipeline/stages — stages (ordered) with their nested deals. */
    public function stages(Request $request): JsonResponse
    {
        if (PipelineStageModel::query()->count() === 0) {
            foreach (self::DEFAULT_STAGES as $i => $stage) {
                PipelineStageModel::query()->create($stage + ['order_index' => $i, 'is_active' => true]);
            }
        }

        $stages = PipelineStageModel::query()
            ->with('deals')
            ->orderBy('order_index')
            ->get();

        return $this->success($stages, 'Pipeline retrieved');
    }

    /** POST /crm/pipeline/deals — create a deal, appended to the end of its stage. */
    public function storeDeal(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'stage_id' => 'required|uuid|exists:tenant.pipeline_stages,id',
            'title' => 'required|string|max:255',
            'expected_value' => 'nullable|numeric|min:0',
            'customer_id' => 'nullable|uuid|exists:tenant.customers,id',
        ]);

        $nextOrder = (int) DealModel::query()->where('stage_id', $validated['stage_id'])->max('order_index');

        $deal = DealModel::query()->create([
            'stage_id' => $validated['stage_id'],
            'title' => $validated['title'],
            'expected_value' => $validated['expected_value'] ?? 0,
            'customer_id' => $validated['customer_id'] ?? null,
            'status' => 'open',
            'order_index' => $nextOrder + 1,
        ]);

        return $this->success($deal, 'Deal created', 201);
    }

    /** PUT /crm/pipeline/deals/{id}/move — move a deal to another stage/position. */
    public function moveDeal(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'new_stage_id' => 'required|uuid|exists:tenant.pipeline_stages,id',
            'new_order_index' => 'required|integer|min:0',
        ]);

        $deal = DealModel::query()->find($id);
        if (! $deal) {
            return $this->error('Deal not found', 404);
        }

        $deal->update([
            'stage_id' => $validated['new_stage_id'],
            'order_index' => $validated['new_order_index'],
        ]);

        return $this->success($deal, 'Deal moved');
    }
}
