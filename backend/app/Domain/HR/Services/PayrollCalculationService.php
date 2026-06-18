<?php

namespace App\Domain\HR\Services;

class PayrollCalculationService
{
    public function calculate(
        float $basicSalary,
        int $absentDays,
        int $workingDaysInMonth,
        float $bonuses = 0,
        float $extraDeductions = 0
    ): array {
        if ($workingDaysInMonth <= 0) {
            $workingDaysInMonth = 30;
        }

        $dailyRate = $basicSalary / $workingDaysInMonth;
        $deductions = round(($dailyRate * $absentDays) + $extraDeductions, 2);
        $netSalary = round(max($basicSalary - $deductions + $bonuses, 0), 2);

        return [
            'basic_salary' => $basicSalary,
            'daily_rate' => round($dailyRate, 2),
            'absent_days' => $absentDays,
            'working_days_in_month' => $workingDaysInMonth,
            'deductions' => $deductions,
            'bonuses' => $bonuses,
            'net_salary' => $netSalary,
        ];
    }
}
