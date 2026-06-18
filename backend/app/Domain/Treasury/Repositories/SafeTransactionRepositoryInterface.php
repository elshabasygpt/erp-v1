<?php

namespace App\Domain\Treasury\Repositories;

use App\Domain\Treasury\Entities\SafeTransaction;

interface SafeTransactionRepositoryInterface
{
    public function save(SafeTransaction $transaction): SafeTransaction;

    public function findBySafe(int $safeId, array $filters = []): array;
}
