<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class LatePenaltyRuleModel extends BaseModel
{
    protected $table = 'late_penalty_rules';

    protected $fillable = [
        'late_from_minutes', 'late_to_minutes',
        'deduction_type', 'deduction_value',
        'grace_minutes', 'label', 'label_ar',
        'is_active', 'sort_order', 'created_by',
    ];

    protected $casts = [
        'late_from_minutes' => 'integer',
        'late_to_minutes'   => 'integer',
        'deduction_value'   => 'decimal:2',
        'grace_minutes'     => 'integer',
        'is_active'         => 'boolean',
        'sort_order'        => 'integer',
    ];

    /**
     * احسب مبلغ الجزاء لعدد دقائق تأخير محدد وراتب أساسي
     *
     * @param int $lateMinutes — عدد الدقائق الفعلية للتأخير (بعد grace period)
     * @param float $baseSalary — الراتب الأساسي للموظف
     * @return float
     */
    public function calculatePenalty(int $lateMinutes, float $baseSalary): float
    {
        return match($this->deduction_type) {
            'fixed'              => (float) $this->deduction_value,
            'per_minute'         => (float) $this->deduction_value * $lateMinutes,
            'percentage_of_daily' => ($baseSalary / 30) * ((float) $this->deduction_value / 100),
            default              => 0.0,
        };
    }

    /**
     * هل هذه القاعدة تنطبق على عدد الدقائق؟
     */
    public function appliesTo(int $lateMinutes): bool
    {
        $to = (int) $this->late_to_minutes;
        return $lateMinutes >= $this->late_from_minutes
            && ($to === 0 || $lateMinutes <= $to);
    }

    /**
     * احسب الـ grace period وارجع الدقائق الفعلية
     */
    public function effectiveLateMinutes(int $rawLateMinutes): int
    {
        return max(0, $rawLateMinutes - (int) $this->grace_minutes);
    }
}
