<?php
declare(strict_types=1);
namespace App\Infrastructure\Eloquent\Models;

class TaskCommentModel extends BaseModel
{
    protected $table = 'task_comments';

    protected $fillable = ['task_id', 'user_id', 'content'];

    public function task() { return $this->belongsTo(TaskModel::class, 'task_id'); }
    public function user() { return $this->belongsTo(UserModel::class, 'user_id')->select(['id','name']); }
}
