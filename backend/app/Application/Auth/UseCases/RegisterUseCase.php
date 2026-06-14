<?php

declare(strict_types=1);

namespace App\Application\Auth\UseCases;

use App\Application\Auth\DTOs\RegisterDTO;
use App\Domain\Auth\Entities\User;
use App\Domain\Auth\Repositories\UserRepositoryInterface;
use Illuminate\Support\Facades\Hash;

final class RegisterUseCase
{
    public function __construct(
        private UserRepositoryInterface $userRepository,
    ) {}

    public function execute(RegisterDTO $dto): User
    {
        // Check if user already exists
        $existing = $this->userRepository->findByEmail($dto->email);
        if ($existing) {
            throw new \DomainException('A user with this email already exists.');
        }

        $user = new User(
            id: null,
            name: $dto->name,
            email: $dto->email,
            password: Hash::make($dto->password),
            phone: $dto->phone,
            locale: $dto->locale,
        );

        return $this->userRepository->create($user);
    }
}
