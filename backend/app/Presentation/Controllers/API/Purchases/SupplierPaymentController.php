<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Purchases;

use App\Application\Purchases\UseCases\CreateSupplierPaymentUseCase;
use App\Infrastructure\Eloquent\Models\SupplierPaymentModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Records supplier payments and allocates them across purchase invoices in one
 * step. Wires the previously-unrouted CreateSupplierPaymentUseCase (which also
 * deducts the treasury safe and posts a balanced AP-settlement journal entry).
 */
class SupplierPaymentController extends BaseTenantController
{
    public function __construct(
        private readonly CreateSupplierPaymentUseCase $createPayment,
    ) {}

    /** GET /purchases/suppliers/{supplierId}/payments — list a supplier's payments. */
    public function index(Request $request, string $supplierId): JsonResponse
    {
        $payments = SupplierPaymentModel::query()
            ->where('supplier_id', $supplierId)
            ->orderByDesc('payment_date')
            ->get();

        return $this->success($payments, 'Supplier payments retrieved');
    }

    /** POST /purchases/suppliers/{supplierId}/payments — record a payment + allocate it. */
    public function store(Request $request, string $supplierId): JsonResponse
    {
        $validated = $request->validate([
            'safe_id' => 'required|uuid|exists:tenant.safes,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'nullable|date',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'allocations' => 'nullable|array',
            'allocations.*.invoice_id' => 'required|uuid|exists:tenant.purchase_invoices,id',
            'allocations.*.amount' => 'required|numeric|min:0.01',
        ]);

        $allocated = (float) collect($validated['allocations'] ?? [])->sum('amount');
        if ($allocated > (float) $validated['amount'] + 0.01) {
            return $this->error('Total allocated amount exceeds the payment amount.', 422);
        }

        try {
            $payment = $this->createPayment->execute(
                $this->getTenantId($request),
                array_merge($validated, ['supplier_id' => $supplierId]),
                (string) ($request->user()?->id ?? '')
            );
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success($payment, 'Supplier payment recorded', 201);
    }
}
