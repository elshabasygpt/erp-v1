<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use App\Infrastructure\Eloquent\Models\AccountModel;

$tenantId = '00000000-0000-0000-0000-000000000001';

// Clear existing accounts to rebuild the tree cleanly (assuming no transactions yet for Demo)
// If there are transactions, we should be careful. But this is a demo environment.
DB::connection('tenant')->statement('PRAGMA foreign_keys = OFF;');
DB::connection('tenant')->table('journal_entry_lines')->delete();
DB::connection('tenant')->table('journal_entries')->delete();
DB::connection('tenant')->table('accounts')->delete();
DB::connection('tenant')->statement('PRAGMA foreign_keys = ON;');

$coa = [
    // 1000 - الأصول (Assets)
    ['code' => '1000', 'name' => 'Assets', 'name_ar' => 'الأصول', 'type' => 'asset', 'children' => [
        ['code' => '1100', 'name' => 'Current Assets', 'name_ar' => 'الأصول المتداولة', 'type' => 'asset', 'children' => [
            ['code' => '1101', 'name' => 'Cash and Cash Equivalents', 'name_ar' => 'النقد وما في حكمه', 'type' => 'asset', 'children' => [
                ['code' => '110101', 'name' => 'Main Safe', 'name_ar' => 'الخزينة الرئيسية', 'type' => 'asset'],
                ['code' => '110102', 'name' => 'Petty Cash', 'name_ar' => 'العهدة النقدية', 'type' => 'asset'],
                ['code' => '110103', 'name' => 'Bank Accounts', 'name_ar' => 'حسابات البنوك', 'type' => 'asset'],
            ]],
            ['code' => '1102', 'name' => 'Accounts Receivable', 'name_ar' => 'الذمم المدينة (العملاء)', 'type' => 'asset'],
            ['code' => '1103', 'name' => 'Inventory', 'name_ar' => 'المخزون', 'type' => 'asset'],
            ['code' => '1104', 'name' => 'Prepaid Expenses', 'name_ar' => 'المصروفات المدفوعة مقدماً', 'type' => 'asset'],
            ['code' => '1105', 'name' => 'VAT Input', 'name_ar' => 'ضريبة القيمة المضافة (مدخلات)', 'type' => 'asset'],
        ]],
        ['code' => '1200', 'name' => 'Fixed Assets', 'name_ar' => 'الأصول الثابتة', 'type' => 'asset', 'children' => [
            ['code' => '1201', 'name' => 'Land', 'name_ar' => 'الأراضي', 'type' => 'asset'],
            ['code' => '1202', 'name' => 'Buildings', 'name_ar' => 'المباني', 'type' => 'asset'],
            ['code' => '1203', 'name' => 'Vehicles', 'name_ar' => 'السيارات', 'type' => 'asset'],
            ['code' => '1204', 'name' => 'Accumulated Depreciation', 'name_ar' => 'مجمع الإهلاك', 'type' => 'asset'],
        ]],
    ]],

    // 2000 - الخصوم (Liabilities)
    ['code' => '2000', 'name' => 'Liabilities', 'name_ar' => 'الخصوم (الالتزامات)', 'type' => 'liability', 'children' => [
        ['code' => '2100', 'name' => 'Current Liabilities', 'name_ar' => 'الخصوم المتداولة', 'type' => 'liability', 'children' => [
            ['code' => '2101', 'name' => 'Accounts Payable', 'name_ar' => 'الذمم الدائنة (الموردين)', 'type' => 'liability'],
            ['code' => '2102', 'name' => 'Accrued Expenses', 'name_ar' => 'المصروفات المستحقة', 'type' => 'liability'],
            ['code' => '2103', 'name' => 'VAT Payable', 'name_ar' => 'ضريبة القيمة المضافة (مخرجات)', 'type' => 'liability'],
            ['code' => '2104', 'name' => 'Short-Term Loans', 'name_ar' => 'قروض قصيرة الأجل', 'type' => 'liability'],
            ['code' => '2105', 'name' => 'Zakat Provision', 'name_ar' => 'مخصص الزكاة', 'type' => 'liability'],
        ]],
        ['code' => '2200', 'name' => 'Long-Term Liabilities', 'name_ar' => 'الخصوم غير المتداولة', 'type' => 'liability', 'children' => [
            ['code' => '2201', 'name' => 'Long-Term Loans', 'name_ar' => 'قروض طويلة الأجل', 'type' => 'liability'],
            ['code' => '2202', 'name' => 'End of Service Provision', 'name_ar' => 'مخصص مكافأة نهاية الخدمة', 'type' => 'liability'],
        ]],
    ]],

    // 3000 - حقوق الملكية (Equity)
    ['code' => '3000', 'name' => 'Equity', 'name_ar' => 'حقوق الملكية', 'type' => 'equity', 'children' => [
        ['code' => '3001', 'name' => 'Capital', 'name_ar' => 'رأس المال', 'type' => 'equity'],
        ['code' => '3002', 'name' => 'Retained Earnings', 'name_ar' => 'الأرباح المبقاة', 'type' => 'equity'],
        ['code' => '3003', 'name' => 'Statutory Reserve', 'name_ar' => 'الاحتياطي النظامي', 'type' => 'equity'],
        ['code' => '3004', 'name' => 'Opening Balance Equity', 'name_ar' => 'رصيد افتتاحي (حقوق ملكية)', 'type' => 'equity'],
    ]],

    // 4000 - الإيرادات (Revenue)
    ['code' => '4000', 'name' => 'Revenue', 'name_ar' => 'الإيرادات', 'type' => 'revenue', 'children' => [
        ['code' => '4100', 'name' => 'Sales Revenue', 'name_ar' => 'إيرادات المبيعات', 'type' => 'revenue'],
        ['code' => '4200', 'name' => 'Service Revenue', 'name_ar' => 'إيرادات الخدمات', 'type' => 'revenue'],
        ['code' => '4300', 'name' => 'Other Revenue', 'name_ar' => 'إيرادات أخرى', 'type' => 'revenue'],
    ]],

    // 5000 - المصروفات (Expenses)
    ['code' => '5000', 'name' => 'Expenses', 'name_ar' => 'المصروفات', 'type' => 'expense', 'children' => [
        ['code' => '5100', 'name' => 'Cost of Goods Sold (COGS)', 'name_ar' => 'تكلفة البضاعة المباعة', 'type' => 'expense'],
        ['code' => '5200', 'name' => 'Operating Expenses', 'name_ar' => 'المصروفات التشغيلية', 'type' => 'expense', 'children' => [
            ['code' => '5201', 'name' => 'Salaries & Wages', 'name_ar' => 'الرواتب والأجور', 'type' => 'expense'],
            ['code' => '5202', 'name' => 'Rent Expense', 'name_ar' => 'مصروف الإيجار', 'type' => 'expense'],
            ['code' => '5203', 'name' => 'Utilities (Water & Electricity)', 'name_ar' => 'المنافع (كهرباء وماء)', 'type' => 'expense'],
            ['code' => '5204', 'name' => 'Marketing & Advertising', 'name_ar' => 'التسويق والإعلان', 'type' => 'expense'],
        ]],
        ['code' => '5300', 'name' => 'General & Administrative', 'name_ar' => 'المصروفات العمومية والإدارية', 'type' => 'expense', 'children' => [
            ['code' => '5301', 'name' => 'Office Supplies', 'name_ar' => 'أدوات مكتبية', 'type' => 'expense'],
            ['code' => '5302', 'name' => 'Depreciation Expense', 'name_ar' => 'مصروف الإهلاك', 'type' => 'expense'],
            ['code' => '5303', 'name' => 'Bank Charges', 'name_ar' => 'رسوم بنكية', 'type' => 'expense'],
        ]],
    ]],
];

