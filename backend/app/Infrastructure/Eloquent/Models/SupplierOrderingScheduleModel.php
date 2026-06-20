<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Carbon\Carbon;

class SupplierOrderingScheduleModel extends BaseModel
{
    protected $table = 'supplier_ordering_schedules';

    protected $fillable = [
        'supplier_id', 'order_day_of_week', 'lead_time_days', 'frequency_weeks',
        'order_time', 'reminder_enabled', 'reminder_hours_before',
        'responsible_email', 'notes', 'is_active', 'created_by',
    ];

    protected $casts = [
        'is_active'              => 'boolean',
        'reminder_enabled'       => 'boolean',
        'order_day_of_week'      => 'integer',
        'lead_time_days'         => 'integer',
        'frequency_weeks'        => 'integer',
        'reminder_hours_before'  => 'integer',
    ];

    /**
     * اسم اليوم بالعربي
     */
    public function getOrderDayNameAttribute(): string
    {
        $days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        return $days[$this->order_day_of_week] ?? '';
    }

    /**
     * تاريخ الطلبية القادمة
     */
    public function getNextOrderDateAttribute(): Carbon
    {
        $today      = now();
        $targetDay  = (int) $this->order_day_of_week;
        $currentDay = (int) $today->dayOfWeek;
        $daysUntil  = ($targetDay - $currentDay + 7) % 7;
        if ($daysUntil === 0) {
            $daysUntil = 7 * $this->frequency_weeks;
        }
        return $today->copy()->addDays($daysUntil);
    }

    /**
     * تاريخ وصول البضاعة المتوقع
     */
    public function getExpectedDeliveryDateAttribute(): Carbon
    {
        return $this->next_order_date->addDays($this->lead_time_days);
    }

    public function supplier()
    {
        return $this->belongsTo(SupplierModel::class, 'supplier_id');
    }
}
