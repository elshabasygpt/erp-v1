<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Application\Sales\DTOs\CreateSalesOrderDTO;
use App\Application\Sales\UseCases\SalesOrders\CreateSalesOrderUseCase;
use App\Application\Sales\UseCases\SalesOrders\FulfillSalesOrderUseCase;
use App\Domain\Sales\Services\SalesOrderService;
use App\Infrastructure\Eloquent\Models\SalesOrderModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesOrderController extends BaseTenantController
{
    public function __construct(
        private readonly CreateSalesOrderUseCase $createSalesOrderUseCase,
        private readonly FulfillSalesOrderUseCase $fulfillSalesOrderUseCase,
        private readonly SalesOrderService $salesOrderService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $status = $request->query('status');

        $query = SalesOrderModel::query()->where('tenant_id', $this->getTenantId($request))->with(['customer', 'warehouse', 'creator'])->orderBy('issue_date', 'desc');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where('so_number', 'like', "%{$search}%");
        }

        $salesOrders = $query->paginate((int) $limit);

        return $this->paginated($salesOrders->toArray(), 'Sales Orders retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'required|uuid|exists:customers,id',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'quotation_id' => 'nullable|uuid|exists:quotations,id',
            'delivery_date' => 'nullable|date',
            'status' => 'required|string|in:draft,approved',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.vat_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        try {
            $validated['tenant_id'] = $this->getTenantId($request);
            $dto = CreateSalesOrderDTO::fromRequest($validated);
            $salesOrder = $this->createSalesOrderUseCase->execute($dto, auth()->id() ?? '');

            return $this->created($salesOrder->toArray(), 'Sales Order created successfully');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Sales Order creation failed: '.$e->getMessage());

            return $this->error('Failed to create sales order: '.$e->getMessage(), 500);
        }
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $salesOrder = SalesOrderModel::query()->where('tenant_id', $this->getTenantId($request))->with(['items.product', 'customer', 'warehouse', 'quotation'])->find($id);

        if (! $salesOrder) {
            return $this->error('Sales Order not found', 404);
        }

        return $this->success($salesOrder->toArray(), 'Sales Order details');
    }

    public function fulfill(Request $request, string $id): JsonResponse
    {
        try {
            $invoice = $this->fulfillSalesOrderUseCase->execute($id, auth()->id() ?? '');

            return $this->success(
                $invoice->toArray(),
                'Sales order fulfilled successfully and invoice created',
                201
            );
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Sales Order fulfillment failed: '.$e->getMessage());

            return $this->error('Failed to fulfill sales order: '.$e->getMessage(), 500);
        }
    }

    public function cancel(Request $request, string $id): JsonResponse
    {
        try {
            $salesOrder = $this->salesOrderService->cancelOrder($this->getTenantId($request), $id);

            return $this->success($salesOrder->toArray(), 'Sales Order cancelled and stock released.');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Failed to cancel sales order: '.$e->getMessage(), 500);
        }
    }
}
