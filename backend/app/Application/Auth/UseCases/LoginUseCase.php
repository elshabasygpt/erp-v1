<?php

declare(strict_types=1);

namespace App\Application\Auth\UseCases;

use App\Application\Auth\DTOs\LoginDTO;
use App\Domain\Auth\Repositories\UserRepositoryInterface;

final class LoginUseCase
{
    public function __construct(
        private UserRepositoryInterface $userRepository,
    ) {}

    public function execute(LoginDTO $dto): array
    {
        $user = $this->userRepository->findByEmail($dto->email);

        if (!$user) {
            throw new \DomainException('Invalid credentials.');
        }

        if (!$user->isActive()) {
            throw new \DomainException('Account is deactivated.');
        }

        // Password verification is handled in the infrastructure layer
        // This use case returns the user for the controller to generate the token

        return [
            'user' => $user->toArray(),
        ];
    }
}
