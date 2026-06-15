<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Presentation\Controllers\API\BaseTenantController;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\InvoiceItemModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Domain\Sales\Services\ZatcaPhase1Service;
use App\Jobs\SubmitZatcaInvoiceJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Application\Sales\DTOs\CreateInvoiceDTO;
use App\Application\Sales\UseCases\CreateInvoiceUseCase;
use App\Application\Sales\DTOs\UpdateInvoiceDTO;
use App\Application\Sales\UseCases\UpdateInvoiceUseCase;

class InvoiceController extends BaseTenantController
{
    public function __construct(
        private readonly CreateInvoiceUseCase $createInvoiceUseCase,
        private readonly UpdateInvoiceUseCase $updateInvoiceUseCase,
    ) {
    }
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $status = $request->query('status');
        $invoiceNumber = $request->query('invoice_number');
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        $branchId = $request->query('branch_id');
        $warehouseId = $request->query('warehouse_id');
        $customerId = $request->query('customer_id');
        $salespersonId = $request->query('salesperson_id');
        $sortBy = $request->query('sort_by', 'invoice_date');
        $sortDesc = $request->query('sort_desc', 'true') === 'true';

        $query = InvoiceModel::where('tenant_id', $this->getTenantId($request))->select([
            'id',
            'invoice_number',
            'customer_id',
            'total',
            'status',
            'invoice_date',
            'created_at'
        ])->with(['customer:id,name', 'items.product']);

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }
        if ($invoiceNumber) {
            $query->where('invoice_number', 'ilike', "%{$invoiceNumber}%");
        }
        if ($dateFrom) {
            $query->whereDate('invoice_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('invoice_date', '<=', $dateTo);
        }
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        }
        if ($customerId) {
            $query->where('customer_id', $customerId);
        }
        if ($salespersonId) {
            $query->where('salesperson_id', $salespersonId);
        }

        $query->orderBy($sortBy, $sortDesc ? 'desc' : 'asc');

        $invoices = $query->paginate((int) $limit);

        return $this->paginated($invoices->toArray(), 'Sales Invoices retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|uuid|exists:customers,id',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'type' => 'nullable|string|in:cash,credit',
            'status' => 'required|string|in:draft,confirmed,cancelled',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.vat_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_percent' => 'nullable|numeric|min:0|max:100',
            'due_date' => 'nullable|date',
            'internal_notes' => 'nullable|string',
            'reference_no' => 'nullable|string',
            'paid_amount' => 'nullable|numeric|min:0',
            'salesperson_id' => 'nullable|uuid|exists:users,id',
            'credit_limit_override' => 'nullable|boolean',
            'installments' => 'nullable|array',
            'sales_channel_id' => 'nullable|uuid|exists:sales_channels,id',
        ]);

        try {
            $validated['tenant_id'] = $this->getTenantId($request);
            $dto = CreateInvoiceDTO::fromRequest($validated);
            $invoice = $this->createInvoiceUseCase->execute($dto, auth()->id() ?? '');

            return $this->created(['id' => $invoice->getId()], 'Sales Invoice created successfully');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Invoice creation failed: ' . $e->getMessage());
            return $this->error('Failed to create invoice: ' . $e->getMessage(), 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|uuid|exists:customers,id',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'type' => 'nullable|string|in:cash,credit',
            'status' => 'required|string|in:draft,confirmed,cancelled',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.vat_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_percent' => 'nullable|numeric|min:0|max:100',
            'due_date' => 'nullable|date',
            'internal_notes' => 'nullable|string',
            'reference_no' => 'nullable|string',
            'paid_amount' => 'nullable|numeric|min:0',
            'salesperson_id' => 'nullable|uuid|exists:users,id',
            'credit_limit_override' => 'nullable|boolean',
            'installments' => 'nullable|array',
            'sales_channel_id' => 'nullable|uuid|exists:sales_channels,id',
        ]);

        try {
            $validated['tenant_id'] = $this->getTenantId($request);
            $dto = UpdateInvoiceDTO::fromRequest($id, $validated);
            $invoice = $this->updateInvoiceUseCase->execute($dto, auth()->id() ?? '');

            return $this->success(['id' => $invoice->getId()], 'Sales invoice updated successfully');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Invoice update exception: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('Failed to update sales invoice: ' . $e->getMessage(), 500);
        }
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $invoice = InvoiceModel::where('tenant_id', $this->getTenantId($request))->find($id);
        if (!$invoice) {
            return $this->error('Sales invoice not found', 404);
        }

        if ($invoice->status === 'pending_approval') {
            return $this->error('Cannot manually update status. This invoice requires approval.', 403);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:draft,confirmed,cancelled',
        ]);

        if ($invoice->status === 'confirmed' && $validated['status'] !== 'confirmed') {
            return $this->error('A confirmed invoice cannot be cancelled or reverted to draft. Please issue a Sales Return instead.', 403);
        }

        if ($invoice->status !== 'confirmed' && $validated['status'] === 'confirmed') {
            try {
                $confirmUseCase = app(\App\Application\Sales\UseCases\ConfirmInvoiceUseCase::class);
                $confirmUseCase->execute($invoice->id, auth()->id() ?? '');
                // The use case changes status to confirmed and persists.
                $invoice->refresh();
            } catch (\Exception $e) {
                \Log::error('Confirmation failed: ' . $e->getMessage());
                return $this->error('Failed to confirm invoice: ' . $e->getMessage(), 500);
            }
        } else {
            $invoice->update(['status' => $validated['status']]);
        }

        return $this->success($invoice, 'Sales invoice status updated successfully');
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $invoice = InvoiceModel::where('tenant_id', $this->getTenantId($request))->with(['customer', 'items.product', 'shippingInvoices'])->find($id);
        if (!$invoice) {
            return $this->error('Sales invoice not found', 404);
        }
        return $this->success($invoice->toArray());
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoices' => 'required|array|min:1',
        ]);

        $results = ['success' => 0, 'failed' => 0, 'errors' => []];

        foreach ($validated['invoices'] as $index => $invoiceData) {
            try {
                $req = new Request();
                $req->replace($invoiceData);
                $response = $this->store($req);

                if ($response->getStatusCode() === 201) {
                    $results['success']++;
                } else {
                    $results['failed']++;
                    $results['errors'][$index] = json_decode((string) $response->getContent(), true)['message'] ?? 'Unknown error';
                }
            } catch (\Exception $e) {
                $results['failed']++;
                $results['errors'][$index] = $e->getMessage();
            }
        }

        return $this->success($results, 'Bulk sync completed');
    }

    public function salesReport(Request $request): JsonResponse
    {
        $from = $request->query('from', now()->startOfMonth()->toDateString());
        $to = $request->query('to', now()->endOfMonth()->toDateString());

        $query = InvoiceModel::where('tenant_id', $this->getTenantId($request))
            ->whereBetween('invoice_date', [$from, $to])
            ->where('status', '!=', 'cancelled');

        $report = [
            'total_sales' => (clone $query)->sum('total'),
            'total_tax' => (clone $query)->sum('vat_amount'),
            'total_discount' => (clone $query)->sum('discount_amount'),
            'invoice_count' => (clone $query)->count(),
            'daily_sales' => (clone $query)
                ->select(DB::raw('DATE(invoice_date) as date'), DB::raw('SUM(total) as total'))
                ->groupBy('date')
                ->orderBy('date')
                ->get()
        ];

        return $this->success($report, 'Sales report generated');
    }

}

