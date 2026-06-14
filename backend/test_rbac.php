<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Infrastructure\Eloquent\Models\RoleModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use Illuminate\Support\Facades\Gate;

echo "--- Starting RBAC Test ---\n";

// 1. Create Role
$role = RoleModel::firstOrCreate(
    ['name' => 'Cashier'],
    [
        'guard_name' => 'api',
        'meta_attributes' => ['max_discount_pct' => 10, 'can_only_edit_own' => true]
    ]
);

// 2. Create User
$user = UserModel::firstOrCreate(
    ['email' => 'cashier_rbac_test@test.com'],
    [
        'id' => \Illuminate\Support\Str::uuid(),
        'name' => 'Test Cashier',
        'password' => bcrypt('password'),
        'role_id' => $role->id,
    ]
);

// 3. Fake Invoice
$invoice = new InvoiceModel();
$invoice->id = \Illuminate\Support\Str::uuid();
$invoice->created_by = $user->id; // Ownership pass
$invoice->discount_pct = 15;

// Authenticate
auth()->login($user);

echo "Testing Update Policy (Own Invoice)...\n";
$canUpdate = Gate::check('update', $invoice);
echo $canUpdate ? "PASS: Can update own invoice\n" : "FAIL: Cannot update own invoice\n";

echo "Testing Update Policy (Someone else's Invoice)...\n";
$invoice2 = new InvoiceModel();
$invoice2->id = \Illuminate\Support\Str::uuid();
$invoice2->created_by = \Illuminate\Support\Str::uuid(); // Someone else
$canUpdateOther = Gate::check('update', $invoice2);
echo $canUpdateOther ? "FAIL: Could update someone else's invoice\n" : "PASS: Cannot update someone else's invoice\n";

echo "Testing Approve Discount Policy (20% > 10% limit)...\n";
$response = Gate::inspect('approveDiscount', [$invoice, 20.0]);
echo $response->denied() ? "PASS: Denied access -> " . $response->message() . "\n" : "FAIL: Access incorrectly allowed\n";

echo "Testing Approve Discount Policy (5% <= 10% limit)...\n";
$response2 = Gate::inspect('approveDiscount', [$invoice, 5.0]);
echo $response2->allowed() ? "PASS: Access Allowed\n" : "FAIL: Access incorrectly denied\n";

echo "--- RBAC Test Complete ---\n";
