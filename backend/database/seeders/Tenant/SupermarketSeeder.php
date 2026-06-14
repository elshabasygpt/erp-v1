<?php

namespace Database\Seeders\Tenant;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use Illuminate\Support\Facades\DB;

class SupermarketSeeder extends Seeder
{
    public function run()
    {
        // 1. Create a Default Warehouse
        $warehouse = WarehouseModel::create([
            'id' => Str::uuid()->toString(),
            'name' => 'المستودع الرئيسي - الرياض',
            'code' => 'W-RYD-01',
            'is_active' => true,
        ]);

        $warehouseJeddah = WarehouseModel::create([
            'id' => Str::uuid()->toString(),
            'name' => 'مستودع التوزيع - جدة',
            'code' => 'W-JED-01',
            'is_active' => true,
        ]);

        // 2. Create Customers
        CustomerModel::create(['id' => Str::uuid()->toString(), 'name' => 'عميل نقدي (كاش)', 'email' => 'cash@local.com', 'phone' => '0500000000']);
        CustomerModel::create(['id' => Str::uuid()->toString(), 'name' => 'أسواق التميمي - فرع الياسمين', 'email' => 'tamimi@local.com', 'phone' => '0501111111']);
        
        // 3. Create Suppliers
        SupplierModel::create(['id' => Str::uuid()->toString(), 'name' => 'شركة المراعي', 'email' => 'sales@almarai.com', 'phone' => '0502222222']);
        SupplierModel::create(['id' => Str::uuid()->toString(), 'name' => 'شركة بيبسيكو (جمجوم)', 'email' => 'pepsi@local.com', 'phone' => '0503333333']);
        SupplierModel::create(['id' => Str::uuid()->toString(), 'name' => 'شركة نادك', 'email' => 'sales@nadec.com', 'phone' => '0504444444']);

        // 4. Create FMCG Products
        $products = [
            [
                'name' => 'حليب المراعي طازج 1 لتر',
                'name_ar' => 'حليب المراعي طازج 1 لتر',
                'sku' => 'ALM-1L-001',
                'barcode' => '6281000000010',
                'cost_price' => 4.50,
                'sell_price' => 6.00,
                'stock_alert_level' => 50,
                'unit_of_measure' => 'قطعة',
                'units' => [
                    ['unit_name' => 'كرتون (12 حبة)', 'conversion_factor' => 12, 'sell_price' => 70.00, 'barcode' => '6281000000011']
                ],
                'stock_riyadh' => 200,
                'stock_jeddah' => 150,
            ],
            [
                'name' => 'مياه نوفا عبوة 330 مل',
                'name_ar' => 'مياه نوفا عبوة 330 مل',
                'sku' => 'NOVA-330',
                'barcode' => '6281111000020',
                'cost_price' => 0.50,
                'sell_price' => 1.00,
                'stock_alert_level' => 100,
                'unit_of_measure' => 'قطعة',
                'units' => [
                    ['unit_name' => 'كرتون (40 حبة)', 'conversion_factor' => 40, 'sell_price' => 18.00, 'barcode' => '6281111000021']
                ],
                'stock_riyadh' => 1000,
                'stock_jeddah' => 800,
            ],
            [
                'name' => 'بيبسي كولا علب 320 مل',
                'name_ar' => 'بيبسي كولا علب 320 مل',
                'sku' => 'PEP-320',
                'barcode' => '6281222000030',
                'cost_price' => 2.00,
                'sell_price' => 3.00,
                'stock_alert_level' => 200,
                'unit_of_measure' => 'قطعة',
                'units' => [
                    ['unit_name' => 'شدة (24 حبة)', 'conversion_factor' => 24, 'sell_price' => 55.00, 'barcode' => '6281222000031']
                ],
                'stock_riyadh' => 500,
                'stock_jeddah' => 300,
            ],
            [
                'name' => 'أرز أبو كاس مزة هندي 10 كيلو',
                'name_ar' => 'أرز أبو كاس مزة هندي 10 كيلو',
                'sku' => 'RICE-ABK-10',
                'barcode' => '6281333000040',
                'cost_price' => 65.00,
                'sell_price' => 85.00,
                'stock_alert_level' => 20,
                'unit_of_measure' => 'كيس',
                'units' => [],
                'stock_riyadh' => 100,
                'stock_jeddah' => 50,
            ],
            [
                'name' => 'تايد مسحوق غسيل 5 كيلو',
                'name_ar' => 'تايد مسحوق غسيل 5 كيلو',
                'sku' => 'TIDE-5K',
                'barcode' => '6281444000050',
                'cost_price' => 40.00,
                'sell_price' => 55.00,
                'stock_alert_level' => 15,
                'unit_of_measure' => 'قطعة',
                'units' => [
                    ['unit_name' => 'كرتون (4 حبات)', 'conversion_factor' => 4, 'sell_price' => 210.00, 'barcode' => '6281444000051']
                ],
                'stock_riyadh' => 80,
                'stock_jeddah' => 40,
            ],
            [
                'name' => 'جبنة كرافت شيدر 100 جرام',
                'name_ar' => 'جبنة كرافت شيدر 100 جرام',
                'sku' => 'KRAFT-100',
                'barcode' => '6281555000060',
                'cost_price' => 4.00,
                'sell_price' => 6.00,
                'stock_alert_level' => 30,
                'unit_of_measure' => 'قطعة',
                'units' => [
                    ['unit_name' => 'كرتون (48 حبة)', 'conversion_factor' => 48, 'sell_price' => 250.00, 'barcode' => '6281555000061']
                ],
                'stock_riyadh' => 120,
                'stock_jeddah' => 90,
            ]
        ];

        foreach ($products as $pData) {
            $product = ProductModel::create([
                'id' => Str::uuid()->toString(),
                'name' => $pData['name'],
                'name_ar' => $pData['name_ar'],
                'sku' => $pData['sku'],
                'barcode' => $pData['barcode'],
                'cost_price' => $pData['cost_price'],
                'sell_price' => $pData['sell_price'],
                'vat_rate' => 15.00,
                'stock_alert_level' => $pData['stock_alert_level'],
                'is_active' => true,
                'unit_of_measure' => $pData['unit_of_measure'],
            ]);

            foreach ($pData['units'] as $uData) {
                $product->units()->create($uData);
            }

            WarehouseProductModel::create([
                'id' => Str::uuid()->toString(),
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'quantity' => $pData['stock_riyadh'],
                'average_cost' => $pData['cost_price'],
            ]);

            WarehouseProductModel::create([
                'id' => Str::uuid()->toString(),
                'product_id' => $product->id,
                'warehouse_id' => $warehouseJeddah->id,
                'quantity' => $pData['stock_jeddah'],
                'average_cost' => $pData['cost_price'],
            ]);
        }
    }
}
