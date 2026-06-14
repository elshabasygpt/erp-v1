<?php

namespace App\Infrastructure\Eloquent\Models;

class AccountModel extends BaseModel
{
    protected $table = 'accounts';
    protected $fillable = ['code', 'name', 'name_ar', 'type', 'parent_id', 'is_active', 'description', 'level', 'created_by', 'updated_by'];
    protected $casts = ['is_active' => 'boolean', 'level' => 'integer'];
    public function parent() { return $this->belongsTo(self::class, 'parent_id'); }
    public function children() { return $this->hasMany(self::class, 'parent_id'); }
    public function journalLines() { return $this->hasMany(JournalEntryLineModel::class, 'account_id'); }
}
