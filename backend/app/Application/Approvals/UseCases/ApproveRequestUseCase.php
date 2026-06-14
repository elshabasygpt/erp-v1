<?php

declare(strict_types=1);

namespace App\Application\Approvals\UseCases;

use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel;
use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRuleModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\SalesReturnModel;
use Illuminate\Support\Facades\DB;

// We will need services to resume the actions. We can create separate UseCases or Services for confirming the pending actions.
use App\Application\Sales\UseCases\ConfirmInvoiceUseCase;
use App\Application\Sales\UseCases\Returns\ConfirmSalesReturnUseCase;

class ApproveRequestUseCase
{
    public function __construct(
        private readonly ConfirmInvoiceUseCase $confirmInvoiceUseCase,
        private readonly ConfirmSalesReturnUseCase $confirmSalesReturnUseCase
    ) {}

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
                    'notes' => 'Attempted to approve without required role: ' . $rule->required_role,
                ]);
                throw new \Illuminate\Auth\Access\AuthorizationException("You do not have the required role ({$rule->required_role}) to approve this request.");
            }
            
            $request->status = 'approved';
            $request->resolved_by = $userId;
            $request->notes = $notes;
            $request->save();

            // Log approval action
            \App\Infrastructure\Eloquent\Models\Approvals\ApprovalAuditLogModel::create([
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'approval_request_id' => $request->id,
                'user_id' => $userId,
                'action' => 'approved',
                'notes' => $notes,
            ]);

            // Resume Action
            if ($request->entity_type === 'invoice') {
                // Confirm the invoice
                $this->confirmInvoiceUseCase->execute($request->entity_id, $userId);
            } else if ($request->entity_type === 'return') {
                // Confirm the return
                $this->confirmSalesReturnUseCase->execute($request->entity_id, $userId);
            }
        });
    }
}
