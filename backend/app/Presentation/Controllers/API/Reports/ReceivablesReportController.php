<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Reports;

use App\Infrastructure\Eloquent\Models\InvoiceInstallmentModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReceivablesReportController extends BaseTenantController
{
    public function getInstallmentReminders(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $today = Carbon::today();
        $nextWeek = Carbon::today()->addDays(7);

        // Fetch unpaid or partially_paid installments due soon or overdue
        // Assuming SalesInvoice is called InvoiceModel which has a customer_id and customer relationship
        $installments = InvoiceInstallmentModel::query()
            ->with(['invoice.customer'])
            ->whereHas('invoice', function($q) use ($tenantId) {
                $q->where('tenant_id', $tenantId);
            })
            ->whereIn('status', ['unpaid', 'partially_paid'])
            ->where('due_date', '<=', $nextWeek)
            ->orderBy('due_date', 'asc')
            ->get();

        $reminders = $installments->map(function ($inst) use ($today) {
            $dueDate = Carbon::parse($inst->due_date);
            $isOverdue = $dueDate->isBefore($today);
            $daysRemaining = $today->diffInDays($dueDate, false); // negative if overdue

            return [
                'installment_id' => $inst->id,
                'invoice_id' => $inst->invoice_id,
                'invoice_number' => $inst->invoice->invoice_number ?? 'N/A',
                'customer_name' => $inst->invoice->customer->name ?? 'Unknown',
                'due_date' => $inst->due_date->format('Y-m-d'),
                'amount' => $inst->amount,
                'paid_amount' => $inst->paid_amount,
                'remaining_amount' => $inst->amount - $inst->paid_amount,
                'is_overdue' => $isOverdue,
                'days_remaining' => (int) $daysRemaining,
                'status' => $inst->status,
            ];
        })->values()->toArray();

        return $this->success($reminders, 'Receivable installment reminders retrieved successfully');
    }
}
