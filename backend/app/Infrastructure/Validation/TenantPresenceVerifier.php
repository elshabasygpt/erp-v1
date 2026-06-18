<?php

namespace App\Infrastructure\Validation;

use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\DatabasePresenceVerifier;

class TenantPresenceVerifier extends DatabasePresenceVerifier
{
    private function injectTenantScope(string $collection, array &$extra): void
    {
        // Resolve tenant ID from auth or headers
        $tenantId = null;
        if (auth()->check()) {
            $tenantId = auth()->user()->tenant_id;
        } elseif (request()->header('X-Tenant-ID')) {
            $tenantId = request()->header('X-Tenant-ID');
        }

        if (! $tenantId) {
            return;
        }

        // Determine table name (collection might be 'connection.table' or just 'table')
        $parts = explode('.', $collection);
        $table = count($parts) === 2 ? $parts[1] : $parts[0];
        $connectionName = count($parts) === 2 ? $parts[0] : $this->connection;

        // Check if table has tenant_id column
        // This is necessary because some central tables like migrations or plans might not have it.
        // Caching the result for performance.
        static $schemaCache = [];
        $cacheKey = $connectionName.'.'.$table;

        if (! isset($schemaCache[$cacheKey])) {
            $schemaCache[$cacheKey] = Schema::connection($connectionName)->hasColumn($table, 'tenant_id');
        }

        if ($schemaCache[$cacheKey]) {
            // Append tenant_id scope
            $extra['tenant_id'] = $tenantId;
        }
    }

    public function getCount($collection, $column, $value, $excludeId = null, $idColumn = null, array $extra = [])
    {
        $this->injectTenantScope($collection, $extra);

        return parent::getCount($collection, $column, $value, $excludeId, $idColumn, $extra);
    }

    public function getMultiCount($collection, $column, array $values, array $extra = [])
    {
        $this->injectTenantScope($collection, $extra);

        return parent::getMultiCount($collection, $column, $values, $extra);
    }
}
