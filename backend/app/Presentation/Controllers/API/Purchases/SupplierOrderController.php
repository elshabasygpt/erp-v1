<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Purchases;

use App\Domain\Purchases\Services\SmartOrderDrafter;
use App\Infrastructure\Eloquent\Models\ProductDefaultSupplierModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Infrastructure\Eloquent\Models\SupplierOrderingScheduleModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupplierOrderController extends BaseTenantController
{
    /**
     * GET /purchases/order-schedules
     * جلب كل جداول مواعيد الموردين
     */
    public function getSchedules(Request $request): JsonResponse
    {
        $schedules = SupplierOrderingScheduleModel::where('tenant_id', $this->getTenantId($request))
            ->with(['supplier:id,name,phone'])
            ->get()
            ->map(fn($s) => array_merge($s->toArray(), [
                'order_day_name'        => $s->order_day_name,
                'next_order_date'       => $s->next_order_date->format('Y-m-d'),
                'expected_delivery'     => $s->expected_delivery_date->format('Y-m-d'),
                'days_until_next_order' => (int) now()->diffInDays($s->next_order_date, false),
            ]));

        return $this->success($schedules);
    }

    /**
     * POST /purchases/order-schedules
     * إنشاء أو تعديل جدول مورد
     */
    public function storeSchedule(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id'           => 'required|uuid',
            'order_day_of_week'     => 'required|integer|between:0,6',
            'lead_time_days'        => 'required|integer|min:1|max:30',
            'frequency_weeks'       => 'required|integer|min:1|max:4',
            'order_time'            => 'nullable|date_format:H:i',
            'reminder_enabled'      => 'nullable|boolean',
            'reminder_hours_before' => 'nullable|integer|min:1|max:72',
            'responsible_email'     => 'nullable|email',
            'notes'                 => 'nullable|string',
        ]);

        $tenantId = $this->getTenantId($request);

        // تحقق ملكية المورد
        $supplier = SupplierModel::where('tenant_id', $tenantId)->find($validated['supplier_id']);
        if (!$supplier) {
            return $this->error('Supplier not found', 404);
        }

        $schedule = SupplierOrderingScheduleModel::updateOrCreate(
            ['tenant_id' => $tenantId, 'supplier_id' => $validated['supplier_id']],
            array_merge($validated, ['created_by' => $request->user()->id])
        );
        $schedule->tenant_id = $tenantId;
        $schedule->save();

        return $this->success(
            array_merge($schedule->load('supplier')->toArray(), [
                'order_day_name'    => $schedule->order_day_name,
                'next_order_date'   => $schedule->next_order_date->format('Y-m-d'),
                'expected_delivery' => $schedule->expected_delivery_date->format('Y-m-d'),
            ]),
            'Schedule saved',
            201
        );
    }

    /**
     * DELETE /purchases/order-schedules/{id}
     */
    public function destroySchedule(Request $request, string $id): JsonResponse
    {
        $schedule = SupplierOrderingScheduleModel::where('tenant_id', $this->getTenantId($request))->find($id);
        if (!$schedule) {
            return $this->error('Schedule not found', 404);
        }
        $schedule->delete();
        return $this->success(null, 'Schedule deleted');
    }

    /**
     * POST /purchases/product-suppliers
     * ربط منتج بمورد افتراضي
     */
    public function setProductSupplier(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id'           => 'required|uuid',
            'supplier_id'          => 'required|uuid',
            'reorder_quantity'     => 'nullable|numeric|min:0.01',
            'preferred_unit_price' => 'nullable|numeric|min:0',
            'priority'             => 'nullable|integer|min:1|max:5',
        ]);

        $tenantId = $this->getTenantId($request);

        $product  = ProductModel::where('tenant_id', $tenantId)->find($validated['product_id']);
        $supplier = SupplierModel::where('tenant_id', $tenantId)->find($validated['supplier_id']);

        if (!$product || !$supplier) {
            return $this->error('Product or Supplier not found', 404);
        }

        $entry = ProductDefaultSupplierModel::updateOrCreate(
            [
                'tenant_id'  => $tenantId,
                'product_id' => $validated['product_id'],
                'priority'   => $validated['priority'] ?? 1,
            ],
            array_merge($validated, ['created_by' => $request->user()->id, 'tenant_id' => $tenantId])
        );

        return $this->success($entry->load(['product', 'supplier']), 'Product supplier saved');
    }

    /**
     * GET /purchases/smart-order/low-stock
     * جلب القطع الناقصة مقسمة بالموردين
     */
    public function getLowStockGrouped(Request $request): JsonResponse
    {
        $drafter = new SmartOrderDrafter();
        $result  = $drafter->getLowStockBySupplier(
            $this->getTenantId($request),
            $request->query('warehouse_id')
        );

        return $this->success($result);
    }

    /**
     * POST /purchases/smart-order/draft
     * إنشاء فاتورة مسودة لمورد واحد
     */
    public function draftForSupplier(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id'         => 'required|uuid',
            'warehouse_id'        => 'nullable|uuid',
            'items'               => 'required|array|min:1',
            'items.*.product_id'  => 'required|uuid',
            'items.*.order_qty'   => 'required|numeric|min:0.01',
            'items.*.unit_price'  => 'required|numeric|min:0',
        ]);

        $tenantId = $this->getTenantId($request);
        $supplier = SupplierModel::where('tenant_id', $tenantId)->find($validated['supplier_id']);
        if (!$supplier) {
            return $this->error('Supplier not found', 404);
        }

        $drafter = new SmartOrderDrafter();
        $pr = $drafter->draftOrderForSupplier(
            $validated['supplier_id'],
            $validated['items'],
            $tenantId,
            $request->user()->id,
            $validated['warehouse_id'] ?? null,
            'manual'
        );

        return $this->success([
            'pr_id'          => $pr->id,
            'request_number' => $pr->request_number,
            'items_count'    => count($validated['items']),
        ], 'Draft purchase request created', 201);
    }

    /**
     * POST /purchases/smart-order/draft-all
     * إنشاء فاتورة لكل مورد عنده قطع ناقصة
     */
    public function draftAllSuppliers(Request $request): JsonResponse
    {
        $tenantId    = $this->getTenantId($request);
        $warehouseId = $request->input('warehouse_id');
        $drafter     = new SmartOrderDrafter();
        $lowStock    = $drafter->getLowStockBySupplier($tenantId, $warehouseId);

        if (empty($lowStock['by_supplier'])) {
            return $this->success(['created' => 0, 'invoices' => []], 'المخزون كافٍ');
        }

        $created = [];
        foreach ($lowStock['by_supplier'] as $group) {
            $pr = $drafter->draftOrderForSupplier(
                $group['supplier_id'],
                $group['items'],
                $tenantId,
                $request->user()->id,
                $warehouseId,
                'manual'
            );
            $created[] = [
                'supplier_name'  => $group['supplier_name'],
                'request_number' => $pr->request_number,
                'pr_id'          => $pr->id,
                'items_count'    => count($group['items']),
            ];
        }

        return $this->success(['created' => count($created), 'orders' => $created]);
    }

    /**
     * GET /purchases/smart-order/upcoming
     * الطلبيات المقررة خلال 7 أيام
     */
    public function getUpcomingOrders(Request $request): JsonResponse
    {
        $tenantId  = $this->getTenantId($request);
        $schedules = SupplierOrderingScheduleModel::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->with(['supplier:id,name,phone'])
            ->get()
            ->map(function ($s) use ($tenantId) {
                $nextDate  = $s->next_order_date;
                $daysUntil = (int) now()->diffInDays($nextDate, false);

                // عدد القطع الناقصة لهذا المورد
                $lowCount = DB::connection('tenant')
                    ->table('products as p')
                    ->join('warehouse_products as wp', 'p.id', '=', 'wp.product_id')
                    ->join('product_default_suppliers as pds', 'p.id', '=', 'pds.product_id')
                    ->where('p.tenant_id', $tenantId)
                    ->where('pds.supplier_id', $s->supplier_id)
                    ->where('pds.priority', 1)
                    ->whereNull('pds.deleted_at')
                    ->whereNull('p.deleted_at')
                    ->where(function ($q) {
                        $q->where('wp.quantity', '<=', 0)
                          ->orWhereColumn('wp.quantity', '<=', 'p.stock_alert_level');
                    })
                    ->count();

                return [
                    'schedule_id'           => $s->id,
                    'supplier_id'           => $s->supplier_id,
                    'supplier_name'         => $s->supplier->name ?? '',
                    'supplier_phone'        => $s->supplier->phone ?? '',
                    'order_day_name'        => $s->order_day_name,
                    'next_order_date'       => $nextDate->format('Y-m-d'),
                    'days_until_order'      => $daysUntil,
                    'expected_delivery'     => $s->expected_delivery_date->format('Y-m-d'),
                    'lead_time_days'        => $s->lead_time_days,
                    'low_stock_items_count' => $lowCount,
                    'is_due_soon'           => $daysUntil <= 2 && $daysUntil >= 0,
                    'notes'                 => $s->notes,
                ];
            })
            ->sortBy('days_until_order')
            ->values();

        return $this->success($schedules);
    }
}
