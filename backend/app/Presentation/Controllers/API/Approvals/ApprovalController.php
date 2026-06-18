<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Approvals;

use App\Application\Approvals\UseCases\ApproveRequestUseCase;
use App\Application\Approvals\UseCases\RejectRequestUseCase;
use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel;
use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRuleModel;
use App\Presentation\Controllers\API\BaseTenantController;
use App\Presentation\Requests\Approvals\ApprovalDecisionRequest;
use App\Presentation\Requests\Approvals\SaveApprovalRuleRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ApprovalController extends BaseTenantController
{
    public function __construct(
        private readonly ApproveRequestUseCase $approveUseCase,
        private readonly RejectRequestUseCase $rejectUseCase
    ) {}

    public function inbox(Request $request): JsonResponse
    {
        $user = auth()->user();

        $query = ApprovalRequestModel::query()->where('tenant_id', $this->getTenantId($request))->with(['requester', 'resolver', 'rule'])->where('tenant_id', $this->getTenantId($request))->orderBy('created_at', 'desc');

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by user's role mapping to rules
        if ($user && ! $user->hasRole('admin')) {
            $userRoles = $user->roles->pluck('name')->toArray();
            $query->whereHas('rule', function ($q) use ($userRoles) {
                $q->whereIn('required_role', $userRoles);
            });
        }

        $requests = $query->paginate(20);

        return $this->paginated($requests->toArray(), 'Approval requests retrieved');
    }

    public function approve(ApprovalDecisionRequest $request, string $id): JsonResponse
    {
        $validated = $request->validated();
        $approval = ApprovalRequestModel::query()->where('tenant_id', $this->getTenantId($request))->where('tenant_id', $this->getTenantId($request))->findOrFail($id);

        try {
            $this->approveUseCase->execute($id, auth()->id() ?? '', $validated['notes'] ?? '');

            return $this->success([], 'Request approved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function reject(ApprovalDecisionRequest $request, string $id): JsonResponse
    {
        $validated = $request->validated();
        $approval = ApprovalRequestModel::query()->where('tenant_id', $this->getTenantId($request))->where('tenant_id', $this->getTenantId($request))->findOrFail($id);

        try {
            $this->rejectUseCase->execute($id, auth()->id() ?? '', $validated['notes'] ?? '');

            return $this->success([], 'Request rejected successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    // Rules Management
    public function getRules(Request $request): JsonResponse
    {
        if (! auth()->user() || ! auth()->user()->hasRole('admin')) {
            return $this->error('Unauthorized to manage approval rules.', 403);
        }

        $rules = ApprovalRuleModel::query()->where('tenant_id', $this->getTenantId($request))->where('tenant_id', $this->getTenantId($request))->get();

        return $this->success($rules->toArray(), 'Rules retrieved');
    }

    public function saveRule(SaveApprovalRuleRequest $request): JsonResponse
    {
        if (! auth()->user() || ! auth()->user()->hasRole('admin')) {
            return $this->error('Unauthorized to manage approval rules.', 403);
        }

        $validated = $request->validated();

        $rule = ApprovalRuleModel::query()->updateOrCreate(
            [
                'entity_type' => $validated['entity_type'],
                'trigger_type' => $validated['trigger_type'],
                'tenant_id' => $this->getTenantId($request),
            ],
            [
                'id' => Str::uuid()->toString(),
                'threshold' => $validated['threshold'],
                'required_role' => $validated['required_role'],
                'is_active' => $validated['is_active'],
                'created_by' => auth()->id(),
            ]
        );

        return $this->success($rule->toArray(), 'Rule saved successfully');
    }
}
