<?php
namespace App\Domain\Treasury\Repositories;

use App\Domain\Treasury\Entities\Safe;

interface SafeRepositoryInterface
{
    public function findById(int $id): ?Safe;
    public function findAll(int $tenantId): array;
    public function save(Safe $safe): Safe;
    public function updateBalance(int $id, float $delta): void;
}
