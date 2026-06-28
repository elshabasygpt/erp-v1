<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Infrastructure\Eloquent\Models\ProductAliasModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductAliasController extends BaseTenantController
{
    public function index(Request $request, string $productId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $aliases = ProductAliasModel::query()
            ->where('product_id', $productId)
            ->where('tenant_id', $tenantId)
            ->orderBy('sort_order')
            ->get();

        return $this->success($aliases);
    }

    public function store(Request $request, string $productId): JsonResponse
    {
        $validated = $request->validate([
            'alias_name' => 'required|string|max:255',
            'is_default_print' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $tenantId = $this->getTenantId($request);

        $product = ProductModel::query()->where('tenant_id', $tenantId)->find($productId);
        if (!$product) {
            return $this->error('Product not found', 404);
        }

        $alias = DB::connection('tenant')->transaction(function () use ($validated, $productId, $tenantId, $request) {
            if (!empty($validated['is_default_print'])) {
                ProductAliasModel::query()
                    ->where('product_id', $productId)
                    ->where('tenant_id', $tenantId)
                    ->update(['is_default_print' => false]);
            }

            return ProductAliasModel::query()->create([
                'id' => Str::uuid()->toString(),
                'tenant_id' => $tenantId,
                'product_id' => $productId,
                'alias_name' => $validated['alias_name'],
                'is_default_print' => $validated['is_default_print'] ?? false,
                'sort_order' => $validated['sort_order'] ?? 0,
                'created_by' => $request->user()?->id,
            ]);
        });

        return $this->success($alias->toArray(), 'Alias created successfully', 201);
    }

    public function update(Request $request, string $productId, string $aliasId): JsonResponse
    {
        $validated = $request->validate([
            'alias_name' => 'nullable|string|max:255',
            'is_default_print' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $tenantId = $this->getTenantId($request);
        $alias = ProductAliasModel::query()
            ->where('product_id', $productId)
            ->where('tenant_id', $tenantId)
            ->find($aliasId);

        if (!$alias) {
            return $this->error('Alias not found', 404);
        }

        DB::connection('tenant')->transaction(function () use ($alias, $validated, $productId, $tenantId) {
            if (!empty($validated['is_default_print'])) {
                ProductAliasModel::query()
                    ->where('product_id', $productId)
                    ->where('tenant_id', $tenantId)
                    ->where('id', '!=', $alias->id)
                    ->update(['is_default_print' => false]);
            }
            $alias->update($validated);
        });

        return $this->success($alias->fresh()->toArray(), 'Alias updated successfully');
    }

    public function destroy(Request $request, string $productId, string $aliasId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $alias = ProductAliasModel::query()
            ->where('product_id', $productId)
            ->where('tenant_id', $tenantId)
            ->find($aliasId);

        if (!$alias) {
            return $this->error('Alias not found', 404);
        }

        $alias->delete();

        return $this->success(null, 'Alias deleted successfully');
    }

    public function resolveAlias(Request $request, string $productId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $customerId = $request->query('customer_id');

        $product = ProductModel::query()->where('tenant_id', $tenantId)->find($productId);
        if (!$product) {
            return $this->error('Product not found', 404);
        }

        // Customer-specific alias takes highest priority
        if ($customerId) {
            $customerAlias = DB::connection('tenant')
                ->table('product_customer_aliases')
                ->where('product_id', $productId)
                ->where('customer_id', $customerId)
                ->where('tenant_id', $tenantId)
                ->whereNull('deleted_at')
                ->value('alias_name');

            if ($customerAlias) {
                return $this->success(['printed_name' => $customerAlias, 'source' => 'customer']);
            }
        }

        // Default print alias
        $defaultAlias = ProductAliasModel::query()
            ->where('product_id', $productId)
            ->where('tenant_id', $tenantId)
            ->where('is_default_print', true)
            ->value('alias_name');

        if ($defaultAlias) {
            return $this->success(['printed_name' => $defaultAlias, 'source' => 'default']);
        }

        // Fall back to product name
        return $this->success(['printed_name' => $product->name, 'source' => 'product_name']);
    }

    public function storeCustomerAlias(Request $request, string $productId): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'required|uuid',
            'alias_name' => 'required|string|max:255',
        ]);

        $tenantId = $this->getTenantId($request);

        DB::connection('tenant')
            ->table('product_customer_aliases')
            ->updateOrInsert(
                [
                    'tenant_id' => $tenantId,
                    'product_id' => $productId,
                    'customer_id' => $validated['customer_id'],
                ],
                [
                    'id' => Str::uuid()->toString(),
                    'alias_name' => $validated['alias_name'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

        return $this->success(null, 'Customer alias saved successfully', 201);
    }

    /** GET /inventory/products/{id}/customer-aliases — list customer-specific print names. */
    public function indexCustomerAliases(Request $request, string $productId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        $aliases = DB::connection('tenant')
            ->table('product_customer_aliases as pca')
            ->leftJoin('customers as c', 'c.id', '=', 'pca.customer_id')
            ->where('pca.product_id', $productId)
            ->where('pca.tenant_id', $tenantId)
            ->whereNull('pca.deleted_at')
            ->orderBy('pca.created_at')
            ->get(['pca.id', 'pca.customer_id', 'pca.alias_name', 'pca.created_at', 'c.name as customer_name']);

        $shaped = $aliases->map(fn ($a) => [
            'id' => $a->id,
            'customer_id' => $a->customer_id,
            'alias_name' => $a->alias_name,
            'customer' => ['name' => $a->customer_name],
        ]);

        return $this->success($shaped);
    }

    /** DELETE /inventory/products/{id}/customer-aliases/{aliasId} — remove a customer alias. */
    public function destroyCustomerAlias(Request $request, string $productId, string $aliasId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        $deleted = DB::connection('tenant')
            ->table('product_customer_aliases')
            ->where('id', $aliasId)
            ->where('product_id', $productId)
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at')
            ->update(['deleted_at' => now(), 'updated_at' => now()]);

        if (! $deleted) {
            return $this->error('Customer alias not found', 404);
        }

        return $this->success(null, 'Customer alias deleted successfully');
    }
}
