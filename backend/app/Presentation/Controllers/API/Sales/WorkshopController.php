<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Infrastructure\Eloquent\Models\WorkshopJobCardModel;
use App\Infrastructure\Eloquent\Models\WorkshopJobCardPartModel;
use App\Infrastructure\Eloquent\Models\WorkshopJobCardServiceModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WorkshopController extends BaseTenantController
{
    private const STATUSES = ['pending', 'in_progress', 'waiting_parts', 'completed', 'cancelled'];

    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $query = WorkshopJobCardModel::query()
            ->where('tenant_id', $tenantId)
            ->with(['customer:id,name,phone', 'vehicle:id,plate_number', 'technician:id,name'])
            ->withCount(['parts', 'services']);
        foreach (['status', 'technician_id', 'customer_id'] as $filter) {
            if ($val = $request->query($filter)) {
                $query->where($filter, $val);
            }
        }
        return $this->success($query->orderByDesc('created_at')->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $validated = $request->validate([
            'customer_id'              => 'nullable|uuid',
            'customer_vehicle_id'      => 'nullable|uuid',
            'technician_id'            => 'nullable|uuid',
            'complaint'                => 'required|string|max:2000',
            'diagnosis'                => 'nullable|string|max:2000',
            'internal_notes'           => 'nullable|string|max:2000',
            'mileage_in'               => 'nullable|integer|min:0',
            'estimated_completion'     => 'nullable|date',
            'parts'                    => 'nullable|array',
            'parts.*.product_id'       => 'required_with:parts|uuid',
            'parts.*.warehouse_id'     => 'nullable|uuid',
            'parts.*.quantity'         => 'required_with:parts|numeric|min:0.01',
            'parts.*.unit_price'       => 'required_with:parts|numeric|min:0',
            'services'                 => 'nullable|array',
            'services.*.description'   => 'required_with:services|string|max:500',
            'services.*.hours'         => 'required_with:services|numeric|min:0',
            'services.*.rate_per_hour' => 'required_with:services|numeric|min:0',
        ]);
        $jobNumber = 'JC-' . date('Ymd') . '-' . strtoupper(Str::random(5));
        $jobCard = WorkshopJobCardModel::create([
            'tenant_id'            => $tenantId,
            'job_number'           => $jobNumber,
            'customer_id'          => $validated['customer_id'] ?? null,
            'customer_vehicle_id'  => $validated['customer_vehicle_id'] ?? null,
            'technician_id'        => $validated['technician_id'] ?? null,
            'status'               => 'pending',
            'complaint'            => $validated['complaint'],
            'diagnosis'            => $validated['diagnosis'] ?? null,
            'internal_notes'       => $validated['internal_notes'] ?? null,
            'mileage_in'           => $validated['mileage_in'] ?? null,
            'estimated_completion' => $validated['estimated_completion'] ?? null,
            'created_by'           => $request->user()?->id,
        ]);
        [$partsCost, $laborCost] = $this->_saveLines($tenantId, $jobCard->id, $validated);
        $jobCard->update(['parts_cost' => $partsCost, 'labor_cost' => $laborCost, 'total_cost' => $partsCost + $laborCost]);
        $jobCard->load(['parts.product:id,name,sku', 'services', 'customer:id,name', 'vehicle:id,plate_number']);
        return $this->success($jobCard, 'Job card created', 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $jobCard = WorkshopJobCardModel::query()
            ->where('tenant_id', $tenantId)
            ->with([
                'parts.product:id,name,sku,sell_price',
                'parts.warehouse:id,name',
                'services',
                'customer:id,name,phone',
                'vehicle:id,plate_number',
                'technician:id,name',
                'invoice:id,invoice_number,status',
            ])
            ->findOrFail($id);
        return $this->success($jobCard);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $jobCard = WorkshopJobCardModel::query()
            ->where('tenant_id', $tenantId)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->findOrFail($id);
        $validated = $request->validate([
            'status'               => 'nullable|in:' . implode(',', self::STATUSES),
            'technician_id'        => 'nullable|uuid',
            'diagnosis'            => 'nullable|string|max:2000',
            'internal_notes'       => 'nullable|string|max:2000',
            'mileage_in'           => 'nullable|integer|min:0',
            'estimated_completion' => 'nullable|date',
        ]);
        if (isset($validated['status']) && $validated['status'] === 'in_progress' && ! $jobCard->started_at) {
            $validated['started_at'] = now();
        }
        if (isset($validated['status']) && $validated['status'] === 'completed') {
            $validated['completed_at'] = now();
        }
        $jobCard->update(array_merge($validated, ['updated_by' => $request->user()?->id]));
        return $this->success($jobCard->fresh(), 'Job card updated');
    }

    /**
     * Returns the invoice payload for the frontend to submit via POST /sales/invoices.
     * Does not create the invoice directly to preserve the existing invoice approval flow.
     */
    public function convertToInvoice(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $jobCard = WorkshopJobCardModel::query()
            ->where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereNull('invoice_id')
            ->with(['parts.product', 'services'])
            ->findOrFail($id);
        $validated = $request->validate(['warehouse_id' => 'required|uuid']);
        $defaultVatRate = (float) (DB::connection('tenant')
            ->table('tenant_settings')->where('key', 'tax_rate')->value('value') ?? 15);
        // Only parts become invoice line items; service/labor items have no product_id
        // and would fail invoice validation. Services are summarised in the notes field.
        $items = [];
        foreach ($jobCard->parts as $part) {
            $items[] = [
                'product_id'       => $part->product_id,
                'quantity'         => (float) $part->quantity,
                'unit_price'       => (float) $part->unit_price,
                'discount_percent' => 0,
                'vat_rate'         => $part->product?->vat_rate ?? $defaultVatRate,
            ];
        }
        $serviceNotes = collect($jobCard->services)
            ->map(fn ($s) => "{$s->description}: {$s->hours} hrs × {$s->rate_per_hour} = {$s->total}")
            ->implode(' | ');
        $notes = "بطاقة عمل: {$jobCard->job_number}";
        if ($serviceNotes) {
            $notes .= " | خدمات: {$serviceNotes}";
        }
        return $this->success([
            'job_card_id'  => $jobCard->id,
            'job_number'   => $jobCard->job_number,
            'customer_id'  => $jobCard->customer_id,
            'warehouse_id' => $validated['warehouse_id'],
            'notes'        => $notes,
            'items'        => $items,
            'parts_total'  => (float) $jobCard->parts_cost,
            'labor_total'  => (float) $jobCard->labor_cost,
        ], 'Invoice payload ready');
    }

    private function _saveLines(string $tenantId, string $jobCardId, array $validated): array
    {
        $partsCost = 0;
        foreach ($validated['parts'] ?? [] as $p) {
            $lineTotal  = (float) $p['unit_price'] * (float) $p['quantity'];
            $partsCost += $lineTotal;
            WorkshopJobCardPartModel::create([
                'tenant_id'    => $tenantId,
                'job_card_id'  => $jobCardId,
                'product_id'   => $p['product_id'],
                'warehouse_id' => $p['warehouse_id'] ?? null,
                'quantity'     => $p['quantity'],
                'unit_price'   => $p['unit_price'],
                'total'        => $lineTotal,
            ]);
        }
        $laborCost = 0;
        foreach ($validated['services'] ?? [] as $s) {
            $lineTotal  = (float) $s['hours'] * (float) $s['rate_per_hour'];
            $laborCost += $lineTotal;
            WorkshopJobCardServiceModel::create([
                'tenant_id'     => $tenantId,
                'job_card_id'   => $jobCardId,
                'description'   => $s['description'],
                'hours'         => $s['hours'],
                'rate_per_hour' => $s['rate_per_hour'],
                'total'         => $lineTotal,
            ]);
        }
        return [$partsCost, $laborCost];
    }
}
