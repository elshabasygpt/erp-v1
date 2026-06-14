<?php

declare(strict_types=1);

namespace App\Domain\Shared;

/**
 * Base Value Object class.
 * Value Objects are immutable and compared by value.
 */
abstract class ValueObject
{
    abstract public function value(): mixed;

    public function equals(ValueObject $other): bool
    {
        return $this->value() === $other->value();
    }

    public function __toString(): string
    {
        return (string) $this->value();
    }
}
