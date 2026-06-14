<?php

declare(strict_types=1);

namespace App\Domain\Accounting\Repositories;

use App\Domain\Accounting\Entities\Account;

interface AccountRepositoryInterface
{
    public function findById(string $id): ?Account;

    public function findByCode(string $code): ?Account;

    public function create(Account $account): Account;

    public function update(Account $account): Account;

    public function delete(string $id): bool;

    public function getAll(): array;

    public function getTree(): array;

    public function getByType(string $type): array;
}
