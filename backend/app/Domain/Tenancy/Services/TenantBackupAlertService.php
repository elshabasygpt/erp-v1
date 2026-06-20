<?php

declare(strict_types=1);

namespace App\Domain\Tenancy\Services;

use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Infrastructure\Services\TenantDatabaseManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Notifies a tenant's admin users when a scheduled/manual backup or a
 * restore permanently fails. Failures are otherwise only visible by
 * someone opening the tenant_backups table, so this is the difference
 * between "we silently stopped protecting this tenant's data" and
 * someone actually finding out.
 */
final class TenantBackupAlertService
{
    public function __construct(
        private TenantDatabaseManager $databaseManager,
    ) {}

    public function notifyFailure(TenantModel $tenant, string $operation, string $errorMessage): void
    {
        try {
            $emails = $this->getAdminEmails($tenant);

            foreach ($emails as $email) {
                Mail::send([], [], function ($message) use ($email, $tenant, $operation, $errorMessage) {
                    $message->to($email)
                        ->subject("[{$tenant->name}] Backup alert: {$operation} failed")
                        ->html(
                            "<p>The {$operation} for tenant <strong>{$tenant->name}</strong> failed.</p>".
                            '<p>Error: '.e($errorMessage).'</p>'.
                            '<p>Please check the Backups & Restore section in Settings.</p>'
                        );
                });
            }

            if (empty($emails)) {
                Log::warning('TenantBackupAlertService: no admin email found to notify', [
                    'tenant_id' => $tenant->id,
                    'operation' => $operation,
                ]);
            }
        } catch (\Throwable $e) {
            // Never let an alerting failure mask the original backup failure.
            Log::error('TenantBackupAlertService failed to send alert', [
                'tenant_id' => $tenant->id,
                'operation' => $operation,
                'alert_error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @return array<string>
     */
    private function getAdminEmails(TenantModel $tenant): array
    {
        $this->databaseManager->switchToDatabase($tenant->database_name);

        try {
            return DB::connection('tenant')
                ->table('users')
                ->join('roles', 'users.role_id', '=', 'roles.id')
                ->where('roles.name', 'admin')
                ->where('users.is_active', true)
                ->pluck('users.email')
                ->filter()
                ->values()
                ->all();
        } finally {
            $this->databaseManager->resetConnection();
        }
    }
}
