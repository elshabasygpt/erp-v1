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
use Illuminate\Support\Facades\DB;

class ProcurementController extends BaseTenantController
{
    // ─────────────────────────────────────────────────────────────────────
    // Purchase Requests
    // ─────────────────────────────────────────────────────────────────────

    public function listRequests(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $limit    = (int) $request->query('limit', 15);

        $query = PurchaseRequestModel::where('tenant_id', $tenantId)
            ->with(['items'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('department')) {
            $query->where('department', $request->query('department'));
        }

        $requests = $query->paginate($limit);

        return $this->paginated($requests->toArray(), 'Purchase requests retrieved');
    }

    public function storeRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'department'             => 'nullable|string|max:200',
            'required_date'          => 'nullable|date',
            'notes'                  => 'nullable|string',
            'items'                  => 'required|array|min:1',
            'items.*.product_id'     => 'nullable|uuid|exists:products,id',
            'items.*.description'    => 'required_without:items.*.product_id|string|max:500',
            'items.*.quantity'       => 'required|numeric|min:0.01',
        ]);

        $tenantId = $this->getTenantId($request);

        $pr = PurchaseRequestModel::create([
            'tenant_id'      => $tenantId,
            'request_number' => 'PR-' . strtoupper(Str::random(6)),
            'department'     => $validated['department'] ?? null,
            'required_date'  => $validated['required_date'] ?? null,
            'notes'          => $validated['notes'] ?? null,
            'status'         => 'draft',
            'created_by'     => $request->user()->id,
        ]);

        foreach ($validated['items'] as $item) {
            $pr->items()->create([
                'product_id'  => $item['product_id'] ?? null,
                'description' => $item['description'] ?? null,
                'quantity'    => $item['quantity'],
            ]);
        }

        return $this->success($pr->load('items'), 'Purchase request created', 201);
    }

    public function updateRequestStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:draft,pending_approval,approved,rejected,completed',
            'notes'  => 'nullable|string',
        ]);

        $pr = PurchaseRequestModel::where('tenant_id', $this->getTenantId($request))->find($id);

        if (!$pr) {
            return $this->error('Purchase request not found', 404);
        }

        $pr->update([
            'status'      => $validated['status'],
            'approved_by' => $validated['status'] === 'approved' ? $request->user()->id : null,
        ]);

        return $this->success($pr->load('items'), 'Status updated');
    }

    // ─────────────────────────────────────────────────────────────────────
    // RFQs (Requests for Quotation)
    // ─────────────────────────────────────────────────────────────────────

    public function listRFQs(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $limit    = (int) $request->query('limit', 15);

        $query = RFQModel::where('tenant_id', $tenantId)
            ->with(['items', 'purchaseRequest', 'quotations'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $rfqs = $query->paginate($limit);

        return $this->paginated($rfqs->toArray(), 'RFQs retrieved');
    }

    public function storeRFQ(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'purchase_request_id'  => 'nullable|uuid',
            'deadline_date'        => 'nullable|date',
            'terms_and_conditions' => 'nullable|string',
            'items'                => 'required|array|min:1',
            'items.*.product_id'   => 'nullable|uuid|exists:products,id',
            'items.*.description'  => 'required_without:items.*.product_id|string|max:500',
            'items.*.quantity'     => 'required|numeric|min:0.01',
        ]);

        $tenantId = $this->getTenantId($request);

        // تحقق إن purchase_request_id تابع لنفس الـ tenant
        if (!empty($validated['purchase_request_id'])) {
            $prExists = PurchaseRequestModel::where('tenant_id', $tenantId)
                ->where('id', $validated['purchase_request_id'])
                ->exists();

            if (!$prExists) {
                return $this->error('Purchase request not found or does not belong to your account', 422);
            }
        }

        $rfq = RFQModel::create([
            'tenant_id'            => $tenantId,
            'rfq_number'           => 'RFQ-' . strtoupper(Str::random(6)),
            'purchase_request_id'  => $validated['purchase_request_id'] ?? null,
            'deadline_date'        => $validated['deadline_date'] ?? null,
            'terms_and_conditions' => $validated['terms_and_conditions'] ?? null,
            'status'               => 'draft',
            'created_by'           => $request->user()->id,
        ]);

        foreach ($validated['items'] as $item) {
            $rfq->items()->create([
                'product_id'  => $item['product_id'] ?? null,
                'description' => $item['description'] ?? null,
                'quantity'    => $item['quantity'],
            ]);
        }

        return $this->success($rfq->load('items'), 'RFQ created', 201);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Purchase Orders
    // ─────────────────────────────────────────────────────────────────────

    public function listOrders(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $limit    = (int) $request->query('limit', 15);

        $query = PurchaseOrderModel::where('tenant_id', $tenantId)
            ->with(['items', 'supplier'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->query('supplier_id'));
        }

        $pos = $query->paginate($limit);

        return $this->paginated($pos->toArray(), 'Purchase orders retrieved');
    }

    public function storeOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id'              => 'required|uuid|exists:suppliers,id',
            'purchase_request_id'      => 'nullable|uuid',
            'expected_delivery_date'   => 'nullable|date',
            'notes'                    => 'nullable|string',
            'items'                    => 'required|array|min:1',
            'items.*.product_id'       => 'required|uuid|exists:products,id',
            'items.*.quantity'         => 'required|numeric|min:0.01',
            'items.*.unit_price'       => 'required|numeric|min:0',
            'items.*.tax_rate'         => 'required|numeric|min:0|max:100',
        ]);

        $tenantId = $this->getTenantId($request);

        // تحقق إن purchase_request_id تابع لنفس الـ tenant
        if (!empty($validated['purchase_request_id'])) {
            $prExists = PurchaseRequestModel::where('tenant_id', $tenantId)
                ->where('id', $validated['purchase_request_id'])
                ->exists();

            if (!$prExists) {
                return $this->error('Purchase request not found or does not belong to your account', 422);
            }
        }

        $subtotal = 0.0;
        $vatTotal = 0.0;

        foreach ($validated['items'] as $item) {
            $lineSub  = $item['quantity'] * $item['unit_price'];
            $lineVat  = $lineSub * ($item['tax_rate'] / 100);
            $subtotal += $lineSub;
            $vatTotal += $lineVat;
        }

        $po = DB::connection('tenant')->transaction(function () use ($validated, $tenantId, $subtotal, $vatTotal, $request) {
            $po = PurchaseOrderModel::create([
                'tenant_id'              => $tenantId,
                'po_number'              => 'PO-' . strtoupper(Str::random(6)),
                'supplier_id'            => $validated['supplier_id'],
                'purchase_request_id'    => $validated['purchase_request_id'] ?? null,
                'subtotal'               => round($subtotal, 2),
                'vat_amount'             => round($vatTotal, 2),
                'total'                  => round($subtotal + $vatTotal, 2),
                'status'                 => 'draft',
                'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,
                'notes'                  => $validated['notes'] ?? null,
                'created_by'             => $request->user()->id,
            ]);

            foreach ($validated['items'] as $item) {
                $lineSub = $item['quantity'] * $item['unit_price'];
                $lineVat = $lineSub * ($item['tax_rate'] / 100);

                $po->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity'   => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'vat_rate'   => $item['tax_rate'],
                    'vat_amount' => round($lineVat, 2),
                    'total'      => round($lineSub + $lineVat, 2),
                ]);
            }

            return $po;
        });

        return $this->success($po->load(['items', 'supplier']), 'Purchase order created', 201);
    }

    public function updateOrderStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:draft,sent,confirmed,partially_received,received,cancelled',
            'notes'  => 'nullable|string',
        ]);

        $po = PurchaseOrderModel::where('tenant_id', $this->getTenantId($request))->find($id);

        if (!$po) {
            return $this->error('Purchase order not found', 404);
        }

        // منع إعادة فتح أمر مُلغى
        if ($po->status === 'cancelled' && $validated['status'] !== 'cancelled') {
            return $this->error('Cannot reopen a cancelled purchase order', 422);
        }

        $po->update(['status' => $validated['status']]);

        return $this->success($po->load(['items', 'supplier']), 'PO status updated');
    }
}
