<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\CRM;

use App\Presentation\Controllers\API\BaseTenantController;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CrmDashboardController extends BaseTenantController
{
    /**
     * Get comprehensive CRM insights for a specific customer
     */
    public function getCustomerInsights(string $id): JsonResponse
    {
        $customer = CustomerModel::where('tenant_id', $this->getTenantId($request))->with(['notes.user', 'interactions.user', 'followUps.assignee'])->find($id);

        if (!$customer) {
            return $this->error('Customer not found', 404);
        }

        // Purchase History (last 10 invoices)
        $purchaseHistory = InvoiceModel::where('tenant_id', $this->getTenantId($request))->where('customer_id', $id)
            ->where('status', '!=', 'cancelled')
            ->orderBy('invoice_date', 'desc')
            ->take(10)
            ->get(['id', 'invoice_number', 'total', 'invoice_date', 'status']);

        // Aggregate Metrics
        $totalSpend = InvoiceModel::where('tenant_id', $this->getTenantId($request))->where('customer_id', $id)
            ->where('status', '!=', 'cancelled')
            ->sum('total');

        $totalInvoices = InvoiceModel::where('tenant_id', $this->getTenantId($request))->where('customer_id', $id)
            ->where('status', '!=', 'cancelled')
            ->count();

        $averageBasket = $totalInvoices > 0 ? $totalSpend / $totalInvoices : 0;

        // Preferred Products
        $preferredProducts = DB::connection('tenant')->table('invoice_items')->where('invoice_items.tenant_id', $this->getTenantId($request))
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->where('invoices.customer_id', $id)
            ->where('invoices.status', '!=', 'cancelled')
            ->select('products.name', 'products.id', DB::raw('SUM(invoice_items.quantity) as total_quantity'))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_quantity')
            ->limit(5)
            ->get();

        return $this->success([
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'balance' => $customer->balance,
                'loyalty_points' => $customer->loyalty_points,
                'segment' => $customer->segment ?? 'Unsegmented',
            ],
            'metrics' => [
                'total_spend' => $totalSpend,
                'total_invoices' => $totalInvoices,
                'average_basket' => $averageBasket,
            ],
            'purchase_history' => $purchaseHistory,
            'preferred_products' => $preferredProducts,
            'recent_notes' => $customer->notes->sortByDesc('created_at')->take(5)->values(),
            'communication_history' => $customer->interactions->sortByDesc('interaction_date')->take(10)->values(),
            'active_follow_ups' => $customer->followUps->where('status', 'pending')->values(),
        ], 'Customer CRM insights retrieved successfully');
    }
}


