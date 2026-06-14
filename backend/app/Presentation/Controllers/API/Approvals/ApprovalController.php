<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Approvals;

use App\Presentation\Controllers\API\BaseController;
use App\Application\Approvals\UseCases\ApproveRequestUseCase;
use App\Application\Approvals\UseCases\RejectRequestUseCase;
use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel;
use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRuleModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApprovalController extends BaseController
{
    public function __construct(
        private readonly ApproveRequestUseCase $approveUseCase,
        private readonly RejectRequestUseCase $rejectUseCase
    ) {}

    public function inbox(Request $request): JsonResponse
    {
        $user = auth()->user();
        
        $query = ApprovalRequestModel::with(['requester', 'resolver', 'rule'])->orderBy('created_at', 'desc');
        
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by user's role mapping to rules
        if ($user && !$user->hasRole('admin')) {
            $userRoles = $user->roles->pluck('name')->toArray();
            $query->whereHas('rule', function ($q) use ($userRoles) {
                $q->whereIn('required_role', $userRoles);
            });
        }

        $requests = $query->paginate(20);

        return $this->paginated($requests->toArray(), 'Approval requests retrieved');
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'notes' => 'nullable|string'
        ]);

        try {
            $this->approveUseCase->execute($id, auth()->id() ?? '', $validated['notes'] ?? '');
            return $this->success([], 'Request approved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function reject(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'notes' => 'nullable|string'
        ]);

        try {
            $this->rejectUseCase->execute($id, auth()->id() ?? '', $validated['notes'] ?? '');
            return $this->success([], 'Request rejected successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    // Rules Management
    public function getRules(): JsonResponse
    {
        if (!auth()->user() || !auth()->user()->hasRole('admin')) {
            return $this->error('Unauthorized to manage approval rules.', 403);
        }

        $rules = ApprovalRuleModel::all();
        return $this->success($rules->toArray(), 'Rules retrieved');
    }

    public function saveRule(Request $request): JsonResponse
    {
        if (!auth()->user() || !auth()->user()->hasRole('admin')) {
            return $this->error('Unauthorized to manage approval rules.', 403);
        }

        $validated = $request->validate([
            'entity_type' => 'required|string',
            'trigger_type' => 'required|string',
            'threshold' => 'nullable|numeric',
            'required_role' => 'required|string',
            'is_active' => 'required|boolean'
        ]);

        $rule = ApprovalRuleModel::updateOrCreate(
            [
                'entity_type' => $validated['entity_type'],
                'trigger_type' => $validated['trigger_type']
            ],
            [
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'threshold' => $validated['threshold'],
                'required_role' => $validated['required_role'],
                'is_active' => $validated['is_active'],
                'created_by' => auth()->id()
            ]
        );

        return $this->success($rule->toArray(), 'Rule saved successfully');
    }
}
