<?php

use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\TenantModel;

$tenantId = TenantModel::first()->id;
$customer = CustomerModel::firstOrCreate(
    ['email' => 'test@example.com'],
    ['tenant_id' => $tenantId, 'name' => 'عميل الاحتفال', 'phone' => '0500000000', 'status' => 'active']
);
$product = ProductModel::firstOrCreate(
    ['sku' => 'TEST-001'],
    ['tenant_id' => $tenantId, 'name' => 'Test Product', 'name_ar' => 'منتج الاحتفال', 'type' => 'physical', 'price' => 150.00, 'cost_price' => 100.00, 'is_active' => true, 'category_id' => null, 'unit_id' => null]
);
echo 'Created Customer ID: '.$customer->id."\n";
echo 'Created Product ID: '.$product->id."\n";
