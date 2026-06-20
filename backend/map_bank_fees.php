<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

$tenant = \App\Infrastructure\Eloquent\Models\TenantModel::first();
if ($tenant) {
    app()->instance('current_tenant', $tenant);
    $bankFeesAccountId = Str::uuid()->toString();
    
    // Check if an expense account group exists
    $expenseGroup = DB::connection('tenant')->table('accounts')->where('account_type', 'expense')->whereNull('parent_id')->first();
    
    DB::connection('tenant')->table('accounts')->insert([
        'id' => $bankFeesAccountId,
        'tenant_id' => $tenant->id,
        'code' => '5001',
        'name' => 'Bank Fees',
        'account_type' => 'expense',
        'is_active' => true,
        'parent_id' => $expenseGroup ? $expenseGroup->id : null,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::connection('tenant')->table('tenant_settings')->updateOrInsert(
        ['key' => 'account.bank_fees', 'tenant_id' => $tenant->id],
        ['value' => $bankFeesAccountId, 'updated_at' => now()]
    );
    echo "Created Bank Fees account and mapped it successfully.";
} else {
    echo 'No tenant found';
}
