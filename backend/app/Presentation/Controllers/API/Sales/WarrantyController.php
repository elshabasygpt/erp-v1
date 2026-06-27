<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Infrastructure\Eloquent\Models\WarrantyClaimModel;
use App\Infrastructure\Eloquent\Models\WarrantyModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WarrantyController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        // Dynamically update expired warranties
        WarrantyModel::query()->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->where('expiry_date', '<', Carbon::today())
            ->update(['status' => 'expired']);

        $query = WarrantyModel::query()->with([
            'product:id,name,name_ar,sku,brand',
            'customer:id,name,phone',
            'invoice:id,invoice_number,invoice_date',
        ])->orderBy('expiry_date', 'asc');

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->has('expiring_in_days')) {
            $days = (int) $request->expiring_in_days;
            $targetDate = Carbon::today()->addDays($days);
            $query->where('status', 'active')
                ->where('expiry_date', '<=', $targetDate)
                ->where('expiry_date', '>=', Carbon::today());
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('warranty_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = $request->input('per_page', 15);

        return $this->success($query->paginate($perPage), 'Warranties retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_id' => 'required|uuid|exists:invoices,id',
            'invoice_item_id' => 'required|uuid|exists:invoice_items,id',
            'product_id' => 'required|uuid|exists:products,id',
            'customer_id' => 'required|uuid|exists:customers,id',
            'quantity' => 'required|numeric|min:0.01',
            'sale_date' => 'required|date',
            'warranty_months' => 'required|integer|min:1|max:120',
            'notes' => 'nullable|string',
        ]);

        $expiryDate = Carbon::parse($validated['sale_date'])->addMonths($validated['warranty_months']);
        $lastWarranty = WarrantyModel::latest('created_at')->first();
        $lastNum = $lastWarranty ? ((int) str_replace('WRN-', '', $lastWarranty->warranty_number)) : 0;
        $warrantyNumber = 'WRN-'.str_pad((string) ($lastNum + 1), 6, '0', STR_PAD_LEFT);

        $warranty = new WarrantyModel($validated);
        $warranty->tenant_id = $this->getTenantId($request);
        $warranty->created_by = $request->user()?->id;
        $warranty->warranty_number = $warrantyNumber;
        $warranty->expiry_date = $expiryDate;
        $warranty->status = 'active';
        $warranty->save();

        return $this->success($warranty, 'Warranty created successfully', 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $warranty = WarrantyModel::query()->with(['product', 'customer', 'invoice.items', 'claims.replacementInvoice'])
            ->where('tenant_id', $this->getTenantId($request))
            ->find($id);

        if (! $warranty) {
            return $this->error('Warranty not found', 404);
        }

        return $this->success($warranty, 'Warranty retrieved successfully');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:active,void',
            'notes' => 'nullable|string',
        ]);

        $warranty = WarrantyModel::query()->where('tenant_id', $this->getTenantId($request))->find($id);

        if (! $warranty) {
            return $this->error('Warranty not found', 404);
        }

        $warranty->status = $validated['status'];
        if ($validated['status'] === 'void' && ! empty($validated['notes'])) {
            $warranty->notes = $warranty->notes ? $warranty->notes."\nVoid reason: ".$validated['notes'] : 'Void reason: '.$validated['notes'];
        }
        $warranty->save();

        return $this->success($warranty, 'Warranty status updated successfully');
    }

    public function storeClaim(Request $request, string $warrantyId): JsonResponse
    {
        $validated = $request->validate([
            'claim_type' => 'required|string|in:replacement,repair,refund',
            'complaint' => 'required|string|max:1000',
            'claim_date' => 'required|date',
        ]);

        $warranty = WarrantyModel::query()->where('tenant_id', $this->getTenantId($request))->find($warrantyId);

        if (! $warranty || $warranty->status !== 'active') {
            return $this->error('الضمان غير صالح أو منتهي', 422);
        }

        if ($warranty->expiry_date < now()) {
            $warranty->update(['status' => 'expired']);

            return $this->error('انتهت مدة الضمان في '.$warranty->expiry_date->format('Y-m-d'), 422);
        }

        $lastClaim = WarrantyClaimModel::latest('created_at')->first();
        $lastClaimNum = $lastClaim ? ((int) str_replace('CLM-', '', $lastClaim->claim_number)) : 0;
        $claimNumber = 'CLM-'.str_pad((string) ($lastClaimNum + 1), 6, '0', STR_PAD_LEFT);

        $claim = DB::connection('tenant')->transaction(function () use ($validated, $warranty, $claimNumber, $request) {
            $newClaim = new WarrantyClaimModel($validated);
            $newClaim->tenant_id = $this->getTenantId($request);
            $newClaim->created_by = $request->user()?->id;
            $newClaim->claim_number = $claimNumber;
            $newClaim->warranty_id = $warranty->id;
            $newClaim->save();

            $warranty->update(['status' => 'claimed']);

            return $newClaim;
        });

        return $this->success($claim, 'Warranty claim registered successfully', 201);
    }

    public function updateClaim(Request $request, string $warrantyId, string $claimId): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'sometimes|string|in:open,in_progress,resolved,rejected',
            'resolution' => 'nullable|string',
            'replacement_invoice_id' => 'nullable|uuid|exists:invoices,id',
        ]);

        $claim = WarrantyClaimModel::query()->where('tenant_id', $this->getTenantId($request))->where('warranty_id', $warrantyId)->find($claimId);
        if (! $claim) {
            return $this->error('Claim not found', 404);
        }

        if (isset($validated['status'])) {
            $claim->status = $validated['status'];
            if ($validated['status'] === 'resolved') {
                $claim->resolved_at = now();
            }
        }

        if (array_key_exists('resolution', $validated)) {
            $claim->resolution = $validated['resolution'];
        }
        if (array_key_exists('replacement_invoice_id', $validated)) {
            $claim->replacement_invoice_id = $validated['replacement_invoice_id'];
        }

        $claim->save();

        if ($claim->status === 'rejected') {
            $otherOpenClaims = WarrantyClaimModel::query()->where('warranty_id', $warrantyId)
                ->whereIn('status', ['open', 'in_progress'])
                ->where('id', '!=', $claim->id)
                ->exists();

            if (! $otherOpenClaims) {
                WarrantyModel::query()->where('id', $warrantyId)->update(['status' => 'active']);
            }
        }

        $replacementPayload = null;
        if ($claim->status === 'resolved' && $claim->claim_type === 'replacement' && ! $claim->replacement_invoice_id) {
            $warranty = WarrantyModel::query()->with(['product:id,name,sell_price,vat_rate', 'invoice:id,warehouse_id'])->find($warrantyId);
            if ($warranty) {
                $defaultVatRate = (float) (DB::connection('tenant')
                    ->table('tenant_settings')->where('key', 'tax_rate')->value('value') ?? 15);
                $replacementPayload = [
                    'customer_id'  => $warranty->customer_id,
                    'warehouse_id' => $warranty->invoice?->warehouse_id,
                    'type'         => 'cash',
                    'notes'        => 'استبدال ضمان — مطالبة رقم: ' . $claim->claim_number,
                    'items'        => [[
                        'product_id' => $warranty->product_id,
                        'quantity'   => (float) $warranty->quantity,
                        'unit_price' => 0,
                        'discount_percent' => 0,
                        'vat_rate'   => $warranty->product?->vat_rate ?? $defaultVatRate,
                        'printed_name' => $warranty->product?->name,
                    ]],
                ];
            }
        }

        // Merge payload into the claim array to preserve backward-compatible response shape.
        // Consumers already reading res.data.data.status etc. remain unaffected.
        $claimData = $claim->fresh()->toArray();
        if ($replacementPayload !== null) {
            $claimData['replacement_invoice_payload'] = $replacementPayload;
        }
        return $this->success($claimData, 'Claim updated successfully');
    }

    public function report(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        // Dynamically update expired warranties
        WarrantyModel::query()->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->where('expiry_date', '<', Carbon::today())
            ->update(['status' => 'expired']);

        $totalActive = WarrantyModel::query()->where('tenant_id', $tenantId)->where('status', 'active')->count();
        $expiringThisMonth = WarrantyModel::query()->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->whereBetween('expiry_date', [Carbon::today(), Carbon::today()->endOfMonth()])
            ->count();

        $expiredUnclaimed = WarrantyModel::query()->where('tenant_id', $tenantId)
            ->where('status', 'expired')
            ->count();

        $openClaims = WarrantyClaimModel::query()->where('tenant_id', $tenantId)
            ->whereIn('status', ['open', 'in_progress'])
            ->count();

        $expiringSoon = WarrantyModel::query()->with(['product:id,name,name_ar', 'customer:id,name'])
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->where('expiry_date', '>=', Carbon::today())
            ->orderBy('expiry_date', 'asc')
            ->take(10)
            ->get();

        return $this->success([
            'summary' => [
                'total_active' => $totalActive,
                'expiring_this_month' => $expiringThisMonth,
                'expired_unclaimed' => $expiredUnclaimed,
                'open_claims' => $openClaims,
            ],
            'expiring_soon' => $expiringSoon,
        ], 'Warranty report generated successfully');
    }

    public function checkByInvoice(Request $request, string $invoiceId): JsonResponse
    {
        $warranties = WarrantyModel::query()->with(['product:id,name,name_ar'])
            ->where('tenant_id', $this->getTenantId($request))
            ->where('invoice_id', $invoiceId)
            ->get();

        return $this->success($warranties, 'Warranties retrieved successfully');
    }
}
