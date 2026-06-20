<?php

declare(strict_types=1);

namespace App\Infrastructure\Database;

use Illuminate\Database\Migrations\Migration;

/**
 * Base class for all Tenant and Central database migrations.
 * 
 * Enforces PostgreSQL DDL Transactions ($withinTransaction = true).
 * If a migration fails halfway through execution, PostgreSQL will 
 * automatically rollback all schema changes instantly. This prevents 
 * corrupted partial-states and allows for perfectly clean deployments 
 * and rollbacks.
 */
abstract class TenantMigration extends Migration
{
    /**
     * Enforce DDL Transactional Safety.
     * Requires the connection driver to support DDL transactions (e.g., PostgreSQL).
     */
    public $withinTransaction = true;
}
