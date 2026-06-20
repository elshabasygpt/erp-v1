<?php

declare(strict_types=1);

namespace App\Application\Purchases\UseCases;

use Illuminate\Support\Facades\DB;

class GetSupplierAgingReportUseCase
{
    public function execute(string $tenantId): array
    {
        $sql = "
            SELECT 
                s.id as supplier_id,
                s.name as supplier_name,
                s.balance as total_due,
                SUM(CASE WHEN CURRENT_DATE - pi.due_date <= 30 THEN pi.total - pi.paid_amount ELSE 0 END) as _0_30_days,
                SUM(CASE WHEN CURRENT_DATE - pi.due_date > 30 AND CURRENT_DATE - pi.due_date <= 60 THEN pi.total - pi.paid_amount ELSE 0 END) as _31_60_days,
                SUM(CASE WHEN CURRENT_DATE - pi.due_date > 60 AND CURRENT_DATE - pi.due_date <= 90 THEN pi.total - pi.paid_amount ELSE 0 END) as _61_90_days,
                SUM(CASE WHEN CURRENT_DATE - pi.due_date > 90 THEN pi.total - pi.paid_amount ELSE 0 END) as over_90_days
            FROM suppliers s
            JOIN purchase_invoices pi ON s.id = pi.supplier_id
            WHERE s.tenant_id = :tenantId
              AND pi.tenant_id = :tenantId
              AND pi.payment_status != 'paid'
              AND pi.due_date IS NOT NULL
              AND pi.due_date < CURRENT_DATE
            GROUP BY s.id, s.name, s.balance
            HAVING SUM(pi.total - pi.paid_amount) > 0
            ORDER BY over_90_days DESC, _61_90_days DESC
        ";

        return DB::select($sql, ['tenantId' => $tenantId]);
    }
}
