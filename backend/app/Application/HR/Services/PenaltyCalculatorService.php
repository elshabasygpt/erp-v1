<?php

declare(strict_types=1);

namespace App\Application\HR\Services;

use App\Infrastructure\Eloquent\Models\LatePenaltyRuleModel;
use Illuminate\Support\Facades\Cache;

class PenaltyCalculatorService
{
    /**
     * أوجد القاعدة المناسبة واحسب الجزاء
     *
     * @return array{
     *   penalty_amount: float,
     *   rule: LatePenaltyRuleModel|null,
     *   effective_late_minutes: int,
     *   grace_minutes_applied: int
     * }
     */
    public function calculate(int $rawLateMinutes, float $baseSalary, string $tenantId): array
    {
        if ($rawLateMinutes <= 0) {
            return [
                'penalty_amount'         => 0.0,
                'rule'                   => null,
                'effective_late_minutes' => 0,
                'grace_minutes_applied'  => 0,
            ];
        }

        // اجلب القواعد النشطة مرتبة
        $rules = Cache::remember("penalty_rules_{$tenantId}", 300, function () {
            return LatePenaltyRuleModel::where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('late_from_minutes')
                ->get();
        });

        foreach ($rules as $rule) {
            if (!$rule->appliesTo($rawLateMinutes)) continue;

            $graceApplied       = (int) $rule->grace_minutes;
            $effectiveMinutes   = $rule->effectiveLateMinutes($rawLateMinutes);

            // لو بعد السماح بقى صفر → لا جزاء
            if ($effectiveMinutes <= 0) {
                return [
                    'penalty_amount'         => 0.0,
                    'rule'                   => $rule,
                    'effective_late_minutes' => 0,
                    'grace_minutes_applied'  => $graceApplied,
                ];
            }

            $penaltyAmount = $rule->calculatePenalty($effectiveMinutes, $baseSalary);

            return [
                'penalty_amount'         => round($penaltyAmount, 6),
                'rule'                   => $rule,
                'effective_late_minutes' => $effectiveMinutes,
                'grace_minutes_applied'  => $graceApplied,
            ];
        }

        // لا توجد قاعدة مطابقة
        return [
            'penalty_amount'         => 0.0,
            'rule'                   => null,
            'effective_late_minutes' => $rawLateMinutes,
            'grace_minutes_applied'  => 0,
        ];
    }
}
