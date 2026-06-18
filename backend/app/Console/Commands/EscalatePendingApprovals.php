<?php

namespace App\Console\Commands;

use App\Infrastructure\Eloquent\Models\Approvals\ApprovalAuditLogModel;
use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class EscalatePendingApprovals extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'approvals:escalate {--hours=24 : The number of hours before a pending request is escalated}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Escalate pending approval requests that have exceeded the waiting period';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $hours = (int) $this->option('hours');
        $thresholdTime = now()->subHours($hours);

        $pendingRequests = ApprovalRequestModel::query()->where('status', 'pending')
            ->whereNull('escalated_at')
            ->where('created_at', '<', $thresholdTime)
            ->get();

        if ($pendingRequests->isEmpty()) {
            $this->info('No pending requests to escalate.');

            return;
        }

        foreach ($pendingRequests as $request) {
            // Mark as escalated
            $request->escalated_at = now();

            // Optionally, we could change the required_role to 'admin' by updating the rule,
            // but rules are shared across requests. Instead, we can let the frontend or Controller
            // handle the 'escalated' state, or we could change the rule assigned to this request if we wanted.
            // For now, tracking `escalated_at` and keeping status `pending` allows admins to filter escalated ones.

            $request->save();

            // Log escalation
            ApprovalAuditLogModel::query()->create([
                'id' => Str::uuid()->toString(),
                'approval_request_id' => $request->id,
                'user_id' => null, // System action
                'action' => 'escalated',
                'notes' => "Escalated automatically after waiting {$hours} hours.",
            ]);

            $this->info("Escalated request {$request->id}.");
        }

        $this->info("Escalated {$pendingRequests->count()} requests.");
    }
}
