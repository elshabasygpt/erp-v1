<?php

declare(strict_types=1);

namespace App\Domain\Purchases\Services;

use App\Domain\Inventory\Services\InventoryForecastingService;
use App\Infrastructure\Eloquent\Models\PurchaseModel;
use App\Infrastructure\Eloquent\Models\PurchaseItemModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SmartPurchaseDrafter
{
    public function __construct(
        private InventoryForecastingService $forecaster
    ) {}

    /**
     * Analyzes inventory and creates a DRAFT purchase order for low stock items.
     */
    public function generateDraftPurchaseInvoice(string $warehouseId, string $userId): array
    {
        $forecasts = $this->forecaster->getLowStockForecasts(10); // alert on <= 10 days

        if (empty($forecasts)) {
            return [
                'status' => 'ignored',
                'message' => 'Inventory is extremely healthy. No smart ordering required.'
            ];
        }

        return DB::connection('tenant')->transaction(function () use ($forecasts, $warehouseId, $userId) {
            
            // Get a default supplier, or create one for "Smart Autodraft" if none exist
            $supplier = SupplierModel::first();
            if (!$supplier) {
                $supplier = SupplierModel::create([
                    'id' => Str::uuid()->toString(),
                    'name' => 'Auto Draft Supplier',
                    'contact_person' => 'AI Manager'
                ]);
            }

            // Figure out the next purchase number
            $last = PurchaseModel::orderBy('created_at', 'desc')->first();
            $nextNum = $last ? ((int) substr($last->invoice_number, 3)) + 1 : 1;
            $poNumber = 'PO-' . str_pad((string) $nextNum, 6, '0', STR_PAD_LEFT);

            // Create draft Purchase
            $purchase = PurchaseModel::create([
                'id' => Str::uuid()->toString(),
                'invoice_number' => $poNumber,
                'supplier_id' => $supplier->id,
                'status' => 'draft',
                'subtotal' => 0,
                'vat_amount' => 0,
                'discount_amount' => 0,
                'total' => 0,
                'warehouse_id' => $warehouseId,
                'invoice_date' => now(),
                'created_by' => $userId,
                'notes' => '⚡ AI Smart Draft: Automatically generated based on 30-day velocity.'
            ]);

            $total = 0;
            $itemsDrafted = 0;

            foreach ($forecasts as $f) {
                if ($f['suggested_reorder_qty'] <= 0) continue;

                $qty = $f['suggested_reorder_qty'];
                // Approximate cost price. We need it from the product.
                $productRecord = \App\Infrastructure\Eloquent\Models\ProductModel::find($f['product_id']);
                $unitCost = $productRecord ? $productRecord->cost_price : 0;
                $lineTotal = round($qty * $unitCost, 2);

                PurchaseItemModel::create([
                    'id' => Str::uuid()->toString(),
                    'purchase_id' => $purchase->id,
                    'product_id' => $f['product_id'],
                    'quantity' => $qty,
                    'unit_price' => $unitCost,
                    'total' => $lineTotal
                ]);

                $total += $lineTotal;
                $itemsDrafted++;
            }

            // Update PO totals
            // Assume 15% VAT for simplicity in auto-draft
            $vat = round($total * 0.15, 2);
            $purchase->update([
                'subtotal' => $total,
                'vat_amount' => $vat,
                'total' => $total + $vat
            ]);

            return [
                'status' => 'success',
                'message' => "Smart Purchase Order $poNumber drafted with $itemsDrafted items.",
                'purchase_id' => $purchase->id
            ];
        });
    }
}
