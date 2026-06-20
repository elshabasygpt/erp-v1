<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

/**
 * Run this on the actual server (not in a sandbox) before relying on the
 * backup system: it verifies the pg_dump/psql/tar/gzip binaries are on PATH
 * and that the 'backups' disk (S3) is actually reachable with the
 * configured credentials. Catches the class of failure that only shows up
 * once a real backup is attempted in production.
 */
class CheckBackupEnvironmentCommand extends Command
{
    protected $signature = 'backups:check-environment';

    protected $description = 'Verify the binaries and storage required for tenant backups are available';

    public function handle(): int
    {
        $rows = [];
        $allOk = true;

        foreach ([
            'pg_dump' => env('PG_DUMP_BINARY', 'pg_dump'),
            'psql' => env('PSQL_BINARY', 'psql'),
            'tar' => 'tar',
            'gzip' => 'gzip',
        ] as $label => $binary) {
            $result = Process::run([$binary, '--version']);
            $ok = $result->successful();
            $allOk = $allOk && $ok;
            $rows[] = [$label, $ok ? '✅ found' : '❌ not found on PATH', trim($ok ? $result->output() : $result->errorOutput())];
        }

        try {
            $testKey = 'healthcheck/'.now()->timestamp.'.txt';
            Storage::disk('backups')->put($testKey, 'ok');
            $readBack = Storage::disk('backups')->get($testKey) === 'ok';
            Storage::disk('backups')->delete($testKey);

            $rows[] = ['S3 backups disk', $readBack ? '✅ read/write OK' : '❌ wrote but read-back mismatch', ''];
            $allOk = $allOk && $readBack;
        } catch (\Throwable $e) {
            $rows[] = ['S3 backups disk', '❌ failed', $e->getMessage()];
            $allOk = false;
        }

        $this->table(['Check', 'Status', 'Detail'], $rows);

        if (! $allOk) {
            $this->error('One or more checks failed. Backups will not work reliably until these are fixed.');

            return self::FAILURE;
        }

        $this->info('All backup environment checks passed.');

        return self::SUCCESS;
    }
}
