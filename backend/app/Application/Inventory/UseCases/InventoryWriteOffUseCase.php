<?php

declare(strict_types=1);

namespace App\Application\Inventory\UseCases;

use App\Application\Services\InventoryService;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use DomainException;
use Illuminate\Support\Facades\DB;

final class InventoryWriteOffUseCase
{
    public function __construct(
        private readonly InventoryService $inventoryService,
        private readonly JournalEntryRepositoryInterface $journalEntryRepository,
        private readonly AccountMappingService $accountMapping
    ) {}

    public function execute(string $tenantId, string $warehouseId, string $productId, float $quantityToWriteOff, string $reason, string $userId): void
    {
        DB::connection('tenant')->transaction(function () use ($tenantId, $warehouseId, $productId, $quantityToWriteOff, $reason, $userId) {
            if ($quantityToWriteOff <= 0) {
                throw new DomainException('Quantity to write off must be greater than zero.');
            }

            $currentStock = WarehouseProductModel::query()->where('tenant_id', $tenantId)
                ->where('warehouse_id', $warehouseId)
                ->where('product_id', $productId)
                ->first();

            if (! $currentStock || $currentStock->quantity < $quantityToWriteOff) {
                throw new DomainException('Insufficient stock to write off.');
            }

            $product = ProductModel::query()->where('tenant_id', $tenantId)->findOrFail($productId);
            $unitCost = $product->cost_price;

            // Reduce stock
            $currentStock->quantity -= $quantityToWriteOff;
            $currentStock->save();

            // Log movement
            $this->inventoryService->logMovement(
                $tenantId,
                $productId,
                $warehouseId,
                'out',
                $quantityToWriteOff,
                $unitCost,
                'write_off',
                null,
                "Write-off: {$reason}",
                $userId
            );

            // Generate Journal Entry
            $totalLoss = $quantityToWriteOff * $unitCost;
            if ($totalLoss > 0) {
                $entry = new JournalEntry(
                    id: null,
                    entryNumber: $this->journalEntryRepository->getNextEntryNumber(),
                    date: new \DateTimeImmutable,
                    description: "Inventory Write-Off: {$reason}",
                    isPosted: true,
                    referenceType: 'inventory_write_off',
                    referenceId: null,
                    createdBy: $userId
                );

                $inventoryAccount = $this->accountMapping->resolve('inventory');
                $shrinkageAccount = $this->accountMapping->resolve('inventory_shrinkage');

                // Loss: Debit Shrinkage, Credit Inventory
                $entry->addLine(new JournalEntryLine(id: null, journalEntryId: '', accountId: $shrinkageAccount, debit: $totalLoss, credit: 0, description: 'Inventory Write-Off Loss'));
                $entry->addLine(new JournalEntryLine(id: null, journalEntryId: '', accountId: $inventoryAccount, debit: 0, credit: $totalLoss, description: 'Inventory Write-Off Reduction'));

                $this->journalEntryRepository->create($entry);
            }
        });
    }
}
