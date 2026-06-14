<?php

declare(strict_types=1);

namespace App\Application\Auth\DTOs;

final class RegisterDTO
{
    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly string $password,
        public readonly ?string $phone = null,
        public readonly string $locale = 'en',
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            name: $data['name'],
            email: $data['email'],
            password: $data['password'],
            phone: $data['phone'] ?? null,
            locale: $data['locale'] ?? 'en',
        );
    }
}
