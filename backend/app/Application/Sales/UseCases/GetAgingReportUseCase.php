<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases;

use Illuminate\Support\Facades\DB;

class GetAgingReportUseCase
{
    public function execute(): array
    {
        $sql = "
            SELECT 
                c.id as customer_id,
                c.name as customer_name,
                c.balance as total_due,
                SUM(CASE WHEN CURRENT_DATE - i.due_date <= 30 THEN i.total - i.paid_amount ELSE 0 END) as _0_30_days,
                SUM(CASE WHEN CURRENT_DATE - i.due_date > 30 AND CURRENT_DATE - i.due_date <= 60 THEN i.total - i.paid_amount ELSE 0 END) as _31_60_days,
                SUM(CASE WHEN CURRENT_DATE - i.due_date > 60 AND CURRENT_DATE - i.due_date <= 90 THEN i.total - i.paid_amount ELSE 0 END) as _61_90_days,
                SUM(CASE WHEN CURRENT_DATE - i.due_date > 90 THEN i.total - i.paid_amount ELSE 0 END) as over_90_days
            FROM customers c
            JOIN invoices i ON c.id = i.customer_id
            WHERE i.type = 'credit' 
              AND i.payment_status != 'paid'
              AND i.due_date IS NOT NULL
              AND i.due_date < CURRENT_DATE
            GROUP BY c.id, c.name, c.balance
            HAVING SUM(i.total - i.paid_amount) > 0
            ORDER BY over_90_days DESC, _61_90_days DESC
        ";

        return DB::select($sql);
    }
}
