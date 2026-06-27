<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases;

use App\Application\Approvals\Services\ApprovalWorkflowService;
use App\Application\Exceptions\ApprovalRequiredException;
use App\Application\Sales\DTOs\CreateInvoiceDTO;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Inventory\Repositories\ProductRepositoryInterface;
use App\Domain\Sales\Entities\Invoice;
use App\Domain\Sales\Entities\InvoiceItem;
use App\Domain\Sales\Repositories\InvoiceRepositoryInterface;
use App\Domain\Sales\Repositories\SalesChannelRepositoryInterface;
use App\Domain\Sales\Rules\InvoiceRules;
use App\Domain\Sales\Services\ZatcaPhase1Service;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use Illuminate\Support\Facades\DB;

/**
 * CreateInvoiceUseCase
 *
 * Orchestrates invoice creation:
 * 1. Generates invoice number
 * 2. Creates invoice with items
 * 3. Validates business rules
 * 4. Deduct stock from warehouse
 * 5. Creates automatic journal entries
 * 6. Updates customer balance (for credit invoices)
 */
final class CreateInvoiceUseCase
{
    public function __construct(
        private InvoiceRepositoryInterface $invoiceRepository,
        private ProductRepositoryInterface $productRepository,
        private JournalEntryRepositoryInterface $journalEntryRepository,
        private ZatcaPhase1Service $zatcaPhase1Service,
        private SalesChannelRepositoryInterface $salesChannelRepository,
        private ApprovalWorkflowService $approvalService,
    ) {}

    public function execute(CreateInvoiceDTO $dto, string $userId): Invoice
    {
        return DB::connection('tenant')->transaction(function () use ($dto, $userId) {
            // 1. Generate invoice number
            $invoiceNumber = $this->invoiceRepository->getNextInvoiceNumber();

            // 2. Build invoice items
            $items = [];
            foreach ($dto->items as $itemDTO) {
                $items[] = new InvoiceItem(
                    id: null,
                    invoiceId: '', // Will be set after invoice creation
                    productId: $itemDTO->productId,
                    quantity: $itemDTO->quantity,
                    unitPrice: $itemDTO->unitPrice,
                    discountPercent: $itemDTO->discountPercent,
                    vatRate: $itemDTO->vatRate,
                    productName: null,
                    baseUnitPrice: $itemDTO->baseUnitPrice,
                    adjustedUnitPrice: $itemDTO->adjustedUnitPrice,
                    adjustmentAmount: $itemDTO->adjustmentAmount,
                    coreChargeApplied: $itemDTO->coreChargeApplied,
                    coreChargeAmount: $itemDTO->coreChargeAmount,
                    printedName: $itemDTO->printedName,
                );
            }

            // Handle Sales Channel
            $salesChannel = null;
            if ($dto->salesChannelId) {
                $salesChannel = $this->salesChannelRepository->findById($dto->salesChannelId);
            }

            // 3. Create invoice entity
            $invoice = new Invoice(
                id: null,
                invoiceNumber: $invoiceNumber,
                customerId: $dto->customerId,
                type: $dto->type,
                subtotal: 0,
                vatAmount: 0,
                discountAmount: 0,
                total: 0,
                status: 'draft', // Always instantiate as draft initially, then confirm if needed
                notes: $dto->notes,
                warehouseId: $dto->warehouseId,
                createdBy: $userId,
                updatedBy: null,
                invoiceDate: null,
                zatcaQrCode: null,
                zatcaXml: null,
                zatcaHash: null,
                zatcaUuid: null,
                zatcaStatus: 'pending',
                zatcaErrorMessage: null,
                salesChannelId: $salesChannel?->getId(),
                salesChannelName: $salesChannel?->getName(),
                pricingAdjustmentType: $salesChannel ? $salesChannel->getPricingMethod() : null,
                pricingAdjustmentValue: $salesChannel ? ($salesChannel->getPricingMethod() === 'percentage' ? $salesChannel->getMarkupPercentage() : $salesChannel->getFixedMarkup()) : null,
                dueDate: $dto->dueDate ? new \DateTimeImmutable($dto->dueDate) : null,
                internalNotes: $dto->internalNotes,
                referenceNo: $dto->referenceNo,
                paidAmount: $dto->type === 'cash' ? 0 : $dto->paidAmount, // Will calculate later
                salespersonId: $dto->salespersonId ?? $userId,
                costCenterId: $dto->costCenterId,
                currencyId: $dto->currencyId,
                exchangeRate: $dto->exchangeRate,
                paymentMethod: $dto->paymentMethod,
            );

            $invoice->setItems($items);

            if ($dto->status === 'confirmed') {
                if ($dto->type === 'credit' && $dto->customerId) {
                    $customer = CustomerModel::query()->find($dto->customerId);
                    if ($customer && (float) $customer->credit_limit > 0) {
                        $dueAmount = $invoice->getTotal() - $dto->paidAmount;
                        if ($dueAmount > 0 && ((float) $customer->balance + $dueAmount) > (float) $customer->credit_limit) {
                            if (! $dto->creditLimitOverride) {
                                throw new \DomainException("Credit Limit Exceeded. Customer balance is {$customer->balance}, Credit Limit is {$customer->credit_limit}, and Due Amount is {$dueAmount}. Manager override required.");
                            }
                            // Override requested: verify role meta_attributes.can_override_credit_limit
                            $hasOverridePermission = false;
                            if ($userId) {
                                $user = \App\Infrastructure\Eloquent\Models\UserModel::query()->find($userId);
                                if ($user && $user->role_id) {
                                    $role = DB::connection('tenant')->table('roles')->where('id', $user->role_id)->first();
                                    $meta = json_decode($role->meta_attributes ?? '{}', true);
                                    $hasOverridePermission = (bool) ($meta['can_override_credit_limit'] ?? false);
                                }
                            }
                            if (!$hasOverridePermission) {
                                throw new \DomainException('You do not have permission to override the customer credit limit.');
                            }
                        }
                    }
                }

                // 4. Validate business rules
                $errors = InvoiceRules::validateForConfirmation($invoice);
                if (! empty($errors)) {
                    throw new \DomainException(implode(' ', $errors));
                }

                // 4.5. Evaluate Approvals
                $triggers = $this->approvalService->evaluateInvoice($invoice, $dto);
                if (! empty($triggers)) {
                    // Change status to pending_approval and stop confirmation
                    $invoice->setStatus('pending_approval');
                    $savedInvoice = $this->invoiceRepository->create($invoice);

                    $this->approvalService->requestApproval('invoice', $savedInvoice->getId(), $triggers, $userId);

                    throw new ApprovalRequiredException('Invoice requires manager approval due to: '.$triggers[0]['reason'], $savedInvoice->getId());
                }

                // 5. Skip confirming the invoice here.
                // Confirmation logic is now handled exclusively by ConfirmInvoiceUseCase.
            }

            // 6. Persist invoice as draft/pending_approval
            $savedInvoice = $this->invoiceRepository->create($invoice);

            // Do not automatically call ConfirmInvoiceUseCase here.
            // Let the controller handle it explicitly based on the request status.

            return $savedInvoice;
        });
    }
}
