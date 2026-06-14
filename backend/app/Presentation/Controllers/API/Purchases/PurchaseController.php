<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Purchases;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\PurchaseInvoiceModel;
use App\Application\Purchases\DTOs\CreatePurchaseDTO;
use App\Application\Purchases\UseCases\CreatePurchaseUseCase;
use App\Application\Purchases\UseCases\ConfirmPurchaseUseCase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseController extends BaseController
{
    public function __construct(
        private readonly CreatePurchaseUseCase $createPurchaseUseCase,
        private readonly ConfirmPurchaseUseCase $confirmPurchaseUseCase,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $status = $request->query('status');
        
        $query = PurchaseInvoiceModel::with(['supplier'])->orderBy('invoice_date', 'desc');
        
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $purchases = $query->paginate((int) $limit);

        return $this->paginated($purchases->toArray(), 'Purchases retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'issue_date' => 'required|date',
            'status' => 'required|string|in:draft,confirmed,cancelled',
            'payment_type' => 'required|string|in:cash,credit',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'required|numeric|min:0|max:100',
        ]);

        try {
            $dto = CreatePurchaseDTO::fromRequest($validated);
            $purchase = $this->createPurchaseUseCase->execute($dto, auth()->id() ?? '');
            return $this->created($purchase, 'Purchase invoice created successfully');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Purchase creation failed: ' . $e->getMessage());
            return $this->error('Failed to create purchase invoice: ' . $e->getMessage(), 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $purchase = PurchaseInvoiceModel::find($id);
        if (!$purchase) { return $this->error('Purchase invoice not found', 404); }
        if ($purchase->status !== 'draft') {
            return $this->error('Cannot modify a confirmed invoice. Please use adjustments or returns.', 422);
        }

        $validated = $request->validate([
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'issue_date' => 'required|date',
            'status' => 'required|string|in:draft,confirmed,cancelled',
            'payment_type' => 'required|string|in:cash,credit',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'required|numeric|min:0|max:100',
        ]);

        try {
            // Delete old items and recreate (draft only)
            $purchase->items()->delete();

            $dto = CreatePurchaseDTO::fromRequest(array_merge($validated, ['supplier_id' => $validated['supplier_id']]));
            
            $subtotalAmount = 0;
            $taxAmount = 0;
            foreach ($dto->items as $item) {
                $itemSub = round($item['quantity'] * $item['unit_price'], 2);
                $itemTax = round($itemSub * ($item['tax_rate'] / 100), 2);
                $subtotalAmount += $itemSub;
                $taxAmount += $itemTax;
            }

            $purchase->update([
                'supplier_id' => $dto->supplierId,
                'warehouse_id' => $dto->warehouseId,
                'invoice_date' => $dto->issueDate,
                'subtotal' => round($subtotalAmount, 2),
                'vat_amount' => round($taxAmount, 2),
                'total' => round($subtotalAmount + $taxAmount, 2),
                'status' => $dto->status === 'confirmed' ? 'draft' : $dto->status,
                'notes' => $dto->notes,
            ]);

            foreach ($dto->items as $item) {
                $itemSub = round($item['quantity'] * $item['unit_price'], 2);
                $itemTax = round($itemSub * ($item['tax_rate'] / 100), 2);

                $purchase->items()->create([
                    'id' => \Illuminate\Support\Str::uuid()->toString(),
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'vat_rate' => $item['tax_rate'],
                    'total' => round($itemSub + $itemTax, 2),
                ]);
            }

            // If updating to confirmed, run confirmation
            if ($dto->status === 'confirmed') {
                $this->confirmPurchaseUseCase->execute($purchase->id, $dto->paymentType, auth()->id() ?? '');
                $purchase->refresh();
            }

            return $this->success($purchase->load('items'), 'Purchase invoice updated successfully');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Purchase update failed: ' . $e->getMessage());
            return $this->error('Failed to update purchase invoice: ' . $e->getMessage(), 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        $purchase = PurchaseInvoiceModel::with(['items.product', 'supplier'])->find($id);
        if (!$purchase) { return $this->error('Purchase invoice not found', 404); }
        return $this->success($purchase, 'Purchase invoice retrieved successfully');
    }
    
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $purchase = PurchaseInvoiceModel::find($id);
        if (!$purchase) { return $this->error('Purchase invoice not found', 404); }
        
        $validated = $request->validate([
            'status' => 'required|string|in:draft,confirmed,cancelled',
            'payment_type' => 'nullable|string|in:cash,credit',
        ]);

        if ($purchase->status === 'confirmed' && $validated['status'] !== 'confirmed') {
            return $this->error('A confirmed purchase cannot be reverted. Use Purchase Returns instead.', 403);
        }

        if ($purchase->status !== 'confirmed' && $validated['status'] === 'confirmed') {
            try {
                $paymentType = $validated['payment_type'] ?? 'cash';
                $this->confirmPurchaseUseCase->execute($purchase->id, $paymentType, auth()->id() ?? '');
                $purchase->refresh();
            } catch (\Exception $e) {
                \Log::error('Purchase confirmation failed: ' . $e->getMessage());
                return $this->error('Failed to confirm purchase: ' . $e->getMessage(), 500);
            }
        } else {
            $purchase->update(['status' => $validated['status']]);
        }
        
        return $this->success($purchase, 'Purchase invoice status updated successfully');
    }
}
