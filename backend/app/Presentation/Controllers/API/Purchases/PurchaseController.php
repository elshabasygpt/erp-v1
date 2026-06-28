<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Purchases;

use App\Application\Purchases\DTOs\CreatePurchaseDTO;
use App\Application\Purchases\UseCases\ConfirmPurchaseUseCase;
use App\Application\Purchases\UseCases\CreatePurchaseUseCase;
use App\Application\Services\Webhooks\WebhookService;
use App\Infrastructure\Eloquent\Models\PurchaseInvoiceModel;
use App\Presentation\Controllers\API\BaseTenantController;
use App\Presentation\Controllers\API\Concerns\HandlesImageUploads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Infrastructure\Eloquent\Models\SupplierPriceListModel;

class PurchaseController extends BaseTenantController
{
    use HandlesImageUploads;

    public function __construct(
        private readonly CreatePurchaseUseCase $createPurchaseUseCase,
        private readonly ConfirmPurchaseUseCase $confirmPurchaseUseCase,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $status = $request->query('status');

        $query = PurchaseInvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->with(['supplier', 'items.product'])->orderBy('invoice_date', 'desc');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $purchases = $query->paginate((int) $limit);

        return $this->paginated($purchases->toArray(), 'Purchases retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'issue_date' => 'required|date',
            'status' => 'required|string|in:draft,confirmed,cancelled',
            'payment_type' => 'required|string|in:cash,credit',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'required|numeric|min:0|max:100',
            'cost_center_id' => 'nullable|uuid|exists:tenant.cost_centers,id',
            'currency_id' => 'nullable|uuid|exists:tenant.currencies,id',
            'exchange_rate' => 'nullable|numeric|min:0.000001',
        ]);

