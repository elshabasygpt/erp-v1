<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Accounting;

use App\Domain\Accounting\Services\CreditNoteService;
use App\Infrastructure\Eloquent\Models\Accounting\CreditNoteModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CreditNoteController extends BaseTenantController
{
    public function __construct(
        private CreditNoteService $creditNoteService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type');
        $query = CreditNoteModel::query()->where('tenant_id', $this->getTenantId($request))->with(['customer', 'supplier', 'salesInvoice', 'purchaseInvoice']);

        if ($type) {
            $query->where('type', $type);
        }

        $creditNotes = $query->orderBy('created_at', 'desc')->paginate(15);

        return $this->paginated($creditNotes->toArray(), 'Credit notes retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|in:customer,supplier',
            'customer_id' => 'required_if:type,customer|nullable|uuid|exists:customers,id',
            'supplier_id' => 'required_if:type,supplier|nullable|uuid|exists:suppliers,id',
            'invoice_id' => 'nullable|uuid|exists:invoices,id',
            'purchase_invoice_id' => 'nullable|uuid|exists:purchase_invoices,id',
            'issue_date' => 'required|date',
            'subtotal' => 'required|numeric|min:0',
            'vat_amount' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'reason' => 'nullable|string',
        ]);

        try {
            $creditNote = $this->creditNoteService->createCreditNote($validated, (string) (Auth::id() ?? ''));

            return $this->created($creditNote, 'Credit note created successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to create credit note: '.$e->getMessage(), 422);
        }
    }

    public function apply(string $id): JsonResponse
    {
        try {
            $this->creditNoteService->applyCreditNote($id, (string) (Auth::id() ?? ''));

            return $this->success(null, 'Credit note applied successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to apply credit note: '.$e->getMessage(), 422);
        }
    }
}
