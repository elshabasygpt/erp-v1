<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\QuotationModel;
use App\Infrastructure\Eloquent\Models\QuotationItemModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class QuotationController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $status = $request->query('status');
        
        $query = QuotationModel::with(['customer', 'items.product', 'creator'])->orderBy('issue_date', 'desc');
        
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $quotations = $query->paginate((int) $limit);

        return $this->paginated($quotations->toArray(), 'Quotations retrieved successfully');
    }

    public function __construct(
        private readonly \App\Application\Sales\UseCases\Quotations\CreateQuotationUseCase $createQuotationUseCase
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
            $dto = \App\Application\Sales\DTOs\CreateQuotationDTO::fromRequest($validated);
            $quotation = $this->createQuotationUseCase->execute($dto, auth()->id() ?? '');

            // Update status if it's not draft
            if ($validated['status'] !== 'draft') {
                $quotation->update(['status' => $validated['status']]);
            }

            return $this->success($quotation, 'Quotation created successfully', 201);
            
        } catch (\Exception $e) {
            return $this->error('Failed to create quotation: ' . $e->getMessage(), 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $quotation = QuotationModel::find($id);

        if (!$quotation) { return $this->error('Quotation not found', 404); }

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
            DB::beginTransaction();
            QuotationItemModel::where('quotation_id', $quotation->id)->delete();

            $subtotalAmount = 0;
            $taxAmount = 0;

            foreach ($validated['items'] as $item) {
                $gross = $item['quantity'] * $item['unit_price'];
                $itemTax = $gross * ($item['vat_rate'] / 100);
                $subtotalAmount += $gross;
                $taxAmount += $itemTax;
            }
            $totalAmount = $subtotalAmount + $taxAmount;

            $quotation->update([
                'customer_id' => $validated['customer_id'],
                'issue_date' => $validated['issue_date'] ?? $quotation->issue_date,
                'expiry_date' => $validated['expiry_date'] ?? null,
                'subtotal' => $subtotalAmount,
                'vat_amount' => $taxAmount,
                'total' => $totalAmount,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                $gross = $item['quantity'] * $item['unit_price'];
                $itemTax = $gross * ($item['vat_rate'] / 100);

                QuotationItemModel::create([
                    'id' => Str::uuid()->toString(),
                    'quotation_id' => $quotation->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'vat_rate' => $item['vat_rate'],
                    'total' => $gross + $itemTax,
                ]);
            }

            DB::commit();
            return $this->success($quotation->load('items'), 'Quotation updated successfully', 200);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Failed to update quotation: ' . $e->getMessage(), 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        $quotation = QuotationModel::with(['items.product', 'customer'])->find($id);

        if (!$quotation) {
            return $this->error('Quotation not found', 404);
        }

        return $this->success($quotation, 'Quotation retrieved successfully');
    }
    
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $quotation = QuotationModel::find($id);

        if (!$quotation) {
            return $this->error('Quotation not found', 404);
        }
        
        $validated = $request->validate([
            'status' => 'required|string|in:draft,sent,accepted,rejected,expired',
        ]);
        
        $quotation->update(['status' => $validated['status']]);
        
        return $this->success($quotation, 'Quotation status updated successfully');
    }
}
