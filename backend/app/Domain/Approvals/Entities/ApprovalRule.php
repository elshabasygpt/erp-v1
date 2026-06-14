<?php
namespace App\Domain\Approvals\Entities;

class ApprovalRule
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $tenantId,
        public readonly string $requestableType,
        public readonly float $minAmount,
        public readonly float $maxAmount,
        public readonly int $approverRoleId,
        public readonly int $escalateAfterHours,
    ) {}
}
