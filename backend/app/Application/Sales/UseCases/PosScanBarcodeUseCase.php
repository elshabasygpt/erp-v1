<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\ProductUnitModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;

final class PosScanBarcodeUseCase
{
    /**
     * Scan a barcode at the POS cashier.
     *
     * Lookup order:
     *   1. product_units.barcode  → unit-level (pack / carton)
     *   2. products.barcode       → base product
     *   3. products.sku           → typed-entry fallback
     *
     * Inactive products are returned with is_active = false so the
     * frontend can warn the cashier but still allow override if needed.
     * Superseded products return a superseded_by block so the cashier
     * can switch to the replacement with one tap.
     */
    public function execute(string $barcode, ?string $warehouseId): array
    {
        // 1. Unit-level barcode
        $unit = ProductUnitModel::query()
            ->where('barcode', $barcode)
            ->with(['product', 'product.supersededBy'])
            ->first();

        if ($unit && $unit->product) {
            return $this->buildUnitResponse($unit, $warehouseId);
        }

        // 2. Product barcode or SKU (exact match on either column)
        $product = ProductModel::query()
            ->with('supersededBy')
            ->where(function ($q) use ($barcode) {
                $q->where('barcode', $barcode)
                  ->orWhere('sku', $barcode);
            })
            ->first();

        if ($product) {
            return $this->buildProductResponse($product, $warehouseId);
        }

        return ['found' => false, 'message' => 'Product not found'];
    }

    private function buildProductResponse(ProductModel $product, ?string $warehouseId): array
    {
        $sellPrice = (float) $product->sell_price;
        $vatRate   = (float) $product->vat_rate;
        $vatAmount = round($sellPrice * $vatRate / 100, 2);

        return [
            'found'               => true,
            'scanned_as'          => 'product',
            'product_id'          => $product->id,
            'name'                => $product->name,
            'name_ar'             => $product->name_ar,
            'sku'                 => $product->sku,
            'barcode'             => $product->barcode,
            'sell_price'          => $sellPrice,
            'wholesale_price'     => (float) $product->wholesale_price,
            'semi_wholesale_price'=> (float) $product->semi_wholesale_price,
            'vat_rate'            => $vatRate,
            'vat_amount'          => $vatAmount,
            'price_with_vat'      => round($sellPrice + $vatAmount, 2),
            'unit'                => null,
            'unit_of_measure'     => $product->unit_of_measure,
            'quantity'            => 1,
            'stock_available'     => $warehouseId ? $this->getStock($product->id, $warehouseId) : null,
            'has_core_charge'     => (bool) $product->has_core_charge,
            'core_charge_amount'  => (float) $product->core_charge_amount,
            'image_url'           => $product->image_url,
            'is_active'           => (bool) $product->is_active,
            'superseded_by'       => $this->supersededBy($product),
        ];
    }

    private function buildUnitResponse(ProductUnitModel $unit, ?string $warehouseId): array
    {
        $product = $unit->product;

        $unitSellPrice = ($unit->sell_price !== null && (float) $unit->sell_price > 0)
            ? (float) $unit->sell_price
            : round((float) $product->sell_price * (float) $unit->conversion_factor, 2);

        $vatRate   = (float) $product->vat_rate;
        $vatAmount = round($unitSellPrice * $vatRate / 100, 2);
        $factor    = (float) $unit->conversion_factor;

        $baseStock = $warehouseId ? $this->getStock($product->id, $warehouseId) : null;
        $unitStock = $baseStock !== null && $factor > 0
            ? floor($baseStock / $factor)
            : null;

        return [
            'found'               => true,
            'scanned_as'          => 'unit',
            'product_id'          => $product->id,
            'name'                => $product->name,
            'name_ar'             => $product->name_ar,
            'sku'                 => $product->sku,
            'barcode'             => $unit->barcode,
            'sell_price'          => $unitSellPrice,
            'wholesale_price'     => (float) $product->wholesale_price,
            'semi_wholesale_price'=> (float) $product->semi_wholesale_price,
            'vat_rate'            => $vatRate,
            'vat_amount'          => $vatAmount,
            'price_with_vat'      => round($unitSellPrice + $vatAmount, 2),
            'unit'                => [
                'id'                => $unit->id,
                'name'              => $unit->unit_name,
                'conversion_factor' => $factor,
                'sell_price'        => $unitSellPrice,
            ],
            'unit_of_measure'     => $product->unit_of_measure,
            // quantity = conversion_factor so invoice deducts the correct base units
            'quantity'            => $factor,
            'stock_available'     => $unitStock,
            'has_core_charge'     => (bool) $product->has_core_charge,
            'core_charge_amount'  => (float) $product->core_charge_amount,
            'image_url'           => $product->image_url,
            'is_active'           => (bool) $product->is_active,
            'superseded_by'       => $this->supersededBy($product),
        ];
    }

    /** Returns a minimal stub of the replacement product, or null. */
    private function supersededBy(ProductModel $product): ?array
    {
        $replacement = $product->supersededBy;

        if (! $replacement) {
            return null;
        }

        return [
            'product_id' => $replacement->id,
            'name'       => $replacement->name,
            'name_ar'    => $replacement->name_ar,
            'sku'        => $replacement->sku,
            'barcode'    => $replacement->barcode,
            'sell_price' => (float) $replacement->sell_price,
        ];
    }

    private function getStock(string $productId, string $warehouseId): float
    {
        $row = WarehouseProductModel::query()
            ->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->first();

        return $row ? (float) $row->quantity : 0.0;
    }
}
