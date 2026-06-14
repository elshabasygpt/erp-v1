<?php

declare(strict_types=1);

namespace App\Application\Approvals\UseCases;

use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\SalesReturnModel;
use Illuminate\Support\Facades\DB;

class RejectRequestUseCase
{
    public function execute(string $requestId, string $userId, string $notes = ''): void
    {
        DB::transaction(function () use ($requestId, $userId, $notes) {
            $request = ApprovalRequestModel::with('rule')->findOrFail($requestId);

            if ($request->status !== 'pending') {
                throw new \DomainException("Request is not pending.");
            }

            $user = \App\Infrastructure\Eloquent\Models\UserModel::findOrFail($userId);
            $rule = $request->rule;

            if ($rule && !$user->hasRole($rule->required_role)) {
                // Log unauthorized attempt
                \App\Infrastructure\Eloquent\Models\Approvals\ApprovalAuditLogModel::create([
                    'id' => \Illuminate\Support\Str::uuid()->toString(),
                    'approval_request_id' => $request->id,
                    'user_id' => $userId,
                    'action' => 'unauthorized_bypass_attempt',
                    'notes' => 'Attempted to reject without required role: ' . $rule->required_role,
                ]);
                throw new \Illuminate\Auth\Access\AuthorizationException("You do not have the required role ({$rule->required_role}) to reject this request.");
            }

            $request->status = 'rejected';
            $request->resolved_by = $userId;
            $request->notes = $notes;
            $request->save();

            // Log rejection action
            \App\Infrastructure\Eloquent\Models\Approvals\ApprovalAuditLogModel::create([
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'approval_request_id' => $request->id,
                'user_id' => $userId,
                'action' => 'rejected',
                'notes' => $notes,
            ]);

            // Handle rejection logic.
            if ($request->entity_type === 'invoice') {
                $invoice = InvoiceModel::find($request->entity_id);
                if ($invoice && $invoice->status === 'pending_approval') {
                    $invoice->status = 'cancelled';
                    $invoice->save();
                }
            } else if ($request->entity_type === 'return') {
                $return = SalesReturnModel::find($request->entity_id);
                if ($return && $return->status === 'pending_approval') {
                    $return->status = 'cancelled';
                    $return->save();
                }
            }
        });
    }
}
