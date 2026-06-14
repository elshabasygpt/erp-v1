<?php

declare(strict_types=1);

namespace App\Domain\Auth\ValueObjects;

use App\Domain\Shared\ValueObject;

final class Email extends ValueObject
{
    private string $email;

    public function __construct(string $email)
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException("Invalid email address: {$email}");
        }
        $this->email = strtolower(trim($email));
    }

    public function value(): string
    {
        return $this->email;
    }
}
