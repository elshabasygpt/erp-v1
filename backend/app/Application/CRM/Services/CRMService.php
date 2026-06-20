<?php

namespace App\Application\CRM\Services;

use App\Infrastructure\Eloquent\Models\CRM\CrmStageModel;
use App\Infrastructure\Eloquent\Models\CRM\CrmDealModel;
use Illuminate\Support\Facades\DB;

class CRMService
{
    public function __construct(
        private readonly string $tenantId
    ) {}

    public function getStagesWithDeals(): array
    {
        // Ensure default stages exist if empty
        $stagesCount = CrmStageModel::where('tenant_id', $this->tenantId)->count();
        if ($stagesCount === 0) {
            $this->seedDefaultStages();
        }

        $stages = CrmStageModel::where('tenant_id', $this->tenantId)
            ->orderBy('order_index')
            ->with(['deals' => function($q) {
                $q->with(['customer', 'assignee'])->orderBy('created_at', 'desc');
            }])
            ->get();

        return $stages->toArray();
    }

    public function createDeal(array $data): array
    {
        $data['tenant_id'] = $this->tenantId;
        $deal = CrmDealModel::create($data);
        return $deal->load(['customer', 'assignee'])->toArray();
    }

    public function moveDeal(string $dealId, string $newStageId, int $newOrderIndex): void
    {
        DB::transaction(function () use ($dealId, $newStageId, $newOrderIndex) {
            $deal = CrmDealModel::where('tenant_id', $this->tenantId)->findOrFail($dealId);
            $deal->stage_id = $newStageId;
            $deal->save();

            // We could update order_index here if we added it to crm_deals to persist exact drag-drop ordering.
            // For now, updating the stage_id is the primary Kanban movement.
        });
    }

    private function seedDefaultStages(): void
    {
        $defaults = [
            ['name' => 'Lead', 'name_ar' => 'عميل محتمل', 'color' => '#3b82f6', 'order_index' => 1],
            ['name' => 'Contacted', 'name_ar' => 'تم التواصل', 'color' => '#8b5cf6', 'order_index' => 2],
            ['name' => 'Negotiation', 'name_ar' => 'مفاوضات', 'color' => '#f59e0b', 'order_index' => 3],
            ['name' => 'Proposal Sent', 'name_ar' => 'تم إرسال العرض', 'color' => '#06b6d4', 'order_index' => 4],
            ['name' => 'Won', 'name_ar' => 'رابحة', 'color' => '#10b981', 'order_index' => 5],
            ['name' => 'Lost', 'name_ar' => 'خاسرة', 'color' => '#ef4444', 'order_index' => 6],
        ];

        foreach ($defaults as $stage) {
            CrmStageModel::create(array_merge($stage, ['tenant_id' => $this->tenantId]));
        }
    }
}
