<?php

namespace Tests\Feature\Tenancy;

use App\Domain\Tenancy\Services\TenantBackupService;
use App\Infrastructure\Eloquent\Models\TenantBackupModel;
use App\Infrastructure\Eloquent\Models\TenantModel;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TenantBackupTest extends TestCase
{
    use RefreshDatabase;
    private function fakeAllProcesses(): void
    {
        Process::fake(function ($process) {
            $command = $process->command;

            if (is_array($command)) {
                $binary = basename((string) ($command[0] ?? ''));

                if (str_contains($binary, 'pg_dump')) {
                    $idx = array_search('-f', $command, true);
                    if ($idx !== false && isset($command[$idx + 1])) {
                        File::ensureDirectoryExists(dirname($command[$idx + 1]));
                        File::put($command[$idx + 1], "-- fake dump --\n");
                    }

                    return Process::result(output: '');
                }

                if ($binary === 'tar' && in_array('-czf', $command, true)) {
                    $idx = array_search('-czf', $command, true);
                    if ($idx !== false && isset($command[$idx + 1])) {
                        File::ensureDirectoryExists(dirname($command[$idx + 1]));
                        File::put($command[$idx + 1], 'fake-tar-bytes');
                    }

                    return Process::result(output: '');
                }

                if ($binary === 'gzip' && in_array('-c', $command, true)) {
                    return Process::result(output: 'fake-gz-bytes');
                }
            }

            return Process::result(output: '');
        });
    }

    private function makeTenant(): TenantModel
    {
        return TenantModel::create([
            'id' => Str::uuid()->toString(),
            'name' => 'Acme Trading Co',
            'domain' => Str::random(10).'.example.com',
            'database_name' => 'tenant_test_'.Str::random(8),
            'status' => 'active',
        ]);
    }

    public function test_run_creates_a_completed_backup_and_uploads_to_the_backups_disk()
    {
        Storage::fake('backups');
        $this->fakeAllProcesses();

        $tenant = $this->makeTenant();

        $service = app(TenantBackupService::class);
        $backup = $service->run($tenant, 'manual');

        $this->assertEquals('completed', $backup->status);
        $this->assertNotNull($backup->db_dump_path);
        $this->assertNotNull($backup->files_archive_path);
        $this->assertGreaterThan(0, $backup->size_bytes);

        Storage::disk('backups')->assertExists($backup->db_dump_path);
        Storage::disk('backups')->assertExists($backup->files_archive_path);

        /** @var \Illuminate\Database\Eloquent\Builder $query */
        $query = TenantBackupModel::query();
        $this->assertEquals(1, $query->where(['tenant_id' => $tenant->id])->count());
    }

    public function test_run_records_a_failed_backup_when_the_dump_fails()
    {
        Storage::fake('backups');

        Process::fake(function ($process) {
            $command = $process->command;
            if (is_array($command) && str_contains((string) ($command[0] ?? ''), 'pg_dump')) {
                return Process::result(output: '', errorOutput: 'connection refused', exitCode: 1);
            }

            return Process::result(output: '');
        });

        $tenant = $this->makeTenant();

        $service = app(TenantBackupService::class);

        try {
            $service->run($tenant, 'manual');
            $this->fail('Expected a RuntimeException to be thrown.');
        } catch (\RuntimeException $e) {
            // expected
        }

        /** @var \Illuminate\Database\Eloquent\Builder $query */
        $query = TenantBackupModel::query();
        $backup = $query->where(['tenant_id' => $tenant->id])->first();
        $this->assertEquals('failed', $backup->status);
        $this->assertStringContainsString('connection refused', $backup->error_message);
    }

    public function test_prune_old_backups_keeps_minimum_count_and_removes_storage_for_the_rest()
    {
        Storage::fake('backups');
        $tenant = $this->makeTenant();

        // 'created_at' isn't mass-assignable, so set it via direct attribute
        // assignment (bypasses $fillable) to backdate these rows for the test.
        $old1 = TenantBackupModel::create([
            'tenant_id' => $tenant->id, 'type' => 'scheduled', 'status' => 'completed',
            'db_dump_path' => 'tenants/x/old1/db.sql.gz', 'files_archive_path' => 'tenants/x/old1/files.tar.gz',
        ]);
        $old1->created_at = now()->subDays(60);
        $old1->save();

        $old2 = TenantBackupModel::create([
            'tenant_id' => $tenant->id, 'type' => 'scheduled', 'status' => 'completed',
            'db_dump_path' => 'tenants/x/old2/db.sql.gz', 'files_archive_path' => 'tenants/x/old2/files.tar.gz',
        ]);
        $old2->created_at = now()->subDays(45);
        $old2->save();

        $recent = TenantBackupModel::create([
            'tenant_id' => $tenant->id, 'type' => 'scheduled', 'status' => 'completed',
            'db_dump_path' => 'tenants/x/recent/db.sql.gz', 'files_archive_path' => 'tenants/x/recent/files.tar.gz',
        ]);
        $recent->created_at = now()->subDays(1);
        $recent->save();

        Storage::disk('backups')->put($old1->db_dump_path, 'a');
        Storage::disk('backups')->put($old1->files_archive_path, 'a');
        Storage::disk('backups')->put($old2->db_dump_path, 'a');
        Storage::disk('backups')->put($old2->files_archive_path, 'a');
        Storage::disk('backups')->put($recent->db_dump_path, 'a');
        Storage::disk('backups')->put($recent->files_archive_path, 'a');

        $service = app(TenantBackupService::class);
        // keepMinimum=1 means only the most recent ($recent) is exempt by count;
        // both old1 and old2 are older than the 30-day retention window, so both get pruned.
        $prunedCount = $service->pruneOldBackups($tenant, retentionDays: 30, keepMinimum: 1);

        $this->assertEquals(2, $prunedCount);

        $old1->refresh();
        $old2->refresh();
        $recent->refresh();

        $this->assertEquals('pruned', $old1->status);
        $this->assertEquals('pruned', $old2->status);
        $this->assertEquals('completed', $recent->status);

        Storage::disk('backups')->assertMissing($old1->db_dump_path);
        Storage::disk('backups')->assertMissing($old2->db_dump_path);
        Storage::disk('backups')->assertExists($recent->db_dump_path);
    }
}
