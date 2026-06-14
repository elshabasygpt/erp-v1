<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Ramsey\Uuid\Uuid;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Warehouses
        $warehouseRiyadh = Uuid::uuid4()->toString();
        $warehouseJeddah = Uuid::uuid4()->toString();
        
        DB::connection('tenant')->table('warehouses')->insert([
            ['id' => $warehouseRiyadh, 'name' => 'المستودع الرئيسي - الرياض', 'location' => 'الرياض', 'is_default' => true, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['id' => $warehouseJeddah, 'name' => 'مستودع التوزيع - جدة', 'location' => 'جدة', 'is_default' => false, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
        $this->command->info('✅ Warehouses created');

        // 2. Customers
        $customers = [
            ['name' => 'عميل نقدي (كاش)', 'email' => 'cash@local.com', 'phone' => '0500000000', 'address' => ''],
            ['name' => 'أسواق التميمي - فرع الياسمين', 'email' => 'tamimi@local.com', 'phone' => '0501111111', 'address' => 'الرياض - الياسمين'],
        ];
        foreach ($customers as $c) {
            DB::connection('tenant')->table('customers')->insert(
                array_merge($c, ['id' => Uuid::uuid4()->toString(), 'balance' => 0, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()])
            );
        }
        $this->command->info('✅ Customers created');

        // 3. Suppliers
        $suppliers = [
            ['name' => 'شركة المراعي', 'email' => 'sales@almarai.com', 'phone' => '0502222222', 'address' => 'الرياض'],
            ['name' => 'شركة بيبسيكو (جمجوم)', 'email' => 'pepsi@local.com', 'phone' => '0503333333', 'address' => 'جدة'],
            ['name' => 'شركة نادك', 'email' => 'sales@nadec.com', 'phone' => '0504444444', 'address' => 'القصيم'],
        ];
        foreach ($suppliers as $s) {
            DB::connection('tenant')->table('suppliers')->insert(
                array_merge($s, ['id' => Uuid::uuid4()->toString(), 'balance' => 0, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()])
            );
        }
        $this->command->info('✅ Suppliers created');

        // 4. Products (Supermarket / FMCG)
        $products = [
            [
                'name' => 'حليب المراعي طازج 1 لتر', 'name_ar' => 'حليب المراعي طازج 1 لتر', 'sku' => 'ALM-1L-001', 'barcode' => '6281000000010', 'cost_price' => 4.50, 'sell_price' => 6.00, 'stock_alert_level' => 50, 'unit_of_measure' => 'قطعة',
                'units' => [['unit_name' => 'كرتون', 'conversion_factor' => 12, 'sell_price' => 70.00, 'barcode' => '6281000000011']], 'stock_riyadh' => 200, 'stock_jeddah' => 150,
            ],
            [
                'name' => 'مياه نوفا عبوة 330 مل', 'name_ar' => 'مياه نوفا عبوة 330 مل', 'sku' => 'NOVA-330', 'barcode' => '6281111000020', 'cost_price' => 0.50, 'sell_price' => 1.00, 'stock_alert_level' => 100, 'unit_of_measure' => 'حبة',
                'units' => [['unit_name' => 'كرتون', 'conversion_factor' => 40, 'sell_price' => 18.00, 'barcode' => '6281111000021']], 'stock_riyadh' => 1000, 'stock_jeddah' => 800,
            ],
            [
                'name' => 'بيبسي كولا علب 320 مل', 'name_ar' => 'بيبسي كولا علب 320 مل', 'sku' => 'PEP-320', 'barcode' => '6281222000030', 'cost_price' => 2.00, 'sell_price' => 3.00, 'stock_alert_level' => 200, 'unit_of_measure' => 'علبة',
                'units' => [['unit_name' => 'كرتون', 'conversion_factor' => 24, 'sell_price' => 55.00, 'barcode' => '6281222000031']], 'stock_riyadh' => 500, 'stock_jeddah' => 300,
            ],
            [
                'name' => 'أرز أبو كاس مزة هندي 10 كيلو', 'name_ar' => 'أرز أبو كاس مزة هندي 10 كيلو', 'sku' => 'RICE-ABK-10', 'barcode' => '6281333000040', 'cost_price' => 65.00, 'sell_price' => 85.00, 'stock_alert_level' => 20, 'unit_of_measure' => 'كيس',
                'units' => [], 'stock_riyadh' => 100, 'stock_jeddah' => 50,
            ],
            [
                'name' => 'تايد مسحوق غسيل 5 كيلو', 'name_ar' => 'تايد مسحوق غسيل 5 كيلو', 'sku' => 'TIDE-5K', 'barcode' => '6281444000050', 'cost_price' => 40.00, 'sell_price' => 55.00, 'stock_alert_level' => 15, 'unit_of_measure' => 'كيس',
                'units' => [['unit_name' => 'كرتون', 'conversion_factor' => 4, 'sell_price' => 210.00, 'barcode' => '6281444000051']], 'stock_riyadh' => 80, 'stock_jeddah' => 40,
            ],
            [
                'name' => 'جبنة كرافت شيدر 100 جرام', 'name_ar' => 'جبنة كرافت شيدر 100 جرام', 'sku' => 'KRAFT-100', 'barcode' => '6281555000060', 'cost_price' => 4.00, 'sell_price' => 6.00, 'stock_alert_level' => 30, 'unit_of_measure' => 'علبة',
                'units' => [['unit_name' => 'كرتون', 'conversion_factor' => 48, 'sell_price' => 250.00, 'barcode' => '6281555000061']], 'stock_riyadh' => 120, 'stock_jeddah' => 90,
            ]
        ];

        foreach ($products as $p) {
            $pid = Uuid::uuid4()->toString();
            DB::connection('tenant')->table('products')->insert([
                'id' => $pid, 'name' => $p['name'], 'name_ar' => $p['name_ar'],
                'sku' => $p['sku'], 'barcode' => $p['barcode'],
                'cost_price' => $p['cost_price'], 'sell_price' => $p['sell_price'],
                'vat_rate' => 15, 'stock_alert_level' => $p['stock_alert_level'],
                'unit_of_measure' => $p['unit_of_measure'],
                'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
            ]);

            foreach ($p['units'] as $u) {
                DB::connection('tenant')->table('product_units')->insert([
                    'id' => Uuid::uuid4()->toString(),
                    'product_id' => $pid,
                    'unit_name' => $u['unit_name'],
                    'conversion_factor' => $u['conversion_factor'],
                    'sell_price' => $u['sell_price'],
                    'barcode' => $u['barcode'],
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }

            DB::connection('tenant')->table('warehouse_products')->insert([
                ['id' => Uuid::uuid4()->toString(), 'warehouse_id' => $warehouseRiyadh, 'product_id' => $pid, 'quantity' => $p['stock_riyadh'], 'average_cost' => $p['cost_price'], 'created_at' => now(), 'updated_at' => now()],
                ['id' => Uuid::uuid4()->toString(), 'warehouse_id' => $warehouseJeddah, 'product_id' => $pid, 'quantity' => $p['stock_jeddah'], 'average_cost' => $p['cost_price'], 'created_at' => now(), 'updated_at' => now()],
            ]);
        }
        $this->command->info('✅ Supermarket FMCG Products created');

        $this->command->newLine();
        $this->command->info('🎉 FMCG Supermarket Data seeded successfully!');
    }
}
