<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Application\Sales\DTOs\CreateInvoiceDTO;
use App\Application\Sales\DTOs\UpdateInvoiceDTO;
use App\Application\Sales\UseCases\ConfirmInvoiceUseCase;
use App\Application\Sales\UseCases\CreateInvoiceUseCase;
use App\Application\Sales\UseCases\UpdateInvoiceUseCase;
use App\Application\Services\Webhooks\WebhookService;
use App\Infrastructure\Eloquent\Models\CustomerProductPriceModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\ProductComponentModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Infrastructure\Eloquent\Models\WarrantyModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InvoiceController extends BaseTenantController
{
    public function __construct(
        private readonly CreateInvoiceUseCase $createInvoiceUseCase,
        private readonly UpdateInvoiceUseCase $updateInvoiceUseCase,
    ) {}

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

        $query = InvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->select([
            'id',
            'invoice_number',
            'customer_id',
            'total',
            'status',
            'invoice_date',
            'created_at',
        ])->with(['customer:id,name', 'items.product']);

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }
        if ($invoiceNumber) {
            $query->where('invoice_number', 'like', "%{$invoiceNumber}%");
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
        if (empty($request->input('warehouse_id'))) {
            $defaultWarehouse = \App\Infrastructure\Eloquent\Models\WarehouseModel::query()
                ->where('tenant_id', $this->getTenantId($request))
                ->first();
            if ($defaultWarehouse) {
                $request->merge(['warehouse_id' => $defaultWarehouse->id]);
            }
        }

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
            'items.*.printed_name' => 'nullable|string|max:255',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'reference_no' => 'nullable|string',
            'paid_amount' => 'nullable|numeric|min:0',
            'salesperson_id' => 'nullable|uuid|exists:users,id',
            'credit_limit_override' => 'nullable|boolean',
            'installments' => 'nullable|array',
            'sales_channel_id' => 'nullable|uuid|exists:sales_channels,id',
            'payment_method' => 'nullable|string|in:cash,card,bank_transfer,other',
            'offline_id' => 'nullable|string',
        ]);

        try {
            $tenantId = $this->getTenantId($request);
            $validated['tenant_id'] = $tenantId;

            // Idempotency Check for offline sync
            if (!empty($validated['offline_id'])) {
                $existing = InvoiceModel::where('tenant_id', $tenantId)
                    ->where('offline_id', $validated['offline_id'])
                    ->first();
                if ($existing) {
                    return $this->success(['id' => $existing->id], 'Sales Invoice already synced', 200);
                }
            }

            // Down payment permission check for credit invoices
            $paidAmount = (float) ($validated['paid_amount'] ?? 0);
            if (($validated['type'] ?? 'cash') === 'credit' && $paidAmount > 0) {
                $user = auth()->user();
                $hasPermission = false;
                if ($user && $user->role_id) {
                    $hasPermission = DB::connection('tenant')
                        ->table('role_permissions')
                        ->join('permissions', 'permissions.id', '=', 'role_permissions.permission_id')
                        ->where('role_permissions.role_id', $user->role_id)
                        ->where('permissions.name', 'collect_payments')
                        ->exists();
                }
                if (!$hasPermission) {
                    throw new \DomainException('You do not have permission to record a down payment on a credit invoice. Ask a manager to collect the payment instead.');
                }
            }

            // ── Server-side item enrichment ──────────────────────────────────
            [$validated['items'], $warnings] = $this->_enrichItems(
                $validated['items'],
                $validated['warehouse_id'],
                $validated['customer_id'] ?? null,
            );
            // ────────────────────────────────────────────────────────────────

            $defaultVatRate = (float) (DB::connection('tenant')
                ->table('tenant_settings')->where('key', 'tax_rate')->value('value') ?? 15);
            $dto = CreateInvoiceDTO::fromRequest($validated, $defaultVatRate);

            // Atomic create + confirm: if confirmation fails, creation is rolled back
            $invoice = DB::connection('tenant')->transaction(function () use ($dto, $validated) {
                $inv = $this->createInvoiceUseCase->execute($dto, auth()->id() ?? '');

                if ($validated['status'] === 'confirmed') {
                    $confirmUseCase = app(ConfirmInvoiceUseCase::class);
                    $confirmUseCase->execute($inv->getId(), auth()->id() ?? '');
                    $this->_createWarrantiesForInvoice($inv->getId());
                }

                return $inv;
            });

            // Update offline_id if provided
            if (!empty($validated['offline_id'])) {
                InvoiceModel::where('id', $invoice->getId())->update(['offline_id' => $validated['offline_id']]);
            }

            $response = ['id' => $invoice->getId()];
            if (! empty($warnings)) {
                $response['warnings'] = $warnings;
            }

            return $this->success($response, 'Sales Invoice created successfully', 201);
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Invoice creation failed: '.$e->getMessage());

            return $this->error('Failed to create invoice: '.$e->getMessage(), 500);
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
            'items.*.printed_name' => 'nullable|string|max:255',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'reference_no' => 'nullable|string',
            'paid_amount' => 'nullable|numeric|min:0',
            'salesperson_id' => 'nullable|uuid|exists:users,id',
            'credit_limit_override' => 'nullable|boolean',
            'installments' => 'nullable|array',
            'sales_channel_id' => 'nullable|uuid|exists:sales_channels,id',
            'payment_method' => 'nullable|string|in:cash,card,bank_transfer,other',
        ]);

        try {
            $validated['tenant_id'] = $this->getTenantId($request);
            $defaultVatRate = (float) (DB::connection('tenant')
                ->table('tenant_settings')->where('key', 'tax_rate')->value('value') ?? 15);
            $dto = UpdateInvoiceDTO::fromRequest($id, $validated, $defaultVatRate);
            $invoice = $this->updateInvoiceUseCase->execute($dto, auth()->id() ?? '');

            return $this->success(['id' => $invoice->getId()], 'Sales invoice updated successfully');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Invoice update exception: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return $this->error('Failed to update sales invoice: '.$e->getMessage(), 500);
        }
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $invoice = InvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->find($id);
        if (! $invoice) {
            return $this->error('Sales invoice not found', 404);
        }

        if ($invoice->status === 'pending_approval') {
            return $this->error('Cannot manually update status. This invoice requires approval.', 403);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:draft,confirmed,cancelled',
            'credit_limit_override' => 'nullable|boolean',
        ]);

        if ($invoice->status === 'confirmed' && $validated['status'] !== 'confirmed') {
            return $this->error('A confirmed invoice cannot be cancelled or reverted to draft. Please issue a Sales Return instead.', 403);
        }

        if ($invoice->status !== 'confirmed' && $validated['status'] === 'confirmed') {
            try {
                // Credit limit check before confirmation
                if ($invoice->type === 'credit' && $invoice->customer_id) {
                    $customer = \App\Infrastructure\Eloquent\Models\CustomerModel::query()->find($invoice->customer_id);
                    if ($customer && (float) $customer->credit_limit > 0) {
                        $dueAmount = (float) $invoice->total - (float) $invoice->paid_amount;
                        if ($dueAmount > 0 && ((float) $customer->balance + $dueAmount) > (float) $customer->credit_limit) {
                            if (empty($validated['credit_limit_override'])) {
                                throw new \DomainException("Credit Limit Exceeded. Customer balance is {$customer->balance}, Credit Limit is {$customer->credit_limit}, and Due Amount is {$dueAmount}. Manager override required.");
                            }
                            // Permission check for override
                            $user = auth()->user();
                            $hasOverridePermission = false;
                            if ($user && $user->role_id) {
                                $role = DB::connection('tenant')->table('roles')->where('id', $user->role_id)->first();
                                $meta = json_decode($role->meta_attributes ?? '{}', true);
                                $hasOverridePermission = (bool) ($meta['can_override_credit_limit'] ?? false);
                            }
                            if (!$hasOverridePermission) {
                                throw new \DomainException('You do not have permission to override the customer credit limit.');
                            }
                        }
                    }
                }

                $confirmUseCase = app(ConfirmInvoiceUseCase::class);
                $confirmUseCase->execute($invoice->id, auth()->id() ?? '');
                $invoice->refresh();

                $this->_createWarrantiesForInvoice($invoice->id);

                WebhookService::dispatchForTenant(
                    $this->getTenantId($request),
                    'invoice.confirmed',
                    ['invoice_id' => $invoice->id, 'status' => 'confirmed']
                );

                return $this->success($invoice->toArray(), 'Sales invoice confirmed successfully');
            } catch (\DomainException $e) {
                return $this->error($e->getMessage(), 422);
            } catch (\Exception $e) {
                \Log::error('Confirmation failed: '.$e->getMessage());

                return $this->error('Failed to confirm invoice: '.$e->getMessage(), 500);
            }
        } else {
            $invoice->update(['status' => $validated['status']]);
        }

        if ($validated['status'] === 'cancelled') {
            WebhookService::dispatchForTenant(
                $this->getTenantId($request),
                'invoice.cancelled',
                ['invoice_id' => $invoice->id, 'status' => 'cancelled']
            );
        }

        return $this->success($invoice, 'Sales invoice status updated successfully');
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $invoice = InvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->with(['customer', 'items.product', 'shippingInvoices'])->find($id);
        if (! $invoice) {
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
                $req = new Request;
                $req->replace($invoiceData);
                $req->headers->replace($request->headers->all());
                $req->setUserResolver($request->getUserResolver());
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

        $query = InvoiceModel::query()->where('tenant_id', $this->getTenantId($request))
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
                ->get(),
        ];

        return $this->success($report, 'Sales report generated');
    }

    /**
     * Enrich invoice items before DTO creation:
     *   1. Auto-set core_charge_applied + core_charge_amount for products with has_core_charge
     *   2. Apply customer-specific price override (if active today)
     *   3. Detect kit products and check component stock — return non-blocking warnings
     *
     * Returns [enrichedItems, warnings[]]
     */
    private function _enrichItems(array $items, string $warehouseId, ?string $customerId): array
    {
        $productIds = array_column($items, 'product_id');
        if (empty($productIds)) {
            return [$items, []];
        }

        // Batch-load products (core_charge, kit flag)
        $products = ProductModel::query()
            ->whereIn('id', $productIds)
            ->get(['id', 'name', 'sku', 'has_core_charge', 'core_charge_amount', 'is_kit'])
            ->keyBy('id');

        // Batch-load active customer-specific prices for this customer
        $customerPrices = collect();
        if ($customerId) {
            $today = now()->toDateString();
            $customerPrices = CustomerProductPriceModel::query()
                ->where('customer_id', $customerId)
                ->whereIn('product_id', $productIds)
                ->where(fn($q) => $q->whereNull('valid_from')->orWhere('valid_from', '<=', $today))
                ->where(fn($q) => $q->whereNull('valid_until')->orWhere('valid_until', '>=', $today))
                ->get(['product_id', 'price'])
                ->keyBy('product_id');
        }

        $warnings = [];
        $enriched = [];

        foreach ($items as $item) {
            $product = $products->get($item['product_id']);

            // 1. Customer-specific price override
            if ($customerPrices->has($item['product_id'])) {
                $item['unit_price'] = (float) $customerPrices->get($item['product_id'])->price;
            }

            // 2. Core charge auto-add
            if ($product && $product->has_core_charge && empty($item['core_charge_applied'])) {
                $item['core_charge_applied'] = true;
                $item['core_charge_amount']  = (float) $product->core_charge_amount;
            }

            // 3. Kit component stock check (non-blocking warning)
            if ($product && $product->is_kit) {
                $components = ProductComponentModel::query()
                    ->where('parent_product_id', $product->id)
                    ->with('component:id,name,sku')
                    ->get();

                foreach ($components as $component) {
                    $needed = (float) $component->quantity_required * (float) $item['quantity'];
                    $stock  = WarehouseProductModel::query()
                        ->where('product_id', $component->child_product_id)
                        ->where('warehouse_id', $warehouseId)
                        ->value('quantity') ?? 0;

                    if ((float) $stock < $needed) {
                        $warnings[] = [
                            'type'         => 'kit_stock',
                            'kit_product'  => $product->name,
                            'component'    => $component->component?->name ?? $component->child_product_id,
                            'component_sku'=> $component->component?->sku,
                            'needed'       => $needed,
                            'available'    => (float) $stock,
                            'message'      => "مكوّن «{$component->component?->name}» في الكيت «{$product->name}»: متاح {$stock} والمطلوب {$needed}",
                        ];
                    }
                }
            }

            $enriched[] = $item;
        }

        return [$enriched, $warnings];
    }

    private function _createWarrantiesForInvoice(string $invoiceId): void
    {
        $invoice = InvoiceModel::query()->with('items.product')->find($invoiceId);
        if (! $invoice) {
            return;
        }

        foreach ($invoice->items as $item) {
            $product = $item->product;
            if ($product && $product->warranty_months > 0) {
                $exists = WarrantyModel::query()->where('invoice_id', $invoice->id)
                    ->where('product_id', $product->id)
                    ->exists();

                if (! $exists) {
                    $lastWarranty = WarrantyModel::latest('created_at')->first();
                    $lastNum = $lastWarranty ? ((int) str_replace('WRN-', '', $lastWarranty->warranty_number)) : 0;
                    $warrantyNumber = 'WRN-'.str_pad((string) ($lastNum + 1), 6, '0', STR_PAD_LEFT);

                    WarrantyModel::query()->create([
                        'id' => Str::uuid()->toString(),
                        'tenant_id' => $invoice->tenant_id,
                        'warranty_number' => $warrantyNumber,
                        'invoice_id' => $invoice->id,
                        'customer_id' => $invoice->customer_id,
                        'product_id' => $product->id,
                        'sale_date' => $invoice->invoice_date,
                        'warranty_months' => $product->warranty_months,
                        'expiry_date' => Carbon::parse($invoice->invoice_date)->addMonths($product->warranty_months),
                        'status' => 'active',
                        'created_by' => auth()->id() ?? $invoice->created_by,
                    ]);
                }
            }
        }
    }

    /**
     * GET /sales/invoices/{id}/installments — the customer-side installment plan.
     */
    public function getInstallments(Request $request, string $id): JsonResponse
    {
        $invoice = InvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->find($id);
        if (! $invoice) {
            return $this->error('Invoice not found', 404);
        }

        return $this->success(
            $invoice->installments()->orderBy('due_date')->get(),
            'Installments retrieved successfully'
        );
    }

    /**
     * POST /sales/invoices/{id}/installments — (re)generate the installment plan.
     * Pure schedule data (no journal entry); collection still happens through the
     * receivables/collect flow. The plan total must equal the outstanding amount.
     */
    public function saveInstallments(Request $request, string $id): JsonResponse
    {
        $invoice = InvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->find($id);
        if (! $invoice) {
            return $this->error('Invoice not found', 404);
        }

        $validated = $request->validate([
            'installments' => 'required|array|min:1',
            'installments.*.due_date' => 'required|date',
            'installments.*.amount' => 'required|numeric|min:0.01',
        ]);

        $totalInstallments = (float) collect($validated['installments'])->sum('amount');
        $dueAmount = (float) $invoice->total - (float) $invoice->paid_amount;

        if (abs($totalInstallments - $dueAmount) > 0.1) {
            return $this->error("Total installments amount ($totalInstallments) does not match the invoice due amount ($dueAmount).", 422);
        }

        try {
            DB::connection('tenant')->transaction(function () use ($invoice, $validated) {
                if ($invoice->installments()->where('paid_amount', '>', 0)->exists()) {
                    throw new \DomainException('Cannot regenerate installments because some have already been paid.');
                }

                $invoice->installments()->delete();

                foreach ($validated['installments'] as $inst) {
                    $invoice->installments()->create([
                        'due_date' => $inst['due_date'],
                        'amount' => $inst['amount'],
                        'paid_amount' => 0,
                        'status' => 'unpaid',
                    ]);
                }
            });
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success(
            $invoice->installments()->orderBy('due_date')->get(),
            'Installments saved successfully',
            201
        );
    }
}
