<?php

namespace Tests\Feature\Sales;

use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\PermissionModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\RoleModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class DownPaymentAuthorizationTest extends TestCase
{
    private function makeWarehouseAndProduct(): array
    {
        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(), 'name' => 'Main Warehouse', 'code' => 'WH01', 'is_active' => true,
        ]);
        $product = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Brake Pad', 'name_ar' => 'تيل فرامل',
            'sku' => 'SKU-'.Str::random(6), 'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 50, 'sell_price' => 100, 'is_active' => true,
        ]);
        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id, 'product_id' => $product->id, 'quantity' => 10, 'average_cost' => 50,
        ]);

        return [$warehouse, $product];
    }

    private function invoicePayload($warehouse, $product, $customer, float $paidAmount): array
    {
        return [
            'type' => 'credit',
            'status' => 'draft',
            'warehouse_id' => $warehouse->id,
            'customer_id' => $customer->id,
            'paid_amount' => $paidAmount,
            'items' => [[
                'product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100, 'vat_rate' => 15,
            ]],
        ];
    }

    public function test_zero_down_payment_never_requires_permission()
    {
        $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();
        $customer = CustomerModel::create(['id' => Str::uuid(), 'name' => 'Walk-in', 'is_active' => true]);

        $response = $this->postJson('/api/sales/invoices', $this->invoicePayload($warehouse, $product, $customer, 0));

        $response->assertStatus(201);
    }

    public function test_nonzero_down_payment_without_permission_is_blocked()
    {
        $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();
        $customer = CustomerModel::create(['id' => Str::uuid(), 'name' => 'Walk-in', 'is_active' => true]);

        $response = $this->postJson('/api/sales/invoices', $this->invoicePayload($warehouse, $product, $customer, 50));

        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'You do not have permission to record a down payment on a credit invoice. Ask a manager to collect the payment instead.']);
    }

    public function test_nonzero_down_payment_with_collect_payments_permission_succeeds()
    {
        $user = $this->actingAsAuthenticatedUser();
        $role = RoleModel::find($user->role_id);
        $permission = PermissionModel::create(['name' => 'collect_payments', 'guard_name' => $role->guard_name]);
        $role->givePermissionTo($permission);

        [$warehouse, $product] = $this->makeWarehouseAndProduct();
        $customer = CustomerModel::create(['id' => Str::uuid(), 'name' => 'Walk-in', 'is_active' => true]);

        $response = $this->postJson('/api/sales/invoices', $this->invoicePayload($warehouse, $product, $customer, 50));

        $response->assertStatus(201);
    }

    public function test_cash_invoices_never_trigger_the_permission_check_regardless_of_paid_amount()
    {
        $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();

        $response = $this->postJson('/api/sales/invoices', [
            'type' => 'cash',
            'status' => 'draft',
            'warehouse_id' => $warehouse->id,
            'paid_amount' => 100,
            'items' => [[
                'product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100, 'vat_rate' => 15,
            ]],
        ]);

        $response->assertStatus(201);
    }
}
