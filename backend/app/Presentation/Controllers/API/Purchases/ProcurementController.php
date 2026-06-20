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
        $limit    = (int) $request->input('limit', 15);

        $query = PurchaseRequestModel::query()->where(['tenant_id' => $tenantId])
            ->with(['items'])
            ->latest();

        if ($request->filled('status')) {
            $query->where(['status' => $request->query('status')]);
        }
        if ($request->filled('department')) {
            $query->where(['department' => $request->query('department')]);
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

        $pr = PurchaseRequestModel::query()->where(['tenant_id' => $this->getTenantId($request)])->find($id);

        if (!$pr) {
            return $this->error('Purchase request not found', 404);
        }

        $updateData = ['status' => $validated['status']];
        
        if ($validated['status'] === 'approved') {
            $updateData['approved_by'] = $request->user()->id;
        } elseif (in_array($validated['status'], ['draft', 'rejected'])) {
            $updateData['approved_by'] = null;
        }

        if (in_array($validated['status'], ['draft', 'rejected', 'pending_approval'])) {
            $hasPO = PurchaseOrderModel::query()->where(['purchase_request_id' => $pr->id])->exists();
            if ($hasPO) {
                return $this->error('لا يمكن التراجع عن حالة الطلب لارتباطه بأمر شراء فعلي', 422);
            }
        }

        $pr->update($updateData);

        return $this->success($pr->load('items'), 'Status updated');
    }

    public function convertToPO(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $pr = PurchaseRequestModel::query()->where(['tenant_id' => $tenantId])->with('items')->find($id);

        if (!$pr) {
            return $this->error('Purchase request not found', 404);
        }

        if ($pr->status !== 'approved') {
            return $this->error('Purchase request must be approved first', 422);
        }

        if (!$pr->suggested_supplier_id) {
            return $this->error('Purchase request does not have a suggested supplier', 422);
        }

        // Prevent Duplicate POs
        if (PurchaseOrderModel::query()->where(['purchase_request_id' => $pr->id])->exists()) {
            return $this->error('يوجد أمر شراء بالفعل مرتبط بهذا الطلب', 422);
        }

        // Validate items have product_id
        foreach ($pr->items as $item) {
            if (!$item->product_id) {
                return $this->error('لا يمكن التحويل لأن بعض الأصناف غير مرتبطة بمنتج معرف في النظام', 422);
            }
        }

        $po = DB::connection('tenant')->transaction(function () use ($pr, $tenantId, $request) {
            $lastNum = PurchaseOrderModel::query()->where(['tenant_id' => $tenantId])
                ->max(DB::raw("CAST(SUBSTR(po_number, 4) AS INTEGER)")) ?? 0;
            $poNumber = 'PO-' . str_pad((string) ($lastNum + 1), 6, '0', STR_PAD_LEFT);

            $subtotal = 0;
            $vatTotal = 0;
            $poItems = [];

            foreach ($pr->items as $item) {
                // Fetch unit price from supplier price list or default to 0
                $priceList = \App\Infrastructure\Eloquent\Models\SupplierPriceListModel::query()->where(['tenant_id' => $tenantId])
                    ->where(['supplier_id' => $pr->suggested_supplier_id])
                    ->where(['product_id' => $item->product_id])
                    ->first();
                
                $unitPrice = $priceList ? $priceList->unit_price : 0;
                $lineSubtotal = $item->quantity * $unitPrice;
                $lineVat = $lineSubtotal * 0.15;

                $subtotal += $lineSubtotal;
                $vatTotal += $lineVat;

                $poItems[] = [
                    'product_id' => $item->product_id,
                    'quantity'   => $item->quantity,
                    'unit_price' => $unitPrice,
                    'vat_rate'   => 15,
                    'vat_amount' => round($lineVat, 2),
                    'total'      => round($lineSubtotal + $lineVat, 2),
                ];
            }

            $po = PurchaseOrderModel::create([
                'tenant_id'              => $tenantId,
                'po_number'              => $poNumber,
                'supplier_id'            => $pr->suggested_supplier_id,
                'purchase_request_id'    => $pr->id,
                'subtotal'               => round($subtotal, 2),
                'vat_amount'             => round($vatTotal, 2),
                'total'                  => round($subtotal + $vatTotal, 2),
                'status'                 => 'draft',
                'expected_delivery_date' => $pr->required_date,
                'notes'                  => "تم التحويل من طلب الشراء " . $pr->request_number,
                'created_by'             => $request->user()->id,
            ]);

            foreach ($poItems as $poItem) {
                $po->items()->create($poItem);
            }

            $pr->update(['status' => 'completed']);

            return $po;
        });

        return $this->success($po->load(['items', 'supplier']), 'Purchase order created successfully', 201);
    }

    // ─────────────────────────────────────────────────────────────────────
    // RFQs (Requests for Quotation)
    // ─────────────────────────────────────────────────────────────────────

    public function listRFQs(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $limit    = (int) $request->input('limit', 15);

        $query = RFQModel::query()->where(['tenant_id' => $tenantId])
            ->with(['items', 'purchaseRequest', 'quotations'])
            ->latest();

        if ($request->filled('status')) {
            $query->where(['status' => $request->query('status')]);
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
            $prExists = PurchaseRequestModel::query()->where(['tenant_id' => $tenantId])
                ->where(['id' => $validated['purchase_request_id']])
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
        $limit    = (int) $request->input('limit', 15);

        $query = PurchaseOrderModel::query()->where(['tenant_id' => $tenantId])
            ->with(['items', 'supplier'])
            ->latest();

        if ($request->filled('status')) {
            $query->where(['status' => $request->query('status')]);
        }
        if ($request->filled('supplier_id')) {
            $query->where(['supplier_id' => $request->query('supplier_id')]);
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
            $prExists = PurchaseRequestModel::query()->where(['tenant_id' => $tenantId])
                ->where(['id' => $validated['purchase_request_id']])
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

        $po = PurchaseOrderModel::query()->where(['tenant_id' => $this->getTenantId($request)])->find($id);

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
