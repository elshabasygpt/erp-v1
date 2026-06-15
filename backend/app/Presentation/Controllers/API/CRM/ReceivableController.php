<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\CRM;

use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Application\Sales\UseCases\CollectPaymentUseCase;
use App\Application\Sales\UseCases\GetAgingReportUseCase;
use App\Application\Sales\UseCases\GetCustomerStatementUseCase;

class ReceivableController extends BaseTenantController
{
    public function __construct(
        private readonly CollectPaymentUseCase $collectPaymentUseCase,
        private readonly GetAgingReportUseCase $getAgingReportUseCase,
        private readonly GetCustomerStatementUseCase $getCustomerStatementUseCase
    ) {}

    public function collectPayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'required|uuid',
            'payment_date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|in:cash,card,bank_transfer',
            'bank_name' => 'nullable|string',
            'transaction_id' => 'nullable|string',
            'notes' => 'nullable|string',
            'allocations' => 'nullable|array',
            'allocations.*.invoice_id' => 'required|uuid',
            'allocations.*.amount' => 'required|numeric|min:0.01',
        ]);

        try {
            $payment = $this->collectPaymentUseCase->execute($this->getTenantId($request), $validated, $request->user()->id);
            return response()->json([
                'status' => 'success',
                'message' => 'Payment collected successfully',
                'data' => $payment
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }

    public function agingReport(Request $request): JsonResponse
    {
        $report = $this->getAgingReportUseCase->execute($this->getTenantId($request));
        return response()->json([
            'status' => 'success',
            'data' => $report
        ]);
    }

    public function statement(string $customerId, Request $request): JsonResponse
    {
        $fromDate = $request->query('from_date');
        $toDate = $request->query('to_date');

        $statement = $this->getCustomerStatementUseCase->execute($this->getTenantId($request), $customerId, $fromDate, $toDate);
        return response()->json([
            'status' => 'success',
            'data' => $statement
        ]);
    }
}


