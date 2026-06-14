<?php

namespace App\Infrastructure\Eloquent\Models;

class ActivityLogModel extends BaseModel
{
    protected $table = 'activity_logs';
    protected $fillable = ['user_id', 'action', 'model_type', 'model_id', 'old_values', 'new_values', 'ip_address', 'user_agent'];
    protected $casts = ['old_values' => 'array', 'new_values' => 'array'];
    public function user() { return $this->belongsTo(UserModel::class, 'user_id'); }
}
