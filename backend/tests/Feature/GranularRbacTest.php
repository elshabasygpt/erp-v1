<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Infrastructure\Eloquent\Models\RoleModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use Illuminate\Support\Facades\Gate;

class GranularRbacTest extends TestCase
{
    use RefreshDatabase;

    public function setUp(): void
    {
        parent::setUp();
        
        // Ensure tenant scope/setup is initialized for testing (if any)
        // This is generic, just ensuring basic models can be created.
    }

    public function test_dynamic_discount_policy()
    {
        // 1. Create a Role with specific dynamic meta_attributes limit
        $role = RoleModel::create([
            'name' => 'Cashier',
            'guard_name' => 'api',
            'meta_attributes' => [
                'max_discount_pct' => 10
            ]
        ]);

        // 2. Create User
        $user = UserModel::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Test Cashier',
            'email' => 'cashier@test.com',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
        ]);

        // 3. Fake Invoice
        $invoice = new InvoiceModel();
        $invoice->id = \Illuminate\Support\Str::uuid();
        $invoice->discount_pct = 15;

        // 4. Test Policy (Should fail because 20 > 10)
        $this->actingAs($user);
        
        $response = Gate::inspect('approveDiscount', [$invoice, 20.0]);
        $this->assertTrue($response->denied());
        $this->assertEquals('You are only authorized to approve discounts up to 10%.', $response->message());

        // 5. Test proper pass
        $response = Gate::inspect('approveDiscount', [$invoice, 5.0]);
        $this->assertTrue($response->allowed());
    }
}
