<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\ShippingInvoiceModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ShippingController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $status = $request->query('status');
        
        $query = ShippingInvoiceModel::with(['salesInvoice.customer', 'salesInvoice.items.product', 'creator'])->orderBy('created_at', 'desc');
        
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $shippings = $query->paginate((int) $limit);

        return $this->paginated($shippings->toArray(), 'Shipping invoices retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_id' => 'required|uuid|exists:invoices,id',
            'carrier' => 'nullable|string',
            'tracking_number' => 'nullable|string',
            'shipping_cost' => 'nullable|numeric|min:0',
            'shipping_address' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        try {
            // Ensure no duplicate shipping for an invoice
            $existing = ShippingInvoiceModel::where('invoice_id', $validated['invoice_id'])->first();
            if ($existing) {
                return $this->error('A shipping invoice already exists for this sales invoice.', 422);
            }

            $lastShip = ShippingInvoiceModel::latest('created_at')->first();
            $nextNum = $lastShip ? ((int) str_replace('SHP-', '', $lastShip->shipping_number)) + 1 : 1;
            $shipNumber = 'SHP-' . str_pad((string)$nextNum, 6, '0', STR_PAD_LEFT);

            $shipping = ShippingInvoiceModel::create([
                'id' => Str::uuid()->toString(),
                'shipping_number' => $shipNumber,
                'invoice_id' => $validated['invoice_id'],
                'carrier' => $validated['carrier'] ?? null,
                'tracking_number' => $validated['tracking_number'] ?? null,
                'shipping_cost' => $validated['shipping_cost'] ?? 0,
                'status' => 'pending',
                'shipping_address' => $validated['shipping_address'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            return $this->success($shipping, 'Shipping invoice created successfully', 201);
            
        } catch (\Exception $e) {
            return $this->error('Failed to create shipping invoice: ' . $e->getMessage(), 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $shipping = ShippingInvoiceModel::find($id);

        if (!$shipping) { return $this->error('Shipping invoice not found', 404); }

        $validated = $request->validate([
            'carrier' => 'nullable|string',
            'tracking_number' => 'nullable|string',
            'shipping_cost' => 'nullable|numeric|min:0',
            'shipping_address' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $shipping->update($validated);

        return $this->success($shipping, 'Shipping invoice updated successfully', 200);
    }

    public function show(string $id): JsonResponse
    {
        $shipping = ShippingInvoiceModel::with(['salesInvoice.customer', 'salesInvoice.items.product'])->find($id);

        if (!$shipping) {
            return $this->error('Shipping invoice not found', 404);
        }

        return $this->success($shipping, 'Shipping invoice retrieved successfully');
    }
    
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $shipping = ShippingInvoiceModel::find($id);

        if (!$shipping) {
            return $this->error('Shipping invoice not found', 404);
        }
        
        $validated = $request->validate([
            'status' => 'required|string|in:pending,shipped,delivered,returned,cancelled',
        ]);

        $updateData = ['status' => $validated['status']];
        
        if ($validated['status'] === 'shipped' && !$shipping->shipped_at) {
            $updateData['shipped_at'] = now();
        }
        if ($validated['status'] === 'delivered' && !$shipping->delivered_at) {
            $updateData['delivered_at'] = now();
        }
        
        $shipping->update($updateData);
        
        return $this->success($shipping, 'Shipping status updated successfully');
    }
}
