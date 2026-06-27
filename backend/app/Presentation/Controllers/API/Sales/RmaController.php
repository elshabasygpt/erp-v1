<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Application\Sales\UseCases\RMA\ApproveRmaRequestUseCase;
use App\Application\Sales\UseCases\RMA\CreateRmaRequestUseCase;
use App\Application\Sales\UseCases\RMA\FulfillRmaRequestUseCase;
use App\Application\Sales\UseCases\RMA\RejectRmaRequestUseCase;
use App\Infrastructure\Eloquent\Models\RMA\RmaRequestModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RmaController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $limit    = (int) $request->query('limit', '20');

        $query = RmaRequestModel::query()
            ->where('tenant_id', $tenantId)
            ->with(['customer:id,name,phone', 'creator:id,name'])
            ->withCount('items')
            ->orderByDesc('created_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($customerId = $request->query('customer_id')) {
            $query->where('customer_id', $customerId);
        }

        if ($returnType = $request->query('return_type')) {
            $query->where('return_type', $returnType);
        }

        return $this->paginated($query->paginate($limit)->toArray(), 'RMA requests retrieved');
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $rma = RmaRequestModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->with(['items.product:id,name,sku', 'customer:id,name,phone', 'invoice:id,invoice_number', 'creator:id,name', 'reviewer:id,name'])
            ->findOrFail($id);

        return $this->success($rma->toArray(), 'RMA request details retrieved');
    }

    public function store(Request $request, CreateRmaRequestUseCase $useCase): JsonResponse
    {
        $reasonCategories = implode(',', RmaRequestModel::REASON_CATEGORIES);

        $validated = $request->validate([
            'customer_id'                   => 'required|uuid|exists:tenant.customers,id',
            'invoice_id'                    => [
                'nullable', 'uuid',
                Rule::exists('tenant.invoices', 'id')
                    ->where('customer_id', $request->input('customer_id')),
            ],
            'return_type'                   => 'required|in:sales_return,core_return',
            'reason_category'               => "required|in:{$reasonCategories}",
            'reason_details'                => 'nullable|string|max:1000',
            'expected_refund_value'         => 'nullable|numeric|min:0',
            'notes'                         => 'nullable|string|max:1000',
            'items'                         => 'required|array|min:1',
            'items.*.product_id'            => 'required|uuid|exists:tenant.products,id',
            'items.*.quantity'              => 'required|numeric|min:0.01',
            'items.*.reason_note'           => 'nullable|string|max:500',
        ]);

        try {
            $rma = $useCase->execute(
                $this->getTenantId($request),
                auth()->id() ?? '',
                $validated
            );

            return $this->success($rma->toArray(), 'RMA request created successfully', 201);
        } catch (\Exception $e) {
            return $this->error('Failed to create RMA request: ' . $e->getMessage(), 422);
        }
    }

    public function approve(Request $request, string $id, ApproveRmaRequestUseCase $useCase): JsonResponse
    {
        $validated = $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        try {
            $rma = $useCase->execute(
                $id,
                $this->getTenantId($request),
                auth()->id() ?? '',
                $validated['notes'] ?? null
            );

            return $this->success($rma->toArray(), 'RMA request approved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function reject(Request $request, string $id, RejectRmaRequestUseCase $useCase): JsonResponse
    {
        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        try {
            $rma = $useCase->execute(
                $id,
                $this->getTenantId($request),
                auth()->id() ?? '',
                $validated['rejection_reason']
            );

            return $this->success($rma->toArray(), 'RMA request rejected');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function fulfill(Request $request, string $id, FulfillRmaRequestUseCase $useCase): JsonResponse
    {
        $validated = $request->validate([
            'reference_type' => 'required|in:sales_return,customer_core_return',
            'reference_id'   => 'required|uuid',
        ]);

        try {
            $rma = $useCase->execute(
                $id,
                $this->getTenantId($request),
                $validated['reference_type'],
                $validated['reference_id']
            );

            return $this->success($rma->toArray(), 'RMA request fulfilled successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function markUnderReview(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $validated = $request->validate(['notes' => 'nullable|string|max:500']);

        try {
            DB::connection('tenant')->transaction(function () use ($tenantId, $id, $validated) {
                $rma = RmaRequestModel::query()
                    ->where('tenant_id', $tenantId)
                    ->lockForUpdate()
                    ->findOrFail($id);

                if ($rma->status !== RmaRequestModel::STATUS_SUBMITTED) {
                    throw new \DomainException("RMA {$rma->rma_number} can only move to under_review from submitted (current: '{$rma->status}').");
                }

                $updates = ['status' => RmaRequestModel::STATUS_UNDER_REVIEW];
                if (! empty($validated['notes'])) {
                    $updates['notes'] = trim(($rma->notes ?? '') . "\n[Review Note] " . $validated['notes']);
                }
                $rma->update($updates);
            });
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success([], 'RMA request marked as under review');
    }

    public function cancel(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        try {
            DB::connection('tenant')->transaction(function () use ($tenantId, $id) {
                $rma = RmaRequestModel::query()
                    ->where('tenant_id', $tenantId)
                    ->lockForUpdate()
                    ->findOrFail($id);

                $cancellable = [
                    RmaRequestModel::STATUS_SUBMITTED,
                    RmaRequestModel::STATUS_UNDER_REVIEW,
                    RmaRequestModel::STATUS_APPROVED,
                ];

                if (! in_array($rma->status, $cancellable, true)) {
                    throw new \DomainException("RMA {$rma->rma_number} cannot be cancelled from status '{$rma->status}'.");
                }

                $rma->update(['status' => RmaRequestModel::STATUS_CANCELLED]);
            });
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success([], 'RMA request cancelled');
    }

    /** Return all valid reason categories for frontend dropdowns. */
    public function reasonCategories(): JsonResponse
    {
        $data = array_map(
            fn($value, $label) => ['value' => $value, 'label' => $label],
            array_keys(RmaRequestModel::REASON_LABELS),
            array_values(RmaRequestModel::REASON_LABELS)
        );

        return $this->success($data, 'Reason categories retrieved');
    }
}
