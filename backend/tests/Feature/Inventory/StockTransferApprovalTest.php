<?php

namespace Tests\Feature\Inventory;

use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel;
use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRuleModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class StockTransferApprovalTest extends TestCase
{
    private function makeWarehouses(): array
    {
        return [
            WarehouseModel::create(['id' => Str::uuid(), 'name' => 'Source', 'code' => 'WH-SRC', 'is_active' => true]),
            WarehouseModel::create(['id' => Str::uuid(), 'name' => 'Destination', 'code' => 'WH-DST', 'is_active' => true]),
        ];
    }

    private function makeProductWithStock(WarehouseModel $warehouse, float $cost, float $qty): ProductModel
    {
        $product = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Brake Disc', 'name_ar' => 'دسك فرامل',
            'sku' => 'SKU-'.Str::random(6), 'cost_price' => $cost, 'sell_price' => $cost * 1.5, 'is_active' => true,
        ]);
        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id, 'product_id' => $product->id, 'quantity' => $qty, 'average_cost' => $cost,
        ]);

        return $product;
    }

    private function makeTransfer(WarehouseModel $from, WarehouseModel $to, ProductModel $product, float $qty): string
    {
        return $this->postJson('/api/inventory/stock-transfers', [
            'from_warehouse_id' => $from->id,
            'to_warehouse_id' => $to->id,
            'items' => [['product_id' => $product->id, 'quantity' => $qty]],
        ])->json('data.transfer.id');
    }

    public function test_transfer_below_threshold_approves_immediately_with_no_approval_request()
    {
        $this->actingAsAuthenticatedUser();
        ApprovalRuleModel::create([
            'id' => Str::uuid(), 'entity_type' => 'stock_transfer', 'trigger_type' => 'high_value_transfer',
            'threshold' => 1000, 'required_role' => 'manager', 'is_active' => true,
        ]);
        [$from, $to] = $this->makeWarehouses();
        $product = $this->makeProductWithStock($from, cost: 50, qty: 10);
        $transferId = $this->makeTransfer($from, $to, $product, 2); // 2 * 50 = 100, under threshold

        $response = $this->postJson("/api/inventory/stock-transfers/{$transferId}/approve");

        $response->assertStatus(200);
        $this->assertEquals('in_transit', $response->json('data.transfer.status'));
        $this->assertDatabaseMissing('approval_requests', ['entity_id' => $transferId]);
    }

    public function test_transfer_above_threshold_is_blocked_and_creates_an_approval_request()
    {
        $this->actingAsAuthenticatedUser();
        ApprovalRuleModel::create([
            'id' => Str::uuid(), 'entity_type' => 'stock_transfer', 'trigger_type' => 'high_value_transfer',
            'threshold' => 100, 'required_role' => 'manager', 'is_active' => true,
        ]);
        [$from, $to] = $this->makeWarehouses();
        $product = $this->makeProductWithStock($from, cost: 50, qty: 10);
        $transferId = $this->makeTransfer($from, $to, $product, 5); // 5 * 50 = 250, over threshold

        $response = $this->postJson("/api/inventory/stock-transfers/{$transferId}/approve");

        $response->assertStatus(400);
        $this->assertDatabaseHas('approval_requests', [
            'entity_id' => $transferId, 'entity_type' => 'stock_transfer', 'status' => 'pending',
        ]);

        // Stock must NOT have been deducted — the transfer never actually approved.
        $this->assertDatabaseHas('warehouse_products', [
            'warehouse_id' => $from->id, 'product_id' => $product->id, 'quantity' => 10,
        ]);
    }

    public function test_transfer_still_blocked_while_approval_request_is_pending()
    {
        $this->actingAsAuthenticatedUser();
        ApprovalRuleModel::create([
            'id' => Str::uuid(), 'entity_type' => 'stock_transfer', 'trigger_type' => 'high_value_transfer',
            'threshold' => 100, 'required_role' => 'manager', 'is_active' => true,
        ]);
        [$from, $to] = $this->makeWarehouses();
        $product = $this->makeProductWithStock($from, cost: 50, qty: 10);
        $transferId = $this->makeTransfer($from, $to, $product, 5);

        $this->postJson("/api/inventory/stock-transfers/{$transferId}/approve")->assertStatus(400);
        $second = $this->postJson("/api/inventory/stock-transfers/{$transferId}/approve");

        $second->assertStatus(400);
        $this->assertEquals(1, ApprovalRequestModel::where('entity_id', $transferId)->count());
    }

    public function test_transfer_proceeds_once_the_approval_request_is_approved()
    {
        $this->actingAsAuthenticatedUser();
        ApprovalRuleModel::create([
            'id' => Str::uuid(), 'entity_type' => 'stock_transfer', 'trigger_type' => 'high_value_transfer',
            'threshold' => 100, 'required_role' => 'manager', 'is_active' => true,
        ]);
        [$from, $to] = $this->makeWarehouses();
        $product = $this->makeProductWithStock($from, cost: 50, qty: 10);
        $transferId = $this->makeTransfer($from, $to, $product, 5);

        $this->postJson("/api/inventory/stock-transfers/{$transferId}/approve")->assertStatus(400);

        $approvalId = ApprovalRequestModel::where('entity_id', $transferId)->value('id');
        $this->postJson("/api/approvals/{$approvalId}/approve", [])->assertStatus(200);

        $response = $this->postJson("/api/inventory/stock-transfers/{$transferId}/approve");

        $response->assertStatus(200);
        $this->assertEquals('in_transit', $response->json('data.transfer.status'));
        $this->assertDatabaseHas('warehouse_products', [
            'warehouse_id' => $from->id, 'product_id' => $product->id, 'quantity' => 5,
        ]);
    }
}
