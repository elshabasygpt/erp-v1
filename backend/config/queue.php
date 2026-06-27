<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Queue Connection Name
    |--------------------------------------------------------------------------
    |
    | Laravel's queue supports a variety of backends via a single, unified
    | API, giving you convenient access to each backend using identical
    | syntax for every one. The default queue connection used by ShouldQueue
    | jobs that don't explicitly choose one (e.g. ZATCA submission,
    | webhooks) stays 'sync' — unchanged, runs inline as before. Only jobs
    | that explicitly call ->onConnection('database') (e.g. the product
    | import job, see ProductImportExportController::import()) use the
    | real queue below and need a `php artisan queue:work --queue=imports
    | --connection=database` worker process running to actually process.
    |
    */

    'default' => env('QUEUE_CONNECTION', 'sync'),

    'connections' => [

        'sync' => [
            'driver' => 'sync',
        ],

        'database' => [
            'driver' => 'database',
            'connection' => env('DB_CONNECTION', 'sqlite'),
            'table' => 'jobs',
            'queue' => 'default',
            'retry_after' => 90,
            'after_commit' => false,
        ],

    ],

    'batching' => [
        'database' => env('DB_CONNECTION', 'sqlite'),
        'table' => 'job_batches',
    ],

    'failed' => [
        'driver' => env('QUEUE_FAILED_DRIVER', 'database-uuids'),
        'database' => env('DB_CONNECTION', 'sqlite'),
        'table' => 'failed_jobs',
    ],

];
