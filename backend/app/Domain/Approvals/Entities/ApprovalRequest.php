<?php
namespace App\Domain\Approvals\Entities;

class ApprovalRequest
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $tenantId,
        public readonly string $requestableType,
        public readonly string $requestableId,
        public readonly string $requestedBy,
        public readonly string $status,
        public readonly ?string $assignedTo,
        public readonly ?string $notes,
        public readonly ?string $decidedAt,
    ) {}

    public static function create(array $data): self
    {
        return new self(
            id: null,
            tenantId: $data['tenant_id'],
            requestableType: $data['requestable_type'],
            requestableId: $data['requestable_id'],
            requestedBy: $data['requested_by'],
            status: 'pending',
            assignedTo: $data['assigned_to'] ?? null,
            notes: null,
            decidedAt: null,
        );
    }
}
