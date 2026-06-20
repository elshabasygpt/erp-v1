<?php

declare(strict_types=1);

namespace App\Application\Inventory\UseCases;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Infrastructure\Eloquent\Models\ProductComponentModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * ConfirmAssemblyUseCase
 *
 * Handles assembling raw material components into a finished product
 * (or the reverse, disassembling a finished product back into components):
 * 1. Moves warehouse stock for each component and the finished product
 * 2. Posts the journal entry transferring cost between the raw materials
 *    inventory account and the finished goods inventory account
 */
final class ConfirmAssemblyUseCase
{
    public function __construct(
        private readonly JournalEntryRepositoryInterface $journalEntryRepository,
        private readonly AccountMappingService $accountMapping,
    ) {}

    public function execute(
        string $tenantId,
        string $warehouseId,
        string $productId,
        float $quantity,
        string $type,
        ?string $notes,
        string $userId
    ): string {
        if ($quantity <= 0) {
            throw new DomainException('Quantity must be greater than zero.');
        }

        $isAssemble = $type === 'assemble';

        return DB::connection('tenant')->transaction(function () use ($tenantId, $warehouseId, $productId, $quantity, $isAssemble, $type, $notes, $userId) {
            $components = ProductComponentModel::query()->where('tenant_id', $tenantId)->where('parent_product_id', $productId)->get();
            if ($components->isEmpty()) {
                throw new DomainException('This product has no components defined (BOM is empty).');
            }

            $ref = 'ASM-'.date('Ymd').'-'.strtoupper(Str::random(4));
            $totalCost = 0.0;

            // ── Raw materials ──
            foreach ($components as $component) {
                $rawQtyNeeded = (float) $component->quantity_required * $quantity;

                $rawStock = WarehouseProductModel::query()->lockForUpdate()->firstOrCreate(
                    ['warehouse_id' => $warehouseId, 'product_id' => $component->child_product_id],
                    ['id' => Str::uuid()->toString(), 'quantity' => 0, 'average_cost' => 0]
                );

                $productInfo = ProductModel::query()->where('tenant_id', $tenantId)->find($component->child_product_id);
                $unitCost = (float) $productInfo->cost_price;
                $totalCost += $unitCost * $rawQtyNeeded;

                if ($isAssemble) {
                    if ($rawStock->quantity < $rawQtyNeeded) {
                        throw new DomainException("Insufficient stock for component: {$productInfo->name}. Needed: {$rawQtyNeeded}, Available: {$rawStock->quantity}");
                    }
                    $rawStock->quantity -= $rawQtyNeeded;
                    $movQty = -$rawQtyNeeded;
                } else {
                    $rawStock->quantity += $rawQtyNeeded;
                    $movQty = $rawQtyNeeded;
                }
                $rawStock->save();

                StockMovementModel::query()->create([
                    'tenant_id' => $tenantId,
                    'id' => Str::uuid()->toString(),
                    'product_id' => $component->child_product_id,
                    'warehouse_id' => $warehouseId,
                    'type' => 'adjustment',
                    'quantity' => $movQty,
                    'cost_per_unit' => $unitCost,
                    'reference_type' => 'assembly',
                    'reference_id' => null,
                    'notes' => "Component for {$type} {$ref}".($notes ? " - {$notes}" : ''),
                    'created_by' => $userId,
                ]);
            }

            // ── Finished good ──
            $finishedStock = WarehouseProductModel::query()->lockForUpdate()->firstOrCreate(
                ['warehouse_id' => $warehouseId, 'product_id' => $productId],
                ['id' => Str::uuid()->toString(), 'quantity' => 0, 'average_cost' => 0]
            );

            $finishedUnitCost = $totalCost / $quantity;

            if ($isAssemble) {
                $finishedStock->quantity += $quantity;
                $movQty = $quantity;
            } else {
                if ($finishedStock->quantity < $quantity) {
                    throw new DomainException("Insufficient assembled stock to disassemble. Needed: {$quantity}, Available: {$finishedStock->quantity}");
                }
                $finishedStock->quantity -= $quantity;
                $movQty = -$quantity;
            }
            $finishedStock->save();

            StockMovementModel::query()->create([
                'tenant_id' => $tenantId,
                'id' => Str::uuid()->toString(),
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
                'type' => 'adjustment',
                'quantity' => $movQty,
                'cost_per_unit' => $finishedUnitCost,
                'reference_type' => 'assembly',
                'reference_id' => null,
                'notes' => "Main item {$type} {$ref}".($notes ? " - {$notes}" : ''),
                'created_by' => $userId,
            ]);

            // ── Journal entry: transfer cost between raw materials and finished goods ──
            if ($totalCost > 0) {
                $this->createJournalEntry($ref, $totalCost, $isAssemble, $userId);
            }

            return $ref;
        });
    }

    private function createJournalEntry(string $ref, float $totalCost, bool $isAssemble, string $userId): void
    {
        $rawMaterialsAccount = $this->accountMapping->resolve('inventory');
        $finishedGoodsAccount = $this->accountMapping->resolve('finished_goods_inventory');

        $entry = new JournalEntry(
            id: null,
            entryNumber: $this->journalEntryRepository->getNextEntryNumber(),
            date: new \DateTimeImmutable,
            description: $isAssemble ? "Assembly: {$ref}" : "Disassembly: {$ref}",
            isPosted: false,
            referenceType: 'assembly',
            referenceId: null,
            createdBy: $userId,
        );

        $totalCost = round($totalCost, 2);

        if ($isAssemble) {
            // Assemble: cost moves out of raw materials, into finished goods
            $entry->addLine(new JournalEntryLine(id: null, journalEntryId: '', accountId: $finishedGoodsAccount, debit: $totalCost, credit: 0, description: 'Finished goods produced'));
            $entry->addLine(new JournalEntryLine(id: null, journalEntryId: '', accountId: $rawMaterialsAccount, debit: 0, credit: $totalCost, description: 'Raw materials consumed'));
        } else {
            // Disassemble: cost moves out of finished goods, back into raw materials
            $entry->addLine(new JournalEntryLine(id: null, journalEntryId: '', accountId: $rawMaterialsAccount, debit: $totalCost, credit: 0, description: 'Raw materials restored'));
            $entry->addLine(new JournalEntryLine(id: null, journalEntryId: '', accountId: $finishedGoodsAccount, debit: 0, credit: $totalCost, description: 'Finished goods disassembled'));
        }

        $entry->post();
        $this->journalEntryRepository->create($entry);
    }
}
