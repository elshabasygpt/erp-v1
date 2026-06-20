<?php

return [

    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => public_path(),
            'url' => env('APP_URL').'/',
            'visibility' => 'public',
            'throw' => false,
        ],

        // Dedicated disk for tenant DB/files backups. Kept separate from the
        // app's default disk so enabling backups never changes where normal
        // uploads (product images, attachments) are stored.
        'backups' => [
            'driver' => env('BACKUP_DISK_DRIVER', 'local'),
            'root' => storage_path('app/backups'),
            'key' => env('BACKUP_S3_KEY', env('AWS_ACCESS_KEY_ID')),
            'secret' => env('BACKUP_S3_SECRET', env('AWS_SECRET_ACCESS_KEY')),
            'region' => env('BACKUP_S3_REGION', env('AWS_DEFAULT_REGION', 'us-east-1')),
            'bucket' => env('BACKUP_S3_BUCKET'),
            'endpoint' => env('BACKUP_S3_ENDPOINT'),
            'use_path_style_endpoint' => env('BACKUP_S3_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => true,
        ],

    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
