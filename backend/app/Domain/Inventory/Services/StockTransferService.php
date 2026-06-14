<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Services;

use App\Infrastructure\Eloquent\Models\StockTransferModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Exception;

class StockTransferService
{
    /**
     * Create a new draft stock transfer
     */
    public function createTransfer(array $data, string $userId): StockTransferModel
    {
        return DB::connection('tenant')->transaction(function () use ($data, $userId) {
            $transfer = StockTransferModel::create([
                'reference_number' => 'ST-' . strtoupper(Str::random(8)),
                'from_warehouse_id' => $data['from_warehouse_id'],
                'to_warehouse_id' => $data['to_warehouse_id'],
                'status' => 'draft',
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
            ]);

            foreach ($data['items'] as $item) {
                $transfer->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                ]);
            }

            return $transfer->load('items');
        });
    }

    /**
     * Approve transfer: Changes status to in_transit and deducts stock from source warehouse
     */
    public function approveTransfer(string $transferId, string $userId): StockTransferModel
    {
        return DB::connection('tenant')->transaction(function () use ($transferId, $userId) {
            $transfer = StockTransferModel::with('items')->findOrFail($transferId);

            if ($transfer->status !== 'draft') {
                throw new Exception("Only draft transfers can be approved.");
            }

            foreach ($transfer->items as $item) {
                // Deduct from source warehouse (with pessimistic lock)
                $sourceStock = WarehouseProductModel::where('warehouse_id', $transfer->from_warehouse_id)
                    ->where('product_id', $item->product_id)
                    ->lockForUpdate()
                    ->first();

                if (!$sourceStock || $sourceStock->quantity < $item->quantity) {
                    throw new Exception("Insufficient stock in source warehouse for product ID: {$item->product_id}");
                }

                $sourceStock->decrement('quantity', $item->quantity);

                // Log movement
                StockMovementModel::create([
                    'product_id' => $item->product_id,
                    'warehouse_id' => $transfer->from_warehouse_id,
                    'type' => 'out',
                    'quantity' => $item->quantity,
                    'reference_type' => 'transfer',
                    'reference_id' => $transfer->id,
                    'created_by' => $userId,
                ]);
            }

            $transfer->update([
                'status' => 'in_transit',
                'approved_by' => $userId,
                'approved_at' => now(),
            ]);

            return $transfer;
        });
    }

    /**
     * Receive transfer: Changes status to received and adds stock to destination warehouse
     */
    public function receiveTransfer(string $transferId, string $userId, array $receivedItems = []): StockTransferModel
    {
        return DB::connection('tenant')->transaction(function () use ($transferId, $userId, $receivedItems) {
            $transfer = StockTransferModel::with('items')->findOrFail($transferId);

            if ($transfer->status !== 'in_transit') {
                throw new Exception("Only in-transit transfers can be received.");
            }

            // Map received items if partial receives are allowed, otherwise assume fully received
            $receivedMap = [];
            foreach ($receivedItems as $ri) {
                $receivedMap[$ri['id']] = $ri['received_quantity'];
            }

            foreach ($transfer->items as $item) {
                $qtyToReceive = isset($receivedMap[$item->id]) ? $receivedMap[$item->id] : $item->quantity;
                
                $item->update(['received_quantity' => $qtyToReceive]);

                if ($qtyToReceive > 0) {
                    // Add to destination warehouse
                    $destStock = WarehouseProductModel::firstOrCreate(
                        ['warehouse_id' => $transfer->to_warehouse_id, 'product_id' => $item->product_id],
                        ['quantity' => 0, 'average_cost' => 0]
                    );

                    $destStock->increment('quantity', $qtyToReceive);

                    // Log movement
                    StockMovementModel::create([
                        'product_id' => $item->product_id,
                        'warehouse_id' => $transfer->to_warehouse_id,
                        'type' => 'in',
                        'quantity' => $qtyToReceive,
                        'reference_type' => 'transfer',
                        'reference_id' => $transfer->id,
                        'created_by' => $userId,
                    ]);
                }
            }

            $transfer->update([
                'status' => 'received',
                'received_by' => $userId,
                'received_at' => now(),
            ]);

            return $transfer;
        });
    }
}
