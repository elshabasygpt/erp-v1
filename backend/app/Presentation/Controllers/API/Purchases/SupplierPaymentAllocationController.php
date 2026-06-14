<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Purchases;

use App\Presentation\Controllers\API\BaseController;
use App\Domain\Accounting\Services\SupplierPaymentAllocationService;
use App\Infrastructure\Eloquent\Models\Accounting\SupplierPaymentAllocationModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierPaymentAllocationController extends BaseController
{
    public function __construct(
        private SupplierPaymentAllocationService $allocationService
    ) {}

    public function index(string $paymentId): JsonResponse
    {
        $allocations = SupplierPaymentAllocationModel::where('supplier_payment_id', $paymentId)
            ->with('purchaseInvoice')
            ->get();
            
        return $this->success($allocations, 'Payment allocations retrieved successfully');
    }

    public function store(Request $request, string $paymentId): JsonResponse
    {
        $validated = $request->validate([
            'allocations' => 'required|array|min:1',
            'allocations.*.invoice_id' => 'required|uuid|exists:purchase_invoices,id',
            'allocations.*.amount' => 'required|numeric|min:0.01',
        ]);

        try {
            $this->allocationService->allocatePayment($paymentId, $validated['allocations']);
            return $this->success(null, 'Payment allocated successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to allocate payment: ' . $e->getMessage(), 422);
        }
    }
}
