<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Application\Sales\DTOs\Returns\ProcessSalesReturnDTO;
use App\Application\Sales\UseCases\Returns\ProcessSalesReturnUseCase;
use App\Infrastructure\Eloquent\Models\SalesReturnModel;
use App\Presentation\Controllers\API\BaseTenantController;
use App\Application\Sales\UseCases\ConfirmSalesReturnUseCase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesReturnController extends BaseTenantController
{
    public function __construct(
        private readonly ProcessSalesReturnUseCase $processSalesReturnUseCase
    ) {}

    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $status = $request->query('status');

        $query = SalesReturnModel::query()->where('tenant_id', $this->getTenantId($request))->with(['customer', 'invoice', 'items.product', 'creator'])->orderBy('return_date', 'desc');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $returns = $query->paginate((int) $limit);

        return $this->paginated($returns->toArray(), 'Sales returns retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_id' => 'required|uuid|exists:invoices,id',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'customer_id' => 'required|uuid|exists:customers,id',
            'return_type' => 'required|string|in:full,partial,line_return',
            'refund_method' => 'required|string|in:store_credit,cash,card,bank_transfer',
            'reason' => 'nullable|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.condition' => 'nullable|string|in:good,damaged',
            'offline_id' => 'nullable|string',
        ]);

        try {
            $tenantId = $this->getTenantId($request);

            // Idempotency Check for offline sync
            if (!empty($validated['offline_id'])) {
                $existing = SalesReturnModel::where('tenant_id', $tenantId)
                    ->where('offline_id', $validated['offline_id'])
                    ->first();
                if ($existing) {
                    return $this->success(['id' => $existing->id], 'Sales Return already synced', 200);
                }
            }

            $dto = ProcessSalesReturnDTO::fromRequest($validated);
            $salesReturn = $this->processSalesReturnUseCase->execute($dto, auth()->id() ?? '');

            // Update offline_id if provided
            if (!empty($validated['offline_id'])) {
                SalesReturnModel::where('id', $salesReturn->getId())->update(['offline_id' => $validated['offline_id']]);
            }

            return $this->created($salesReturn->toArray(), 'Sales return processed successfully');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Sales Return failed: '.$e->getMessage());

            return $this->error('Failed to process sales return: '.$e->getMessage(), 500);
        }
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $salesReturn = SalesReturnModel::query()->where('tenant_id', $this->getTenantId($request))->with(['items.product', 'customer', 'invoice', 'creator'])->find($id);

        if (! $salesReturn) {
            return $this->error('Sales return not found', 404);
        }

        return $this->success($salesReturn->toArray(), 'Sales return retrieved successfully');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $salesReturn = SalesReturnModel::query()->where('tenant_id', $this->getTenantId($request))->find($id);

        if (! $salesReturn) {
            return $this->error('Sales return not found', 404);
        }

        if ($salesReturn->status === 'pending_approval' || $salesReturn->approval_status === 'pending') {
            return $this->error('Cannot manually update status. This return requires approval.', 403);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:draft,completed,cancelled',
        ]);

        if ($salesReturn->status !== 'completed' && $validated['status'] === 'completed') {
            try {
                $confirmUseCase = app(ConfirmSalesReturnUseCase::class);
                $confirmUseCase->execute($salesReturn->id, auth()->id() ?? '');
                $salesReturn->refresh();
            } catch (\Exception $e) {
                return $this->error('Failed to confirm sales return: ' . $e->getMessage(), 422);
            }
        } else {
            $salesReturn->update($validated);
        }

        return $this->success($salesReturn->toArray(), 'Sales return status updated successfully');
    }
}
