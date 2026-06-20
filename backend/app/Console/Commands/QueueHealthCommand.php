<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class QueueHealthCommand extends Command
{
    protected $signature = 'queue:health {--threshold=10 : The maximum allowed failed jobs before triggering an alert}';

    protected $description = 'Monitor the failed_jobs table and alert on failure spikes to prevent silent background data loss';

    public function handle(): int
    {
        $threshold = (int) $this->option('threshold');

        // Check if failed_jobs table exists yet
        if (!DB::getSchemaBuilder()->hasTable('failed_jobs')) {
            $this->error('The failed_jobs table does not exist. Run migrations first.');
            return self::FAILURE;
        }

        $failedCount = DB::table('failed_jobs')->count();

        if ($failedCount >= $threshold) {
            $message = "CRITICAL: The ERP queue has accumulated {$failedCount} failed jobs! This exceeds the safety threshold of {$threshold}. Manual intervention is required to prevent background data loss (e.g. lost invoices, failed backups).";
            
            Log::critical($message);
            $this->error($message);
            
            // Note: In a production setting, this would trigger PagerDuty or Slack via a dedicated Notification channel
            return self::FAILURE;
        }

        $this->info("Queue Health: OK. Failed jobs: {$failedCount} / {$threshold}");

        return self::SUCCESS;
    }
}
