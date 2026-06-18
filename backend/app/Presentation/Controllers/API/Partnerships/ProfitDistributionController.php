<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Partnerships;

use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\PartnerModel;
use App\Infrastructure\Eloquent\Models\PartnerProfitShareModel;
use App\Infrastructure\Eloquent\Models\ProfitDistributionModel;
use App\Infrastructure\Eloquent\Models\PurchaseInvoiceModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProfitDistributionController extends BaseTenantController
{
    /**
     * Display a listing of past distributions.
     */
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $distributions = ProfitDistributionModel::query()->where('tenant_id', $this->getTenantId($request))->where('tenant_id', $this->getTenantId($request))->with('shares.partner')
            ->orderBy('created_at', 'desc')
            ->paginate((int) $limit);

        return $this->paginated($distributions->toArray(), 'Distributions retrieved successfully');
    }

    /**
     * Preview calculation for a specific period before approving.
     */
    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
        ]);

        $start = $request->get('period_start');
        $end = $request->get('period_end');
        $tenantId = $this->getTenantId($request);

        // Calculate Revenue (Sales Invoices)
        $revenue = InvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->where('tenant_id', $tenantId)->whereBetween('invoice_date', [$start, $end])
            ->sum('total');

        // Calculate Expenses (Purchase Invoices / Operating expenses)
        $expenses = PurchaseInvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->where('tenant_id', $tenantId)->whereBetween('invoice_date', [$start, $end])
            ->sum('total');

        $netProfit = $revenue - $expenses;

        // Fetch active partners
        $partners = PartnerModel::query()->where('tenant_id', $this->getTenantId($request))->where('tenant_id', $tenantId)->where('is_active', true)->get();

        $shares = [];
        $totalPartnerShare = 0;

        foreach ($partners as $partner) {
            $shareAmount = 0;
            if ($netProfit > 0) {
                $shareAmount = $netProfit * ($partner->profit_share_percentage / 100);
            }

            $shares[] = [
                'partner_id' => $partner->id,
                'partner_name' => $partner->name,
                'share_percentage' => $partner->profit_share_percentage,
                'amount' => $shareAmount,
            ];

            $totalPartnerShare += $shareAmount;
        }

        // Project Owner (Company) remaining share
        $ownerShare = $netProfit > 0 ? ($netProfit - $totalPartnerShare) : 0;

        return $this->success([
            'period_start' => $start,
            'period_end' => $end,
            'total_revenue' => $revenue,
            'total_expenses' => $expenses,
            'net_profit' => $netProfit,
            'can_distribute' => $netProfit > 0,
            'owner_business_share' => $ownerShare,
            'partner_shares' => $shares,
        ], 'Preview calculated');
    }

    /**
     * Store and Approve a profit distribution.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::connection('tenant')->beginTransaction();

            $start = $validated['period_start'];
            $end = $validated['period_end'];
            $tenantId = $this->getTenantId($request);

            // Recalculate to ensure accuracy at moment of approval
            $revenue = InvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->where('tenant_id', $tenantId)->whereBetween('invoice_date', [$start, $end])->sum('total');
            $expenses = PurchaseInvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->where('tenant_id', $tenantId)->whereBetween('invoice_date', [$start, $end])->sum('total');
            $netProfit = $revenue - $expenses;

            if ($netProfit <= 0) {
                return $this->error('Cannot distribute profits. Net profit is zero or negative (loss).', 422);
            }

            // Check if period overlaps with existing approved distributions to prevent double dip
            $overlappingExists = ProfitDistributionModel::query()->where('tenant_id', $this->getTenantId($request))->where('tenant_id', $tenantId)->where('status', 'approved')
                ->where(function ($q) use ($start, $end) {
                    $q->whereBetween('period_start', [$start, $end])
                        ->orWhereBetween('period_end', [$start, $end]);
                })->exists();

            if ($overlappingExists) {
                return $this->error('A profit distribution has already been approved for dates within this period.', 422);
            }

            $partners = PartnerModel::query()->where('tenant_id', $this->getTenantId($request))->where('tenant_id', $tenantId)->where('is_active', true)->get();
            $totalDistributed = 0;

            $distributionId = Str::uuid()->toString();

            // Generate Shares
            foreach ($partners as $partner) {
                $shareAmount = $netProfit * ($partner->profit_share_percentage / 100);

                if ($shareAmount > 0) {
                    PartnerProfitShareModel::query()->create([
                        'tenant_id' => $this->getTenantId($request),
                        'id' => Str::uuid()->toString(),
                        'tenant_id' => $tenantId,
                        'distribution_id' => $distributionId,
                        'partner_id' => $partner->id,
                        'share_percentage' => $partner->profit_share_percentage,
                        'amount' => $shareAmount,
                        'is_paid' => false,
                    ]);

                    /** @var PartnerModel $partner */
                    $partner->update([
                        'total_pending' => $partner->total_pending + $shareAmount,
                    ]);

                    $totalDistributed += $shareAmount;
                }
            }

            // Create Master Record
            $distribution = ProfitDistributionModel::query()->create([
                'tenant_id' => $this->getTenantId($request),
                'id' => $distributionId,
                'tenant_id' => $tenantId,
                'period_start' => $start,
                'period_end' => $end,
                'total_revenue' => $revenue,
                'total_expenses' => $expenses,
                'net_profit' => $netProfit,
                'distributed_amount' => $totalDistributed,
                'status' => 'approved',
                'notes' => $validated['notes'] ?? null,
                'approved_at' => now(), // Assuming authed user approves immediately
                // 'approved_by' => request()->user()->id() // If auth hooked up correctly
            ]);

            DB::connection('tenant')->commit();

            return $this->success($distribution->load('shares.partner'), 'Profits distributed and approved successfully.', 201);

        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();

            return $this->error('Failed to distribute profits: '.$e->getMessage(), 500);
        }
    }
}
