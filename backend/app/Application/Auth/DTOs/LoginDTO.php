<?php

declare(strict_types=1);

namespace App\Application\Auth\DTOs;

final class LoginDTO
{
    public function __construct(
        public readonly string $email,
        public readonly string $password,
        public readonly ?string $tenantId = null,
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            email: $data['email'],
            password: $data['password'],
            tenantId: $data['tenant_id'] ?? null,
        );
    }
}
