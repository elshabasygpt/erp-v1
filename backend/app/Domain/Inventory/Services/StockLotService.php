<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Services;

use App\Infrastructure\Eloquent\Models\Inventory\StockLotModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use DomainException;

/**
 * StockLotService
 *
 * Handles logic for Batch and Serial Tracking.
 */
class StockLotService
{
    /**
     * Add stock to a specific lot/serial.
     */
    public function addLot(array $data, string $userId): StockLotModel
    {
        $data['id'] = Str::uuid()->toString();
        $data['created_by'] = $userId;

        return StockLotModel::create($data);
    }

    /**
     * Deduct stock from a specific lot/serial.
     */
    public function deductLot(string $lotId, float $quantity, string $warehouseId): void
    {
        $lot = StockLotModel::where('id', $lotId)->where('warehouse_id', $warehouseId)->lockForUpdate()->first();

        if (!$lot) {
            throw new DomainException("Stock lot not found in the specified warehouse.");
        }

        if ($lot->quantity < $quantity) {
            throw new DomainException("Insufficient stock in lot {$lot->lot_number} / serial {$lot->serial_number}.");
        }

        $lot->quantity -= $quantity;
        $lot->save();
    }
}
