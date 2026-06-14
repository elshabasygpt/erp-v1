<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\CRM;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CustomerController extends BaseController
{
    /**
     * Display a listing of customers.
     */
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', 15);
        $search = $request->query('search');

        $query = CustomerModel::query();

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'ilike', '%' . $search . '%')
                  ->orWhere('phone', 'ilike', '%' . $search . '%')
                  ->orWhere('email', 'ilike', '%' . $search . '%');
            });
        }

        $customers = $query->orderBy('created_at', 'desc')->paginate((int) $limit);

        return $this->paginated($customers->toArray(), 'Customers retrieved successfully');
    }

    /**
     * Store a newly created customer in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255|unique:customers,email',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'tax_number' => 'nullable|string|max:50',
            'is_active' => 'boolean',
        ]);

        $customer = CustomerModel::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'tax_number' => $validated['tax_number'] ?? null,
            'balance' => 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return $this->success($customer, 'Customer created successfully', 201);
    }

    /**
     * Display the specified customer.
     */
    public function show(string $id): JsonResponse
    {
        $customer = CustomerModel::find($id);

        if (!$customer) {
            return $this->error('Customer not found', 404);
        }

        return $this->success($customer, 'Customer retrieved successfully');
    }

    /**
     * Update the specified customer in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $customer = CustomerModel::find($id);

        if (!$customer) {
            return $this->error('Customer not found', 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|max:255|unique:customers,email,' . $id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'tax_number' => 'nullable|string|max:50',
            'is_active' => 'boolean',
        ]);

        $customer->update($validated);

        return $this->success($customer, 'Customer updated successfully');
    }

    /**
     * Remove the specified customer from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $customer = CustomerModel::find($id);

        if (!$customer) {
            return $this->error('Customer not found', 404);
        }

        // Ideally check if customer has invoices before deleting, soft delete or prevent deletion
        $customer->delete();

        return $this->success(null, 'Customer deleted successfully');
    }

    /**
     * Export all customers to XLSX format
     */
    public function export(Request $request)
    {
        $customers = CustomerModel::cursor();
        
        $data = [
            ['Name', 'Email', 'Phone', 'Address', 'Tax Number', 'Current Balance', 'Loyalty Points', 'Segment']
        ];
        
        foreach ($customers as $customer) {
            $data[] = [
                $customer->name,
                $customer->email,
                $customer->phone,
                $customer->address,
                $customer->tax_number,
                $customer->balance,
                $customer->loyalty_points,
                $customer->segment ?? 'Unsegmented'
            ];
        }

        $xlsx = \App\Infrastructure\Helpers\SimpleXLSXGen::fromArray($data);
        return response((string) $xlsx, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="customers.xlsx"'
        ]);
    }

    /**
     * Import customers from XLSX format
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
            $failed = 0;
            $isFirst = true;
            
            foreach ($rows as $index => $item) {
                if ($isFirst) { $isFirst = false; continue; } // Remove header
                $row = (array) $item;

                // Ensure row has basic data (Name) and avoid OutOfBoundsException
                $name = trim((string) ($row[0] ?? ''));
                if (empty($name)) {
                    $failed++;
                    continue;
                }
                
                $email = trim((string) ($row[1] ?? ''));
                if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $email = null; // Ignore invalid emails rather than crashing
                }
                
                $phone = trim((string) ($row[2] ?? ''));
                $address = trim((string) ($row[3] ?? ''));
                $tax_number = trim((string) ($row[4] ?? ''));
                
                $balanceStr = preg_replace('/[^0-9.-]/', '', (string) ($row[5] ?? '0'));
                $balance = is_numeric($balanceStr) ? (float) $balanceStr : 0.0;
                
                try {
                    CustomerModel::updateOrCreate(
                        ['email' => $email ?: \Illuminate\Support\Str::random(10) . '@temp.local'], // Prevent null matching all
                        [
                            'id' => \Illuminate\Support\Str::uuid()->toString(),
                            'name' => $name,
                            'email' => $email ?: null,
                            'phone' => $phone ?: null,
                            'address' => $address ?: null,
                            'tax_number' => $tax_number ?: null,
                            'balance' => $balance,
                        ]
                    );
                    $imported++;
                } catch (\Exception $e) {
                    $failed++;
                    Log::warning("Customer import failed for row $index: " . $e->getMessage());
                }
            }
            return $this->success(['imported' => $imported, 'failed' => $failed], "Successfully imported $imported customers. Failed: $failed.");
        } else {
            return $this->error('Failed to parse Excel file', 400);
        }
    }

    /**
     * Get Customer Ledger Statement (كشف حساب تفصيلي)
     */
    public function statement(string $id): JsonResponse
    {
        $customer = CustomerModel::with(['invoices', 'vouchers'])->find($id);

        if (!$customer) {
            return $this->error('Customer not found', 404);
        }

        $ledger = [];
        $transactions = collect();

        // 1. Invoices (Debit - Customer owes us)
        foreach ($customer->invoices as $invoice) {
            $transactions->push([
                '_date' => $invoice->invoice_date,
                'type' => 'invoice',
                'reference' => $invoice->invoice_number,
                'date' => $invoice->invoice_date->format('Y-m-d'),
                'description' => 'فاتورة مبيعات',
                'debit' => (float) $invoice->total,
                'credit' => 0,
            ]);
        }

        // 2. Vouchers (Credit/Debit based on type)
        foreach ($customer->vouchers as $voucher) {
            $isCredit = in_array($voucher->type, ['receipt', 'discount']); // Customer pays us or gets discount
            $transactions->push([
                '_date' => $voucher->date,
                'type' => 'voucher_' . $voucher->type,
                'reference' => $voucher->reference_number,
                'date' => $voucher->date->format('Y-m-d'),
                'description' => $voucher->notes ?: 'سند ' . $voucher->type,
                'debit' => $isCredit ? 0 : (float) $voucher->amount,
                'credit' => $isCredit ? (float) $voucher->amount : 0,
            ]);
        }

        // Sorting by Date
        $transactions = $transactions->sortBy('_date')->values();

        // Calculate actual opening balance
        // opening_balance = current_balance - sum(debit) + sum(credit)
        $totalDebit = $transactions->sum('debit');
        $totalCredit = $transactions->sum('credit');
        $runningBalance = (float) $customer->balance - $totalDebit + $totalCredit;

        // Add Opening Balance as first entry
        $ledger[] = [
            'type' => 'opening_balance',
            'reference' => '-',
            'date' => $customer->created_at->format('Y-m-d'),
            'description' => 'رصيد افتتاحي (سابق)',
            'debit' => $runningBalance > 0 ? $runningBalance : 0,
            'credit' => $runningBalance < 0 ? abs($runningBalance) : 0,
            'balance' => $runningBalance,
        ];

        // Compute running balance chronologically
        foreach ($transactions as $tx) {
            $runningBalance += $tx['debit'];
            $runningBalance -= $tx['credit'];
            
            $tx['balance'] = $runningBalance;
            unset($tx['_date']); // remove sorting key
            $ledger[] = $tx;
        }

        return $this->success([
            'customer' => $customer->name,
            'opening_balance' => (float) $customer->balance,
            'current_balance' => $runningBalance,
            'statement' => $ledger
        ], 'Customer statement generated successfully.');
    }
}
