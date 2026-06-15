<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\CRM;

use App\Presentation\Controllers\API\BaseTenantController;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends BaseTenantController
{
    /**
     * Display a listing of suppliers.
     */
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $search = $request->query('search');

        $query = SupplierModel::where('tenant_id', $this->getTenantId($request))
            ->withCount('purchaseInvoices as orders_count')
            ->withSum('purchaseInvoices as total_purchases', 'total')
            ->withMax('purchaseInvoices as last_order', 'invoice_date');

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'ilike', '%' . $search . '%')
                  ->orWhere('phone', 'ilike', '%' . $search . '%')
                  ->orWhere('email', 'ilike', '%' . $search . '%');
            });
        }

        $suppliers = $query->orderBy('created_at', 'desc')->paginate((int) $limit);

        $suppliers->getCollection()->transform(function ($s) {
            $s->status = $s->is_active ? 'active' : 'inactive';
            $s->category = $s->category ?? 'local';
            $s->payment_type = 'cash'; // Default if credit_limit not in DB
            $s->credit_limit = 0;
            $s->total_purchases = $s->total_purchases ?: 0;
            return $s;
        });

        return $this->paginated($suppliers->toArray(), 'Suppliers retrieved successfully');
    }

    /**
     * Store a newly created supplier in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated['tenant_id'] = $this->getTenantId($request);
        $supplier = SupplierModel::create([
            'tenant_id' => $this->getTenantId($request),
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'tax_number' => $validated['tax_number'] ?? null,
            'balance' => 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return $this->success($supplier, 'Supplier created successfully', 201);
    }

    /**
     * Display the specified supplier.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $supplier = SupplierModel::where('tenant_id', $this->getTenantId($request))->find($id);

        if (!$supplier) {
            return $this->error('Supplier not found', 404);
        }

        return $this->success($supplier, 'Supplier retrieved successfully');
    }

    /**
     * Update the specified supplier in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $supplier = SupplierModel::where('tenant_id', $this->getTenantId($request))->find($id);

        if (!$supplier) {
            return $this->error('Supplier not found', 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|max:255|unique:suppliers,email,' . $id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'tax_number' => 'nullable|string|max:50',
            'is_active' => 'boolean',
        ]);

        $supplier->update($validated);

        return $this->success($supplier, 'Supplier updated successfully');
    }

    /**
     * Remove the specified supplier from storage.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $supplier = SupplierModel::where('tenant_id', $this->getTenantId($request))->find($id);

        if (!$supplier) {
            return $this->error('Supplier not found', 404);
        }

        // Ideally check relationships before deletion
        $supplier->delete();

        return $this->success(null, 'Supplier deleted successfully');
    }

    /**
     * Export all suppliers to XLSX format
     */
    public function export(Request $request)
    {
        $suppliers = SupplierModel::cursor();
        
        $data = [
            ['Name', 'Email', 'Phone', 'Address', 'Tax Number', 'Current Balance']
        ];
        
        foreach ($suppliers as $supplier) {
            $data[] = [
                $supplier->name,
                $supplier->email,
                $supplier->phone,
                $supplier->address,
                $supplier->tax_number,
                $supplier->balance
            ];
        }

        $xlsx = \App\Infrastructure\Helpers\SimpleXLSXGen::fromArray($data);
        return response((string) $xlsx, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="suppliers.xlsx"'
        ]);
    }

    /**
     * Import suppliers from XLSX format
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls'
        ]);

        $file = $request->file('file')->getPathname();
        
        if ($xlsx = \App\Infrastructure\Helpers\SimpleXLSX::parse($file)) {
            $rows = $xlsx->rows();
            
            $imported = 0;
            $isFirst = true;
            foreach ($rows as $item) {
                if ($isFirst) { $isFirst = false; continue; } // Skip header
                
                $row = (array) $item;
                $name = $row[0] ?? null;
                if (empty($name)) continue;
                
                SupplierModel::updateOrCreate(
                    ['email' => ($row[1] ?? null) ?: null],
                    [
                        'id' => \Illuminate\Support\Str::uuid()->toString(),
                        'name' => $name,
                        'phone' => $row[2] ?? null,
                        'address' => $row[3] ?? null,
                        'tax_number' => $row[4] ?? null,
                        'balance' => $row[5] ?? 0,
                    ]
                );
                $imported++;
            }
            return $this->success(['imported' => $imported], "Successfully imported $imported suppliers.");
        } else {
            return $this->error('Failed to parse Excel file', 400);
        }
    }

    /**
     * Get Supplier Ledger Statement (كشف حساب تفصيلي)
     */
    public function statement(string $id): JsonResponse
    {
        $supplier = SupplierModel::where('tenant_id', $this->getTenantId($request))->with(['purchaseInvoices', 'vouchers'])->find($id);

        if (!$supplier) {
            return $this->error('Supplier not found', 404);
        }

        $ledger = [];
        $transactions = collect();

        // 1. Invoices (Credit - We owe supplier)
        foreach ($supplier->purchaseInvoices as $invoice) {
            $transactions->push([
                '_date' => $invoice->invoice_date,
                'type' => 'invoice',
                'reference' => $invoice->invoice_number,
                'date' => $invoice->invoice_date->format('Y-m-d'),
                'description' => 'فاتورة مشتريات',
                'debit' => 0,
                'credit' => (float) $invoice->total,
            ]);
        }

        // 2. Vouchers (Debit/Credit based on type)
        // payment (صرف) -> we pay them -> Debit AP (-)
        // discount -> they give us discount -> Debit AP (-)
        // receipt -> they refund us -> Credit AP (+)
        foreach ($supplier->vouchers as $voucher) {
            $isDebit = in_array($voucher->type, ['payment', 'discount']); 
            $transactions->push([
                '_date' => $voucher->date,
                'type' => 'voucher_' . $voucher->type,
                'reference' => $voucher->reference_number,
                'date' => $voucher->date->format('Y-m-d'),
                'description' => $voucher->notes ?: 'سند ' . $voucher->type,
                'debit' => $isDebit ? (float) $voucher->amount : 0,
                'credit' => $isDebit ? 0 : (float) $voucher->amount,
            ]);
        }

        $transactions = $transactions->sortBy('_date')->values();

        // Calculate actual opening balance
        // opening_balance = current_balance - sum(credit) + sum(debit)
        $totalDebit = $transactions->sum('debit');
        $totalCredit = $transactions->sum('credit');
        $runningBalance = (float) $supplier->balance - $totalCredit + $totalDebit;

        $ledger[] = [
            'type' => 'opening_balance',
            'reference' => '-',
            'date' => $supplier->created_at->format('Y-m-d'),
            'description' => 'رصيد افتتاحي (سابق)',
            'debit' => $runningBalance < 0 ? abs($runningBalance) : 0,
            'credit' => $runningBalance > 0 ? $runningBalance : 0, 
            'balance' => $runningBalance,
        ];

        // For Supplier, Running AP Balance = Opening + Credits (Invoices) - Debits (Payments)
        foreach ($transactions as $tx) {
            $runningBalance += $tx['credit'];
            $runningBalance -= $tx['debit'];
            
            $tx['balance'] = $runningBalance;
            unset($tx['_date']);
            $ledger[] = $tx;
        }

        return $this->success([
            'supplier' => $supplier->name,
            'opening_balance' => (float) $supplier->balance,
            'current_balance' => $runningBalance,
            'statement' => $ledger
        ], 'Supplier statement generated successfully.');
    }
}


