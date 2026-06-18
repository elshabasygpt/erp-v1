<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Application\Sales\DTOs\CreateQuotationDTO;
use App\Application\Sales\UseCases\Quotations\CreateQuotationUseCase;
use App\Domain\Sales\Services\QuotationService;
use App\Domain\Sales\Services\SalesWorkflowService;
use App\Infrastructure\Eloquent\Models\QuotationModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuotationController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $status = $request->query('status');

        $query = QuotationModel::query()->where('tenant_id', $this->getTenantId($request))->with(['customer', 'items.product', 'creator'])->orderBy('issue_date', 'desc');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $quotations = $query->paginate((int) $limit);

        return $this->paginated($quotations->toArray(), 'Quotations retrieved successfully');
    }

    public function __construct(
        private readonly CreateQuotationUseCase $createQuotationUseCase,
        private readonly QuotationService $quotationService,
        private readonly SalesWorkflowService $salesWorkflowService
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'required|uuid|exists:customers,id',
            'warehouse_id' => 'nullable|uuid|exists:warehouses,id',
            'issue_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after_or_equal:issue_date',
            'status' => 'required|string|in:draft,sent,accepted,rejected,expired',
            'notes' => 'nullable|string',
            'parent_id' => 'nullable|uuid|exists:quotations,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.vat_rate' => 'required|numeric|min:0|max:100',
        ]);

        try {
            $dto = CreateQuotationDTO::fromRequest($validated);
            $quotation = $this->createQuotationUseCase->execute($dto, auth()->id() ?? '');

            // Update status if it's not draft
            if ($validated['status'] !== 'draft') {
                $quotation->update(['status' => $validated['status']]);
            }

            return $this->success($quotation, 'Quotation created successfully', 201);

        } catch (\Exception $e) {
            return $this->error('Failed to create quotation: '.$e->getMessage(), 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $quotation = QuotationModel::query()->where('tenant_id', $this->getTenantId($request))->find($id);

        if (! $quotation) {
            return $this->error('Quotation not found', 404);
        }

        $validated = $request->validate([
            'customer_id' => 'required|uuid|exists:customers,id',
            'issue_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after_or_equal:issue_date',
            'status' => 'required|string|in:draft,sent,accepted,rejected,expired',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.vat_rate' => 'required|numeric|min:0|max:100',
        ]);

        try {
            $quotation = $this->quotationService->updateQuotation($this->getTenantId($request), $id, $validated);

            return $this->success($quotation, 'Quotation updated successfully', 200);
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->error('Failed to update quotation: '.$e->getMessage(), 500);
        }
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $quotation = QuotationModel::query()->where('tenant_id', $this->getTenantId($request))->with(['items.product', 'customer'])->find($id);

        if (! $quotation) {
            return $this->error('Quotation not found', 404);
        }

        return $this->success($quotation, 'Quotation retrieved successfully');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $quotation = QuotationModel::query()->where('tenant_id', $this->getTenantId($request))->find($id);

        if (! $quotation) {
            return $this->error('Quotation not found', 404);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:draft,sent,accepted,rejected,expired',
        ]);

        $quotation->update(['status' => $validated['status']]);

        return $this->success($quotation, 'Quotation status updated successfully');
    }

    public function convert(Request $request, string $id): JsonResponse
    {
        try {
            $salesOrder = $this->salesWorkflowService->convertQuotationToSalesOrder(
                $this->getTenantId($request),
                $id,
                auth()->id() ?? ''
            );

            return $this->success($salesOrder->toArray(), 'Quotation converted to Sales Order successfully', 201);
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Failed to convert quotation: '.$e->getMessage());

            return $this->error('Failed to convert quotation: '.$e->getMessage(), 500);
        }
    }
}
