<?php

declare(strict_types=1);

namespace App\Domain\Shared;

use Ramsey\Uuid\Uuid;

/**
 * Base Entity class for all domain entities.
 * Provides UUID identity and equality comparison.
 */
abstract class Entity
{
    protected string $id;

    public function __construct(?string $id = null)
    {
        $this->id = $id ?? Uuid::uuid4()->toString();
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function equals(Entity $other): bool
    {
        return $this->id === $other->getId();
    }
}
