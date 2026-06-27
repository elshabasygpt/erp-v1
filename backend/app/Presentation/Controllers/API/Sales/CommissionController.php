<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Application\Sales\UseCases\PayCommissionUseCase;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommissionController extends BaseTenantController
{
    public function __construct(private PayCommissionUseCase $payCommissionUseCase) {}

    /**
     * List unpaid, accrued commission per salesperson (or for one, if
     * salesperson_id is given), so the payout screen can show what's owed.
     */
    public function unpaid(Request $request): JsonResponse
    {
        $query = InvoiceModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->where('commission_amount', '>', 0)
            ->whereNull('commission_paid_at')
            ->with('salesperson:id,name');

        if ($request->filled('salesperson_id')) {
            $query->where('salesperson_id', $request->get('salesperson_id'));
        }

        $invoices = $query->orderBy('invoice_date')->get([
            'id', 'invoice_number', 'invoice_date', 'salesperson_id', 'commission_amount',
        ]);

        $bySalesperson = $invoices->groupBy('salesperson_id')->map(function ($group) {
            return [
                'salesperson_id' => $group->first()->salesperson_id,
                'salesperson_name' => $group->first()->salesperson?->name,
                'total_unpaid' => round((float) $group->sum('commission_amount'), 2),
                'invoices' => $group->map(fn ($inv) => [
                    'id' => $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'invoice_date' => $inv->invoice_date,
                    'commission_amount' => (float) $inv->commission_amount,
                ])->values(),
            ];
        })->values();

        return $this->success($bySalesperson);
    }

    public function payout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'salesperson_id' => 'required|uuid|exists:tenant.users,id',
            'invoice_ids' => 'required|array|min:1',
            'invoice_ids.*' => 'required|uuid|exists:tenant.invoices,id',
            'safe_id' => 'nullable|uuid|exists:tenant.safes,id',
        ]);

        try {
            $payout = $this->payCommissionUseCase->execute(
                $this->getTenantId($request),
                $validated['salesperson_id'],
                $validated['invoice_ids'],
                $validated['safe_id'] ?? null,
                auth()->id() ?? '',
            );

            return $this->success($payout, 'Commission paid out successfully', 201);
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
