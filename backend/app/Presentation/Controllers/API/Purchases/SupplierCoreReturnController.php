<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Purchases;

use App\Application\Purchases\UseCases\CoreReturns\CreateCoreReturnUseCase;
use App\Application\Purchases\UseCases\CoreReturns\ShipCoreReturnUseCase;
use App\Application\Purchases\UseCases\CoreReturns\CreditCoreReturnUseCase;
use App\Infrastructure\Eloquent\Models\SupplierCoreReturnModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierCoreReturnController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $status = $request->query('status');

        $query = SupplierCoreReturnModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->with(['supplier', 'creator'])
            ->orderBy('created_at', 'desc');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $returns = $query->paginate((int) $limit);

        return $this->paginated($returns->toArray(), 'Core returns retrieved successfully');
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $coreReturn = SupplierCoreReturnModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->with(['supplier', 'creator', 'items.product', 'warehouse'])
            ->findOrFail($id);

        return $this->success($coreReturn->toArray(), 'Core return details retrieved');
    }

    public function store(Request $request, CreateCoreReturnUseCase $useCase): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|uuid|exists:tenant.suppliers,id',
            'warehouse_id' => 'required|uuid|exists:tenant.warehouses,id',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:tenant.products,id',
            'items.*.quantity' => 'required|numeric|min:1',
            'items.*.core_value' => 'required|numeric|min:0',
        ]);

        try {
            $coreReturn = $useCase->execute(
                $this->getTenantId($request),
                auth()->id() ?? '',
                $validated
            );

            return $this->success($coreReturn->toArray(), 'Core return created successfully', 201);
        } catch (\Exception $e) {
            return $this->error('Failed to create core return: ' . $e->getMessage(), 422);
        }
    }

    public function ship(Request $request, string $id, ShipCoreReturnUseCase $useCase): JsonResponse
    {
        try {
            $useCase->execute($id, $this->getTenantId($request));
            return $this->success([], 'Core return marked as shipped and inventory deducted successfully.');
        } catch (\Exception $e) {
            return $this->error('Failed to ship core return: ' . $e->getMessage(), 422);
        }
    }

    public function credit(Request $request, string $id, CreditCoreReturnUseCase $useCase): JsonResponse
    {
        $validated = $request->validate([
            'credit_note_number' => 'nullable|string', // Optional reference from supplier
        ]);

        try {
            $useCase->execute($id, $this->getTenantId($request), auth()->id() ?? '', $validated['credit_note_number'] ?? null);
            return $this->success([], 'Core return credited by supplier successfully.');
        } catch (\Exception $e) {
            return $this->error('Failed to credit core return: ' . $e->getMessage(), 422);
        }
    }
}
