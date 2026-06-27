<?php

namespace App\Presentation\Controllers\API\Sales;

use App\Application\Sales\UseCases\PosScanBarcodeUseCase;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Domain\Sales\Entities\PosShift;
use Carbon\Carbon;

class PosShiftController extends BaseTenantController
{
    public function current(Request $request)
    {
        $shift = PosShift::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        return $this->success($shift);
    }

    public function open(Request $request)
    {
        $request->validate([
            'opening_cash' => 'required|numeric|min:0|max:9999999.99',
            'notes'        => 'nullable|string|max:1000',
        ]);

        $tenantId = $this->getTenantId($request);
        $userId   = $request->user()->id;

        try {
            $shift = DB::connection('tenant')->transaction(function () use ($request, $tenantId, $userId) {
                // Check first for a clear 400 response on the normal (non-race) path.
                // The partial unique index on (tenant_id, user_id) WHERE status='open'
                // is the authoritative guard against concurrent opens.
                $existing = PosShift::query()
                    ->where('tenant_id', $tenantId)
                    ->where('user_id', $userId)
                    ->where('status', 'open')
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    return $this->error('A shift is already open.', 400);
                }

                return PosShift::query()->create([
                    'tenant_id'    => $tenantId,
                    'user_id'      => $userId,
                    'created_by'   => $userId,
                    'opening_cash' => $request->opening_cash,
                    'opened_at'    => Carbon::now(),
                    'status'       => 'open',
                    'notes'        => $request->notes,
                ]);
            });

            // Return the error response built inside the transaction if shift existed.
            if ($shift instanceof \Illuminate\Http\JsonResponse) {
                return $shift;
            }

            return $this->success($shift, 'Shift opened successfully', 201);
        } catch (UniqueConstraintViolationException) {
            // Race condition: two requests slipped past the lockForUpdate check simultaneously.
            // The unique partial index caught the second insert — surface a clean 400.
            return $this->error('A shift is already open.', 400);
        }
    }

    public function close(Request $request)
    {
        $request->validate([
            'closing_cash' => 'required|numeric|min:0|max:9999999.99',
            'notes'        => 'nullable|string|max:1000',
        ]);

        $tenantId = $this->getTenantId($request);
        $userId   = $request->user()->id;

        $result = DB::connection('tenant')->transaction(function () use ($request, $tenantId, $userId) {
            // Lock the row so a duplicate close request waits and then sees status='closed'.
            $shift = PosShift::query()
                ->where('tenant_id', $tenantId)
                ->where('user_id', $userId)
                ->where('status', 'open')
                ->lockForUpdate()
                ->first();

            if (!$shift) {
                return null;
            }

            $closedAt = Carbon::now();

            $invoiceSums = DB::connection('tenant')
                ->table('invoices')
                ->where('tenant_id', $tenantId)
                ->where('created_by', $userId)
                ->where('status', 'confirmed')
                ->where('created_at', '>=', $shift->opened_at)
                ->where('created_at', '<=', $closedAt)
                ->selectRaw('payment_method, SUM(total) as total')
                ->groupBy('payment_method')
                ->get()
                ->keyBy('payment_method');

            $cashSales    = (float) ($invoiceSums->get('cash')?->total ?? 0);
            $cardSales    = (float) ($invoiceSums->get('card')?->total ?? 0);
            $expectedCash = (float) $shift->opening_cash + $cashSales;
            $cashVariance = (float) $request->closing_cash - $expectedCash;

            // Safely append closing notes without leading newline when opening notes are null.
            $closingNote = $request->notes;
            $mergedNotes = implode(
                "\n",
                array_filter([$shift->notes, $closingNote], fn($v) => $v !== null && $v !== '')
            ) ?: null;

            $shift->update([
                'closing_cash' => $request->closing_cash,
                'cash_sales'   => $cashSales,
                'card_sales'   => $cardSales,
                'closed_at'    => $closedAt,
                'status'       => 'closed',
                'notes'        => $mergedNotes,
            ]);

            $shift->refresh();
            $data                  = $shift->toArray();
            $data['expected_cash'] = $expectedCash;
            $data['cash_variance'] = $cashVariance;

            return $data;
        });

        if ($result === null) {
            return $this->error('No active shift found.', 404);
        }

        return $this->success($result, 'Shift closed successfully');
    }

    /**
     * GET /api/sales/pos/scan/{barcode}?warehouse_id=uuid
     *
     * Resolves a barcode or SKU to a POS line-item payload.
     * Lookup order: product_units.barcode → products.barcode → products.sku
     */
    public function scanBarcode(Request $request, string $barcode)
    {
        $warehouseId = $request->query('warehouse_id');

        $result = (new PosScanBarcodeUseCase())->execute($barcode, $warehouseId ?: null);

        if (! $result['found']) {
            return $this->error('Product not found.', 404);
        }

        return $this->success($result);
    }
}
