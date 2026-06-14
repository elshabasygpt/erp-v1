<?php

declare(strict_types=1);

namespace App\Application\Exceptions;

use Exception;

class ApprovalRequiredException extends Exception
{
    private string $entityId;

    public function __construct(string $message, string $entityId)
    {
        parent::__construct($message, 428); // 428 Precondition Required
        $this->entityId = $entityId;
    }

    public function getEntityId(): string
    {
        return $this->entityId;
    }
}