function seedAccounts($accounts, $parentId = null, $level = 1, $tenantId) {
    foreach ($accounts as $acc) {
        $id = Str::uuid()->toString();
        
        DB::connection('tenant')->table('accounts')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'code' => $acc['code'],
            'name' => $acc['name'],
            'name_ar' => $acc['name_ar'],
            'type' => $acc['type'],
            'parent_id' => $parentId,
            'level' => $level,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if (isset($acc['children']) && is_array($acc['children'])) {
            seedAccounts($acc['children'], $id, $level + 1, $tenantId);
        }
    }
}

seedAccounts($coa, null, 1, $tenantId);

// Now re-map the basic default settings
$mappings = [
    'account.cash' => DB::connection('tenant')->table('accounts')->where('code', '110101')->value('id'),
    'account.ar' => DB::connection('tenant')->table('accounts')->where('code', '1102')->value('id'),
    'account.inventory' => DB::connection('tenant')->table('accounts')->where('code', '1103')->value('id'),
    'account.vat_input' => DB::connection('tenant')->table('accounts')->where('code', '1105')->value('id'),
    'account.bank' => DB::connection('tenant')->table('accounts')->where('code', '110103')->value('id'),
    'account.ap' => DB::connection('tenant')->table('accounts')->where('code', '2101')->value('id'),
    'account.vat_payable' => DB::connection('tenant')->table('accounts')->where('code', '2103')->value('id'),
    'account.revenue' => DB::connection('tenant')->table('accounts')->where('code', '4100')->value('id'),
    'account.cogs' => DB::connection('tenant')->table('accounts')->where('code', '5100')->value('id'),
    'account.opening_balance_equity' => DB::connection('tenant')->table('accounts')->where('code', '3004')->value('id'),
];

foreach ($mappings as $key => $val) {
    if ($val) {
        DB::connection('tenant')->table('tenant_settings')->updateOrInsert(
            ['tenant_id' => $tenantId, 'key' => $key],
            ['id' => Str::uuid()->toString(), 'value' => $val, 'updated_at' => now()]
        );
    }
}

echo "Standard Hierarchical Chart of Accounts seeded successfully!\n";
