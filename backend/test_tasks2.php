<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

try {
    $tenantId = DB::table('users')->first()->tenant_id;
    $userId = DB::table('users')->first()->id;

    $task = new \App\Infrastructure\Eloquent\Models\TaskModel([
        'title' => 'Test Task from script',
        'status' => 'todo',
    ]);
    $task->tenant_id = $tenantId;
    $task->created_by = $userId;
    $task->save();

    echo "Task Created: " . $task->id . "\n";

    $tasks = \App\Infrastructure\Eloquent\Models\TaskModel::withoutGlobalScopes()->get();
    echo "Total Tasks: " . $tasks->count() . "\n";
} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
}
