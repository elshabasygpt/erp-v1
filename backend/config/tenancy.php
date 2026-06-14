<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Tenant Database Configuration
    |--------------------------------------------------------------------------
    |
    | This file configures the multi-tenant database-per-tenant setup.
    | Each tenant gets their own PostgreSQL database.
    |
    */

    'central_connection' => env('DB_CONNECTION', 'pgsql'),

    'tenant_connection' => 'tenant',

    'database_prefix' => env('TENANT_DB_PREFIX', 'tenant_'),

    'tenant_migrations_path' => database_path('migrations/tenant'),

    'central_migrations_path' => database_path('migrations/central'),

    /*
    |--------------------------------------------------------------------------
    | Tenant Identification
    |--------------------------------------------------------------------------
    |
    | How tenants are identified in incoming requests.
    | Supported: "subdomain", "header", "path"
    |
    */
    'identification' => 'header',

    'header_name' => 'X-Tenant-ID',

    /*
    |--------------------------------------------------------------------------
    | Trial Period
    |--------------------------------------------------------------------------
    */
    'trial_days' => 14,

    /*
    |--------------------------------------------------------------------------
    | Default Plan
    |--------------------------------------------------------------------------
    */
    'default_plan' => 'basic',
];
