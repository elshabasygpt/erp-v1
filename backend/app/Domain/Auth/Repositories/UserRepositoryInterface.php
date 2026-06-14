<?php

declare(strict_types=1);

namespace App\Domain\Auth\Repositories;

use App\Domain\Auth\Entities\User;

interface UserRepositoryInterface
{
    public function findById(string $id): ?User;

    public function findByEmail(string $email): ?User;

    public function create(User $user): User;

    public function update(User $user): User;

    public function delete(string $id): bool;

    public function paginate(int $perPage = 15, array $filters = []): array;
}
