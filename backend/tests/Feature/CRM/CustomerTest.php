<?php

namespace Tests\Feature\CRM;

use App\Infrastructure\Eloquent\Models\CustomerModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_creation_sets_default_balance()
    {
        $customer = CustomerModel::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'name' => 'John Doe',
            'phone' => '+1234567890',
            'balance' => 0
        ]);

        $this->assertDatabaseHas('customers', [
            'name' => 'John Doe',
            'balance' => 0
        ]);

        $this->assertEquals(0, $customer->balance);
    }
}
