<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Purchases;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\PurchaseReturnModel;
use App\Infrastructure\Eloquent\Models\PurchaseReturnItemModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseReturnController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $status = $request->query('status');

        $query = PurchaseReturnModel::with(['supplier', 'purchaseInvoice'])->orderBy('issue_date', 'desc');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $returns = $query->paginate((int) $limit);

        return $this->paginated($returns->toArray(), 'Purchase returns retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'purchase_invoice_id' => 'nullable|uuid|exists:purchase_invoices,id',
            'issue_date' => 'required|date',
            'status' => 'required|string|in:draft,completed,cancelled',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'required|numeric|min:0|max:100',
        ]);

        try {
            DB::beginTransaction();

            $returnId = Str::uuid()->toString();
            $totalAmount = 0;
            $taxAmount = 0;

            foreach ($validated['items'] as $item) {
                $subtotal = $item['quantity'] * $item['unit_price'];
                $itemTax = $subtotal * ($item['tax_rate'] / 100);
                $totalAmount += ($subtotal + $itemTax);
                $taxAmount += $itemTax;
            }

            $lastReturn = PurchaseReturnModel::latest('created_at')->first();
            $nextNum = $lastReturn ? ((int) str_replace('PR-', '', $lastReturn->number)) + 1 : 1;
            $returnNumber = 'PR-' . str_pad((string)$nextNum, 6, '0', STR_PAD_LEFT);

            $purchaseReturn = PurchaseReturnModel::create([
                'id' => $returnId,
                'number' => $returnNumber,
                'purchase_invoice_id' => $validated['purchase_invoice_id'] ?? null,
                'supplier_id' => $validated['supplier_id'],
                'issue_date' => $validated['issue_date'],
                'total_amount' => $totalAmount,
                'tax_amount' => $taxAmount,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                $subtotal = $item['quantity'] * $item['unit_price'];
                $itemTax = $subtotal * ($item['tax_rate'] / 100);

                PurchaseReturnItemModel::create([
                    'id' => Str::uuid()->toString(),
                    'purchase_return_id' => $purchaseReturn->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'tax_rate' => $item['tax_rate'],
                    'tax_amount' => $itemTax,
                    'total' => $subtotal + $itemTax,
                ]);

                // Update stock if completed immediately
                if ($validated['status'] === 'completed') {
                    $wp = WarehouseProductModel::where([
                        'warehouse_id' => $validated['warehouse_id'],
                        'product_id' => $item['product_id']
                    ])->first();

                    if ($wp) {
                        $wp->quantity -= $item['quantity'];
                        $wp->save();
                    }

                    StockMovementModel::create([
                        'id' => Str::uuid()->toString(),
                        'product_id' => $item['product_id'],
                        'warehouse_id' => $validated['warehouse_id'],
                        'type' => 'out',
                        'quantity' => -($item['quantity']),
                        'reference_id' => $purchaseReturn->id,
                        'reference_type' => 'purchase_return',
                        'date' => now(),
                    ]);
                }
            }

            // Update Supplier Balance (Subtract the total since they owe us back or we owe them less)
            if ($validated['status'] === 'completed') {
                $supplier = SupplierModel::find($validated['supplier_id']);
                $supplier->balance -= $totalAmount;
                $supplier->save();
            }

            DB::commit();

            return $this->success($purchaseReturn->load('items'), 'Purchase return created successfully', 201);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Failed to create purchase return: ' . $e->getMessage(), 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        $purchaseReturn = PurchaseReturnModel::with(['items.product', 'supplier', 'purchaseInvoice'])->find($id);

        if (!$purchaseReturn) {
            return $this->error('Purchase return not found', 404);
        }

        return $this->success($purchaseReturn, 'Purchase return retrieved successfully');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $purchaseReturn = PurchaseReturnModel::with('items')->find($id);

        if (!$purchaseReturn) {
            return $this->error('Purchase return not found', 404);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:draft,completed,cancelled',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
        ]);

        if ($purchaseReturn->status === 'draft' && $validated['status'] === 'completed') {
            DB::beginTransaction();
            try {
                // Deduct from stock
                foreach ($purchaseReturn->items as $item) {
                    $wp = WarehouseProductModel::where([
                        'warehouse_id' => $validated['warehouse_id'],
                        'product_id' => $item->product_id
                    ])->first();

                    if ($wp) {
                        $wp->quantity -= $item->quantity;
                        $wp->save();
                    }

                    StockMovementModel::create([
                        'id' => Str::uuid()->toString(),
                        'product_id' => $item->product_id,
                        'warehouse_id' => $validated['warehouse_id'],
                        'type' => 'out',
                        'quantity' => -($item->quantity),
                        'reference_id' => $purchaseReturn->id,
                        'reference_type' => 'purchase_return',
                        'date' => now(),
                    ]);
                }

                // Balance adjustment
                $supplier = SupplierModel::find($purchaseReturn->supplier_id);
                $supplier->balance -= $purchaseReturn->total_amount;
                $supplier->save();

                $purchaseReturn->update(['status' => 'completed']);

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                return $this->error('Failed to complete return process: ' . $e->getMessage(), 500);
            }
        } else {
            $purchaseReturn->update(['status' => $validated['status']]);
        }

        return $this->success($purchaseReturn, 'Purchase return status updated');
    }
}
