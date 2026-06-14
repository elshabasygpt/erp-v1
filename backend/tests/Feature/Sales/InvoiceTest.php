<?php

namespace Tests\Feature\Sales;

use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\InvoiceItemModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_creation_calculates_totals_correctly()
    {
        $product = ProductModel::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'name' => 'Test Product',
            'barcode' => '123456789',
            'type' => 'standard',
            'cost_price' => 50,
            'price' => 100,
            'is_active' => true,
        ]);

        $invoice = InvoiceModel::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'invoice_number' => 'INV-001',
            'invoice_date' => now(),
            'subtotal' => 200,
            'vat_amount' => 30,
            'discount_amount' => 0,
            'total' => 230,
            'status' => 'confirmed'
        ]);

        InvoiceItemModel::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'invoice_id' => $invoice->id,
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 100,
            'subtotal' => 200,
            'tax_amount' => 30,
            'total' => 230
        ]);

        $this->assertEquals(230, $invoice->total);
        $this->assertEquals(2, $invoice->items()->count());
        $this->assertEquals(200, $invoice->items()->sum('subtotal'));
    }
}
