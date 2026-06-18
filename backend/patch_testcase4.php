<?php

$content = file_get_contents('tests/Feature/Inventory/InventoryTest.php');

$search = "            'location' => 'الرياض',
            'branch_id'=> Str::uuid()->toString(),";

$replace = "            'location' => 'الرياض',
            'branch_id'=> \$branchId = Str::uuid()->toString(),
        ]);
        \\DB::connection('tenant')->table('branches')->insert([
            'id' => \$branchId,
            'name' => 'Test Branch',
            'tenant_id' => '00000000-0000-0000-0000-000000000001',
            'company_id' => Str::uuid()->toString()";

// Actually, let's just rewrite the test_can_create_warehouse method:

$code = preg_replace(
    "/public function test_can_create_warehouse\(\): void\n\s+\{(.*?)\n\s+public function test_can_list_stock_movements/s",
    "public function test_can_create_warehouse(): void
    {
        \$this->actingAsAuthenticatedUser();
        \$branchId = Str::uuid()->toString();
        \DB::connection('tenant')->table('branches')->insert([
            'id' => \$branchId,
            'name' => 'Test Branch',
            'tenant_id' => '00000000-0000-0000-0000-000000000001',
        ]);
        \$response = \$this->postJson('/api/inventory/warehouses', [
            'name'     => 'مستودع رئيسي',
            'location' => 'الرياض',
            'branch_id'=> \$branchId,
        ]);
        if (\$response->status() !== 201) { dump(\$response->json()); }
        \$response->assertStatus(201);
    }

    public function test_can_list_stock_movements",
    $content
);

file_put_contents('tests/Feature/Inventory/InventoryTest.php', $code);
