<?php

namespace Tests\Feature\Inventory;

use App\Infrastructure\Eloquent\Models\DataImportModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductImportHistoryTest extends TestCase
{
    public function test_history_endpoint_returns_past_product_imports()
    {
        $this->actingAsAuthenticatedUser();
        $tenant = '00000000-0000-0000-0000-000000000001';

        DataImportModel::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenant,
            'import_type' => 'products',
            'file_name' => 'parts.xlsx',
            'file_path' => 'imports/parts.xlsx',
            'import_mode' => 'create_update',
            'status' => 'completed',
            'total_rows' => 10,
        ]);

        $response = $this->getJson('/api/inventory/products/imports/history');

        $response->assertStatus(200);
        $items = $response->json('data.items');
        $this->assertNotEmpty($items, 'History must return the previously created import — it was always empty due to a type/import_type column mismatch.');
        $this->assertEquals('parts.xlsx', $items[0]['file_name']);
    }
}