        try {
            $validated['tenant_id'] = $this->getTenantId($request);
            $dto = CreatePurchaseDTO::fromRequest($validated);
            $purchase = $this->createPurchaseUseCase->execute($dto, auth()->id() ?? '');

            // تحديث last_purchase_date في supplier_price_lists تلقائياً
            foreach ($purchase->items as $item) {
                SupplierPriceListModel::where('tenant_id', $this->getTenantId($request))
                    ->where('supplier_id', $purchase->supplier_id)
                    ->where('product_id', $item->product_id)
                    ->update(['last_purchase_date' => $purchase->invoice_date->toDateString()]);
            }

            return $this->success($purchase, 'Purchase invoice created successfully', 201);
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Purchase creation failed: '.$e->getMessage());

            return $this->error('Failed to create purchase invoice: '.$e->getMessage(), 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $purchase = PurchaseInvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->find($id);
        if (! $purchase) {
            return $this->error('Purchase invoice not found', 404);
        }
        if ($purchase->status !== 'draft') {
            return $this->error('Cannot modify a confirmed invoice. Please use adjustments or returns.', 422);
        }

        $validated = $request->validate([
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'issue_date' => 'required|date',
            'status' => 'required|string|in:draft,confirmed,cancelled',
            'payment_type' => 'required|string|in:cash,credit',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'required|numeric|min:0|max:100',
            'cost_center_id' => 'nullable|uuid|exists:tenant.cost_centers,id',
            'currency_id' => 'nullable|uuid|exists:tenant.currencies,id',
            'exchange_rate' => 'nullable|numeric|min:0.000001',
        ]);

        try {
            // One transaction for the whole edit: the draft item rewrite + the
            // optional confirm must be atomic. Otherwise a confirm that throws
            // (e.g. no treasury safe / stock issue) would leave the rewritten
            // items and header committed without the matching stock/journal.
            \DB::connection('tenant')->transaction(function () use ($validated, $purchase) {
                // Delete old items and recreate (draft only)
                $purchase->items()->delete();

                $dto = CreatePurchaseDTO::fromRequest(array_merge($validated, ['supplier_id' => $validated['supplier_id']]));

                $subtotalAmount = 0;
                $taxAmount = 0;
                foreach ($dto->items as $item) {
                    $itemSub = round($item['quantity'] * $item['unit_price'], 6);
                    $itemTax = round($itemSub * ($item['tax_rate'] / 100), 6);
                    $subtotalAmount += $itemSub;
                    $taxAmount += $itemTax;
                }

                $purchase->update([
                    'supplier_id' => $dto->supplierId,
                    'warehouse_id' => $dto->warehouseId,
                    'invoice_date' => $dto->issueDate,
                    'subtotal' => round($subtotalAmount, 6),
                    'vat_amount' => round($taxAmount, 6),
                    'total' => round($subtotalAmount + $taxAmount, 6),
                    'status' => $dto->status === 'confirmed' ? 'draft' : $dto->status,
                    'notes' => $dto->notes,
                ]);

                foreach ($dto->items as $item) {
                    $itemSub = round($item['quantity'] * $item['unit_price'], 6);
                    $itemTax = round($itemSub * ($item['tax_rate'] / 100), 6);

                    $purchase->items()->create([
                        'id' => Str::uuid()->toString(),
                        'product_id' => $item['product_id'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'vat_rate' => $item['tax_rate'],
                        'total' => round($itemSub + $itemTax, 6),
                    ]);
                }

                // If updating to confirmed, run confirmation
                if ($dto->status === 'confirmed') {
                    $this->confirmPurchaseUseCase->execute($purchase->id, $dto->paymentType, auth()->id() ?? '');
                    $purchase->refresh();
                }
            });

            return $this->success($purchase->load('items'), 'Purchase invoice updated successfully');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Purchase update failed: '.$e->getMessage());

            return $this->error('Failed to update purchase invoice: '.$e->getMessage(), 500);
        }
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $purchase = PurchaseInvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->with(['items.product', 'supplier'])->find($id);
        if (! $purchase) {
            return $this->error('Purchase invoice not found', 404);
        }

        return $this->success($purchase, 'Purchase invoice retrieved successfully');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $purchase = PurchaseInvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->find($id);
        if (! $purchase) {
            return $this->error('Purchase invoice not found', 404);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:draft,confirmed,cancelled',
            'payment_type' => 'nullable|string|in:cash,credit',
        ]);

        if ($purchase->status === 'confirmed' && $validated['status'] !== 'confirmed') {
            return $this->error('A confirmed purchase cannot be reverted. Use Purchase Returns instead.', 403);
        }

        if ($purchase->status !== 'confirmed' && $validated['status'] === 'confirmed') {
            try {
                $paymentType = $validated['payment_type'] ?? 'cash';
                $this->confirmPurchaseUseCase->execute($purchase->id, $paymentType, auth()->id() ?? '');
                $purchase->refresh();

                WebhookService::dispatchForTenant(
                    tenantId: (string) $this->getTenantId($request),
                    event: 'purchase.confirmed',
                    payload: [
                        'purchase_id' => $purchase->id,
                        'supplier_id' => $purchase->supplier_id,
                        'total' => $purchase->total,
                    ]
                );
            } catch (\Exception $e) {
                \Log::error('Purchase confirmation failed: '.$e->getMessage());

                return $this->error('Failed to confirm purchase: '.$e->getMessage(), 500);
            }
        } else {
            $purchase->update(['status' => $validated['status']]);
        }

        return $this->success($purchase, 'Purchase invoice status updated successfully');
    }

    public function getInstallments(Request $request, string $id): JsonResponse
    {
        $purchase = PurchaseInvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->find($id);
        if (! $purchase) {
            return $this->error('Purchase invoice not found', 404);
        }

        $installments = $purchase->installments()->get();

        return $this->success($installments, 'Installments retrieved successfully');
    }

    public function saveInstallments(Request $request, string $id): JsonResponse
    {
        $purchase = PurchaseInvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->find($id);
        if (! $purchase) {
            return $this->error('Purchase invoice not found', 404);
        }

        $validated = $request->validate([
            'installments' => 'required|array|min:1',
            'installments.*.due_date' => 'required|date',
            'installments.*.amount' => 'required|numeric|min:0.01',
        ]);

        $totalInstallments = collect($validated['installments'])->sum('amount');
        $dueAmount = $purchase->total - $purchase->paid_amount;

        // Tolerance for rounding issues
        if (abs($totalInstallments - $dueAmount) > 0.1) {
            return $this->error("Total installments amount ($totalInstallments) does not match the invoice due amount ($dueAmount).", 422);
        }

        \DB::connection('tenant')->transaction(function () use ($purchase, $validated, $request) {
            // Only delete unpaid installments if we are regenerating
            // (Assuming we are fully replacing them if they are all unpaid)
            $hasPaid = $purchase->installments()->where('paid_amount', '>', 0)->exists();
            if ($hasPaid) {
                throw new \DomainException('Cannot regenerate installments because some have already been paid.');
            }

            $purchase->installments()->delete();

            foreach ($validated['installments'] as $inst) {
                $purchase->installments()->create([
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $this->getTenantId($request),
                    'due_date' => $inst['due_date'],
                    'amount' => $inst['amount'],
                    'paid_amount' => 0,
                    'status' => 'unpaid'
                ]);
            }
        });

        return $this->success($purchase->installments()->get(), 'Installments saved successfully', 201);
    }

    public function payInstallment(Request $request, string $id): JsonResponse
    {
        $installment = \App\Infrastructure\Eloquent\Models\PurchaseInstallmentModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->find($id);

        if (! $installment) {
            return $this->error('Installment not found', 404);
        }

        if ($installment->status === 'paid') {
            return $this->error('Installment is already fully paid.', 422);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string',
            'attachment' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120', // Max 5MB
            'safe_id' => 'nullable|uuid|exists:tenant.safes,id',
        ]);

        $amountToPay = (float) $validated['amount'];
        $remaining = $installment->amount - $installment->paid_amount;

        if ($amountToPay > $remaining + 0.1) {
            return $this->error("Cannot pay more than the remaining amount ($remaining).", 422);
        }

        $path = $installment->attachment_path;
        if ($request->hasFile('attachment')) {
            // Store under public/uploads/tenant_{id}/... — the only path mounted on the
            // Docker uploads volume (the old 'public' disk wrote outside it → lost on redeploy).
            $path = $this->storeUploadedImage($request->file('attachment'), $this->getTenantId($request), 'installments');
        }

        \DB::connection('tenant')->transaction(function () use ($installment, $validated, $amountToPay, $remaining, $path, $request) {
            $newPaid = $installment->paid_amount + $amountToPay;
            $status = ($newPaid >= $installment->amount - 0.1) ? 'paid' : 'partial';

            $installment->update([
                'paid_amount' => $newPaid,
                'status' => $status,
                'payment_method' => $validated['payment_method'],
                'payment_date' => now(),
                'attachment_path' => $path,
            ]);

            // Update the purchase invoice paid amount as well
            $invoice = $installment->purchaseInvoice;
            if ($invoice) {
                $invoice->increment('paid_amount', $amountToPay);
            }

            // Here we could also record a transaction in safe_transactions if safe_id is provided
            // For now, we focus on the installment state.
        });

        return $this->success($installment->refresh(), 'Installment payment recorded successfully');
    }
}
