<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Infrastructure\Eloquent\Models\StockTransferModel;
use App\Domain\Inventory\Services\StockTransferService;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class StockTransferController extends BaseTenantController
{
    public function __construct(
        private StockTransferService $service
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = StockTransferModel::where('tenant_id', $this->getTenantId($request))->with(['fromWarehouse', 'toWarehouse', 'items.product']);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $transfers = $query->latest()->paginate($request->per_page ?? 15);

        return $this->success(['transfers' => $transfers]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $transfer = StockTransferModel::where('tenant_id', $this->getTenantId($request))->with(['fromWarehouse', 'toWarehouse', 'items.product'])->findOrFail($id);
        return $this->success(['transfer' => $transfer]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from_warehouse_id' => 'required|uuid|exists:tenant.warehouses,id',
            'to_warehouse_id' => 'required|uuid|exists:tenant.warehouses,id|different:from_warehouse_id',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:tenant.products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
        ]);

        $userId = $request->user()?->id ?? '';

        try {
            $transfer = $this->service->createTransfer($data, $userId);
            return $this->success(['transfer' => $transfer], 'Stock transfer created as draft.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        if (!auth()->user() || (!auth()->user()->hasRole('admin') && !auth()->user()->hasRole('manager'))) {
            return $this->error('Unauthorized. Only managers or admins can approve stock transfers.', 403);
        }

        $userId = $request->user()?->id ?? '';

        try {
            $transfer = $this->service->approveTransfer($id, $userId);
            return $this->success(['transfer' => $transfer], 'Stock transfer approved and inventory deduced.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    public function receive(Request $request, string $id): JsonResponse
    {
        if (!auth()->user() || (!auth()->user()->hasRole('admin') && !auth()->user()->hasRole('manager') && !auth()->user()->hasRole('inventory_staff'))) {
            return $this->error('Unauthorized to receive stock transfers.', 403);
        }

        $userId = $request->user()?->id ?? '';
        
        $data = $request->validate([
            'items' => 'sometimes|array',
            'items.*.id' => 'required_with:items|uuid',
            'items.*.received_quantity' => 'required_with:items|numeric|min:0',
        ]);

        try {
            $transfer = $this->service->receiveTransfer($id, $userId, $data['items'] ?? []);
            
            \App\Application\Services\Webhooks\WebhookService::dispatchForTenant(
                tenantId: (string) $this->getTenantId($request),
                event: 'stock.transfer.received',
                payload: [
                    'transfer_id'    => $transfer->id,
                    'from_warehouse' => $transfer->from_warehouse_id,
                    'to_warehouse'   => $transfer->to_warehouse_id,
                ]
            );

            return $this->success(['transfer' => $transfer], 'Stock transfer received and inventory added.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $transfer = StockTransferModel::where('tenant_id', $this->getTenantId($request))->findOrFail($id);

        if ($transfer->status !== 'draft') {
            return $this->error('Only draft transfers can be deleted. Cancel it instead.', 400);
        }

        \Illuminate\Support\Facades\Log::channel('tenant')->warning("Stock Transfer {$transfer->id} deleted by User " . (auth()->id() ?? 'system'));
        $transfer->delete();
        return $this->success(null, 'Transfer deleted completely.');
    }
}


