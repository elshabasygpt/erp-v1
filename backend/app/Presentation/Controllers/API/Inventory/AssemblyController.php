<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Application\Inventory\UseCases\ConfirmAssemblyUseCase;
use App\Infrastructure\Eloquent\Models\ProductComponentModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssemblyController extends BaseTenantController
{
    public function __construct(
        private readonly ConfirmAssemblyUseCase $confirmAssemblyUseCase,
    ) {}

    // BOM Management
    public function getComponents(Request $request, $productId): JsonResponse
    {
        $components = ProductComponentModel::query()->where('tenant_id', $this->getTenantId($request))->with('component')
            ->where('parent_product_id', $productId)
            ->get();

        return $this->success($components->toArray());
    }

    public function setComponents(Request $request, $productId): JsonResponse
    {
        $validated = $request->validate([
            'components' => 'present|array',
            'components.*.child_product_id' => 'required|uuid|exists:tenant.products,id',
            'components.*.quantity_required' => 'required|numeric|min:0.001',
        ]);

        ProductModel::query()->where('tenant_id', $this->getTenantId($request))->findOrFail($productId);

        DB::connection('tenant')->beginTransaction();
        try {
            // Delete old components
            ProductComponentModel::query()->where('parent_product_id', $productId)->delete();

            $inserted = [];
            foreach ($validated['components'] as $comp) {
                // Prevent self-loop
                if ($comp['child_product_id'] === $productId) {
                    continue;
                }

                $inserted[] = ProductComponentModel::query()->create([
                    'tenant_id' => $this->getTenantId($request),
                    'parent_product_id' => $productId,
                    'child_product_id' => $comp['child_product_id'],
                    'quantity_required' => $comp['quantity_required'],
                ]);
            }
            DB::connection('tenant')->commit();

            return $this->success($inserted, 'BOM updated successfully.');
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();

            return $this->error('Failed to update components: '.$e->getMessage(), 500);
        }
    }

    // Assembly Execution
    public function assemble(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|uuid|exists:tenant.products,id',
            'warehouse_id' => 'required|uuid|exists:tenant.warehouses,id',
            'quantity' => 'required|numeric|min:0.001',
            'type' => 'required|in:assemble,disassemble', // assemble = +product, -raw // disassemble = -product, +raw
            'notes' => 'nullable|string',
        ]);

        try {
            $ref = $this->confirmAssemblyUseCase->execute(
                $this->getTenantId($request),
                $validated['warehouse_id'],
                $validated['product_id'],
                (float) $validated['quantity'],
                $validated['type'],
                $validated['notes'] ?? null,
                (string) ($request->user()->id ?? '')
            );

            return $this->success(['reference' => $ref], 'Product '.$validated['type'].' processed successfully.', 201);
        } catch (\Throwable $e) {
            return $this->error($e->getMessage(), 400);
        }
    }
}
