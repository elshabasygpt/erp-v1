<?php
declare(strict_types=1);
namespace App\Infrastructure\Eloquent\Models;

use Carbon\Carbon;

class TaskModel extends BaseModel
{
    protected $table = 'tasks';

    protected $fillable = [
        'title', 'description', 'priority', 'status', 'category', 'color',
        'due_date', 'due_time', 'reminder_at',
        'created_by', 'assigned_to',
        'related_type', 'related_id', 'related_label',
        'sort_order', 'completed_at', 'updated_by',
    ];

    protected $casts = [
        'due_date'     => 'date',
        'reminder_at'  => 'datetime',
        'completed_at' => 'datetime',
        'sort_order'   => 'integer',
    ];

    // هل المهمة متأخرة؟
    public function getIsOverdueAttribute(): bool
    {
        if (!$this->due_date || $this->status === 'done' || $this->status === 'cancelled') {
            return false;
        }
        return $this->due_date->isPast();
    }

    // هل مستحقة اليوم؟
    public function getIsDueTodayAttribute(): bool
    {
        return $this->due_date && $this->due_date->isToday()
            && !in_array($this->status, ['done', 'cancelled']);
    }

    // أيام المتبقية (سالب = تأخرت)
    public function getDaysUntilDueAttribute(): ?int
    {
        if (!$this->due_date) return null;
        return (int) now()->startOfDay()->diffInDays($this->due_date->startOfDay(), false);
    }

    public function creator()  { return $this->belongsTo(UserModel::class, 'created_by')->select(['id','name','email']); }
    public function assignee() { return $this->belongsTo(UserModel::class, 'assigned_to')->select(['id','name','email']); }
    public function comments() { return $this->hasMany(TaskCommentModel::class, 'task_id')->with('user:id,name')->latest(); }
}
