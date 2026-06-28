<?php

namespace Tests\Feature\Sales;

use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class CreditLimitEnforcementTest extends TestCase
{
    private function makeWarehouseAndProduct(): array
    {
        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(),
            'name' => 'Main Warehouse',
            'code' => 'WH01',
            'is_active' => true,
        ]);

        $product = ProductModel::create([
            'id' => Str::uuid(),
            'name' => 'Oil Filter', 'name_ar' => 'فلتر زيت',
            'sku' => 'SKU-'.Str::random(6),
            'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 50,
            'sell_price' => 100,
            'is_active' => true,
        ]);

        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id,
            'product_id' => $product->id,
            'quantity' => 50,
            'average_cost' => 50,
        ]);

        return [$warehouse, $product];
    }

    private function makeCustomer(float $balance, float $creditLimit): CustomerModel
    {
        return CustomerModel::create([
            'id' => Str::uuid(),
            'name' => 'Acme Garage',
            'balance' => $balance,
            'credit_limit' => $creditLimit,
            'is_active' => true,
        ]);
    }

    private function grantOverridePermission(UserModel $user): void
    {
        \DB::connection('tenant')->table('roles')->where('id', $user->role_id)->update([
            'meta_attributes' => json_encode(['can_override_credit_limit' => true]),
        ]);
    }

    private function invoicePayload($warehouse, $product, $customer, ?bool $override = null): array
    {
        $payload = [
            'type' => 'credit',
            'status' => 'confirmed',
            'warehouse_id' => $warehouse->id,
            'customer_id' => $customer->id,
            'paid_amount' => 0,
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 1,
                'unit_price' => 100,
                'vat_rate' => 15,
            ]],
        ];

        if ($override !== null) {
            $payload['credit_limit_override'] = $override;
        }

        return $payload;
    }

    public function test_zero_credit_limit_means_unlimited_and_invoice_still_confirms()
    {
        $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();
        $customer = $this->makeCustomer(balance: 5000, creditLimit: 0);

        $response = $this->postJson('/api/sales/invoices', $this->invoicePayload($warehouse, $product, $customer));

        $response->assertStatus(201);
    }

    public function test_exceeding_credit_limit_without_override_is_blocked()
    {
        $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();
        $customer = $this->makeCustomer(balance: 100, creditLimit: 100);

        $response = $this->postJson('/api/sales/invoices', $this->invoicePayload($warehouse, $product, $customer));

        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'Credit Limit Exceeded. Customer balance is 100.00, Credit Limit is 100, and Due Amount is 115. Manager override required.']);

        // create() and confirm() must be atomic: a blocked confirm must not
        // leave an orphaned draft invoice behind.
        $this->assertDatabaseMissing('invoices', ['customer_id' => $customer->id]);
    }

    public function test_override_without_permission_is_still_blocked()
    {
        $user = $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();
        $customer = $this->makeCustomer(balance: 100, creditLimit: 100);

        // User has NOT been granted can_override_credit_limit.
        $response = $this->postJson('/api/sales/invoices', $this->invoicePayload($warehouse, $product, $customer, override: true));

        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'You do not have permission to override the customer credit limit.']);
    }

    public function test_override_with_permission_succeeds()
    {
        $user = $this->actingAsAuthenticatedUser();
        $this->grantOverridePermission($user);

        [$warehouse, $product] = $this->makeWarehouseAndProduct();
        $customer = $this->makeCustomer(balance: 100, creditLimit: 100);

        $response = $this->postJson('/api/sales/invoices', $this->invoicePayload($warehouse, $product, $customer, override: true));

        $response->assertStatus(201);
    }

    public function test_confirming_a_draft_via_status_endpoint_also_enforces_credit_limit()
    {
        $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();
        $customer = $this->makeCustomer(balance: 100, creditLimit: 100);

        // Create as a draft first (no credit check runs for drafts).
        $draftPayload = $this->invoicePayload($warehouse, $product, $customer);
        $draftPayload['status'] = 'draft';
        $created = $this->postJson('/api/sales/invoices', $draftPayload);
        $created->assertStatus(201);
        $invoiceId = $created->json('data.id');

        // Confirming it via the status endpoint without override must be blocked.
        $blocked = $this->putJson("/api/sales/invoices/{$invoiceId}/status", ['status' => 'confirmed']);
        $blocked->assertStatus(422);
    }

    public function test_confirming_a_draft_via_status_endpoint_allows_override_with_permission()
    {
        $user = $this->actingAsAuthenticatedUser();
        $this->grantOverridePermission($user);

        [$warehouse, $product] = $this->makeWarehouseAndProduct();
        $customer = $this->makeCustomer(balance: 100, creditLimit: 100);

        $draftPayload = $this->invoicePayload($warehouse, $product, $customer);
        $draftPayload['status'] = 'draft';
        $created = $this->postJson('/api/sales/invoices', $draftPayload);
        $invoiceId = $created->json('data.id');

        $allowed = $this->putJson("/api/sales/invoices/{$invoiceId}/status", [
            'status' => 'confirmed',
            'credit_limit_override' => true,
        ]);
        $allowed->assertStatus(200);
    }

    public function test_confirm_use_case_enforces_credit_limit_even_when_called_directly()
    {
        // The authoritative, race-closing check lives inside ConfirmInvoiceUseCase under the
        // customer-row lock — not only in the controller. Calling the use-case directly (the
        // path a concurrent confirmation takes) must still reject an over-limit credit invoice.
        $user = $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();
        $customer = $this->makeCustomer(balance: 100, creditLimit: 100);

        $draftPayload = $this->invoicePayload($warehouse, $product, $customer);
        $draftPayload['status'] = 'draft';
        $invoiceId = $this->postJson('/api/sales/invoices', $draftPayload)->json('data.id');

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessageMatches('/Credit Limit Exceeded/');
        app(\App\Application\Sales\UseCases\ConfirmInvoiceUseCase::class)->execute($invoiceId, $user->id);
    }

    public function test_confirm_use_case_honours_override_flag_when_called_directly()
    {
        $user = $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();
        $customer = $this->makeCustomer(balance: 100, creditLimit: 100);

        $draftPayload = $this->invoicePayload($warehouse, $product, $customer);
        $draftPayload['status'] = 'draft';
        $invoiceId = $this->postJson('/api/sales/invoices', $draftPayload)->json('data.id');

        app(\App\Application\Sales\UseCases\ConfirmInvoiceUseCase::class)->execute($invoiceId, $user->id, true);

        $this->assertDatabaseHas('invoices', ['id' => $invoiceId, 'status' => 'confirmed']);
        // Balance increases by the 115 due (100 + 15% VAT), proving the override path still posts.
        $this->assertEquals(215.0, (float) CustomerModel::find($customer->id)->balance);
    }

    public function test_create_and_confirm_are_atomic_no_orphaned_draft_when_confirm_fails()
    {
        $this->actingAsAuthenticatedUser();
        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(), 'name' => 'Empty Warehouse', 'code' => 'WH02', 'is_active' => true,
        ]);
        $product = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Spark Plug', 'name_ar' => 'بوجي',
            'sku' => 'SKU-'.Str::random(6), 'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 10, 'sell_price' => 20, 'is_active' => true,
        ]);
        // Deliberately no WarehouseProductModel row, so stock is 0 and the
        // ConfirmInvoiceUseCase stock check fails after the draft is created.

        $response = $this->postJson('/api/sales/invoices', [
            'type' => 'cash',
            'status' => 'confirmed',
            'warehouse_id' => $warehouse->id,
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 1,
                'unit_price' => 20,
                'vat_rate' => 15,
            ]],
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('invoices', ['warehouse_id' => $warehouse->id]);
    }
}
