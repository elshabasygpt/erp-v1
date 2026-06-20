<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Purchases;

use App\Application\Purchases\UseCases\ConfirmPurchaseReturnUseCase;
use App\Infrastructure\Eloquent\Models\PurchaseReturnItemModel;
use App\Infrastructure\Eloquent\Models\PurchaseReturnModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseReturnController extends BaseTenantController
{
    public function __construct(
        private readonly ConfirmPurchaseReturnUseCase $confirmPurchaseReturnUseCase,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $status = $request->query('status');

        $query = PurchaseReturnModel::query()->where('tenant_id', $this->getTenantId($request))->with(['supplier', 'purchaseInvoice'])->orderBy('issue_date', 'desc');

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
            DB::connection('tenant')->beginTransaction();

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
            $returnNumber = 'PR-'.str_pad((string) $nextNum, 6, '0', STR_PAD_LEFT);

            // Create as draft first; ConfirmPurchaseReturnUseCase is the single source of truth
            // for stock, supplier balance, and accounting once a return is completed.
            $purchaseReturn = PurchaseReturnModel::query()->create([
                'tenant_id' => $this->getTenantId($request),
                'id' => $returnId,
                'number' => $returnNumber,
                'purchase_invoice_id' => $validated['purchase_invoice_id'] ?? null,
                'supplier_id' => $validated['supplier_id'],
                'issue_date' => $validated['issue_date'],
                'total_amount' => $totalAmount,
                'tax_amount' => $taxAmount,
                'status' => $validated['status'] === 'completed' ? 'draft' : $validated['status'],
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                $subtotal = $item['quantity'] * $item['unit_price'];
                $itemTax = $subtotal * ($item['tax_rate'] / 100);

                PurchaseReturnItemModel::query()->create([
                    'tenant_id' => $this->getTenantId($request),
                    'id' => Str::uuid()->toString(),
                    'purchase_return_id' => $purchaseReturn->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'tax_rate' => $item['tax_rate'],
                    'tax_amount' => $itemTax,
                    'total' => $subtotal + $itemTax,
                ]);
            }

            DB::connection('tenant')->commit();

            if ($validated['status'] === 'completed') {
                $this->confirmPurchaseReturnUseCase->execute($purchaseReturn->id, $validated['warehouse_id'], (string) ($request->user()->id ?? ''));
                $purchaseReturn->refresh();
            }

            return $this->success($purchaseReturn->load('items'), 'Purchase return created successfully', 201);

        } catch (\Exception $e) {
            if (DB::connection('tenant')->transactionLevel() > 0) {
                DB::connection('tenant')->rollBack();
            }

            return $this->error('Failed to create purchase return: '.$e->getMessage(), 500);
        }
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $purchaseReturn = PurchaseReturnModel::query()->where('tenant_id', $this->getTenantId($request))->with(['items.product', 'supplier', 'purchaseInvoice'])->find($id);

        if (! $purchaseReturn) {
            return $this->error('Purchase return not found', 404);
        }

        return $this->success($purchaseReturn, 'Purchase return retrieved successfully');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $purchaseReturn = PurchaseReturnModel::query()->where('tenant_id', $this->getTenantId($request))->with('items')->find($id);

        if (! $purchaseReturn) {
            return $this->error('Purchase return not found', 404);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:draft,completed,cancelled',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
        ]);

        if ($purchaseReturn->status === 'draft' && $validated['status'] === 'completed') {
            try {
                $this->confirmPurchaseReturnUseCase->execute($id, $validated['warehouse_id'], (string) ($request->user()->id ?? ''));
                $purchaseReturn->refresh();
            } catch (\Throwable $e) {
                return $this->error('Failed to complete return process: '.$e->getMessage(), 500);
            }
        } else {
            $purchaseReturn->update(['status' => $validated['status']]);
        }

        return $this->success($purchaseReturn, 'Purchase return status updated');
    }
}
