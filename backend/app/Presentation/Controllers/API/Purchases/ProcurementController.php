<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Purchases;

use App\Infrastructure\Eloquent\Models\PurchaseRequestModel;
use App\Infrastructure\Eloquent\Models\RFQModel;
use App\Infrastructure\Eloquent\Models\PurchaseOrderModel;
use App\Infrastructure\Eloquent\Models\SupplierQuotationModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProcurementController extends BaseTenantController
{
    // --- Purchase Requests ---
    public function listRequests(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $requests = PurchaseRequestModel::query()
            ->with(['items'])
            ->orderBy('created_at', 'desc')
            ->paginate((int) $limit);

        return $this->paginated($requests->toArray(), 'Purchase requests retrieved');
    }

    public function storeRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'department' => 'nullable|string',
            'required_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|uuid',
            'items.*.description' => 'required_without:items.*.product_id|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
        ]);

        $pr = PurchaseRequestModel::create([
            'request_number' => 'PR-' . strtoupper(Str::random(6)),
            'department' => $validated['department'] ?? null,
            'required_date' => $validated['required_date'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => 'draft',
            'created_by' => auth()->id(),
        ]);

        foreach ($validated['items'] as $item) {
            $pr->items()->create([
                'product_id' => $item['product_id'] ?? null,
                'description' => $item['description'] ?? null,
                'quantity' => $item['quantity'],
            ]);
        }

        return $this->success($pr->load('items'), 'Purchase request created', 201);
    }

    public function updateRequestStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:draft,pending_approval,approved,rejected',
        ]);

        $pr = PurchaseRequestModel::findOrFail($id);
        $pr->update([
            'status' => $validated['status'],
            'approved_by' => $validated['status'] === 'approved' ? auth()->id() : null,
        ]);

        return $this->success($pr, 'Status updated');
    }

    // --- RFQs ---
    public function listRFQs(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $rfqs = RFQModel::query()
            ->with(['items', 'purchaseRequest', 'quotations'])
            ->orderBy('created_at', 'desc')
            ->paginate((int) $limit);

        return $this->paginated($rfqs->toArray(), 'RFQs retrieved');
    }

    public function storeRFQ(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'purchase_request_id' => 'nullable|uuid|exists:purchase_requests,id',
            'deadline_date' => 'nullable|date',
            'terms_and_conditions' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|uuid',
            'items.*.description' => 'required_without:items.*.product_id|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
        ]);

        $rfq = RFQModel::create([
            'rfq_number' => 'RFQ-' . strtoupper(Str::random(6)),
            'purchase_request_id' => $validated['purchase_request_id'] ?? null,
            'deadline_date' => $validated['deadline_date'] ?? null,
            'terms_and_conditions' => $validated['terms_and_conditions'] ?? null,
            'status' => 'draft',
            'created_by' => auth()->id(),
        ]);

        foreach ($validated['items'] as $item) {
            $rfq->items()->create([
                'product_id' => $item['product_id'] ?? null,
                'description' => $item['description'] ?? null,
                'quantity' => $item['quantity'],
            ]);
        }

        return $this->success($rfq->load('items'), 'RFQ created', 201);
    }

    // --- Purchase Orders ---
    public function listOrders(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $pos = PurchaseOrderModel::query()
            ->with(['items', 'supplier'])
            ->orderBy('created_at', 'desc')
            ->paginate((int) $limit);

        return $this->paginated($pos->toArray(), 'Purchase orders retrieved');
    }

    public function storeOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            'purchase_request_id' => 'nullable|uuid|exists:purchase_requests,id',
            'expected_delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'required|numeric|min:0',
        ]);

        $subtotal = 0;
        $vatTotal = 0;

        foreach ($validated['items'] as $item) {
            $lineSub = $item['quantity'] * $item['unit_price'];
            $lineVat = $lineSub * ($item['tax_rate'] / 100);
            $subtotal += $lineSub;
            $vatTotal += $lineVat;
        }

        $po = PurchaseOrderModel::create([
            'po_number' => 'PO-' . strtoupper(Str::random(6)),
            'supplier_id' => $validated['supplier_id'],
            'purchase_request_id' => $validated['purchase_request_id'] ?? null,
            'subtotal' => $subtotal,
            'vat_amount' => $vatTotal,
            'total' => $subtotal + $vatTotal,
            'status' => 'draft',
            'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'created_by' => auth()->id(),
        ]);

        foreach ($validated['items'] as $item) {
            $lineSub = $item['quantity'] * $item['unit_price'];
            $lineVat = $lineSub * ($item['tax_rate'] / 100);
            $po->items()->create([
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'vat_rate' => $item['tax_rate'],
                'vat_amount' => $lineVat,
                'total' => $lineSub + $lineVat,
            ]);
        }

        return $this->success($po->load('items'), 'Purchase order created', 201);
    }

    public function updateOrderStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:draft,sent,confirmed,cancelled',
        ]);

        $po = PurchaseOrderModel::findOrFail($id);
        $po->update(['status' => $validated['status']]);

        return $this->success($po, 'PO Status updated');
    }
}
