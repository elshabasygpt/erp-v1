<?php

declare(strict_types=1);

namespace App\Domain\Shared;

/**
 * Shared Money value object used across the system.
 * Stores amounts as integers (cents) to avoid floating point issues.
 */
final class Money extends ValueObject
{
    private int $amount; // in cents
    private string $currency;

    public function __construct(int $amount, string $currency = 'SAR')
    {
        if ($amount < 0) {
            throw new \InvalidArgumentException('Money amount cannot be negative.');
        }
        $this->amount = $amount;
        $this->currency = strtoupper($currency);
    }

    public static function fromFloat(float $amount, string $currency = 'SAR'): self
    {
        return new self((int) round($amount * 100), $currency);
    }

    public function value(): int
    {
        return $this->amount;
    }

    public function toFloat(): float
    {
        return $this->amount / 100;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function add(Money $other): self
    {
        $this->ensureSameCurrency($other);
        return new self($this->amount + $other->amount, $this->currency);
    }

    public function subtract(Money $other): self
    {
        $this->ensureSameCurrency($other);
        $result = $this->amount - $other->amount;
        if ($result < 0) {
            throw new \DomainException('Resulting money amount cannot be negative.');
        }
        return new self($result, $this->currency);
    }

    public function multiply(float $factor): self
    {
        return new self((int) round($this->amount * $factor), $this->currency);
    }

    public function isZero(): bool
    {
        return $this->amount === 0;
    }

    private function ensureSameCurrency(Money $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new \InvalidArgumentException('Cannot operate on different currencies.');
        }
    }

    public function __toString(): string
    {
        return number_format($this->toFloat(), 2) . ' ' . $this->currency;
    }
}
