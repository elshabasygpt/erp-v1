<?php

namespace App\Domain\Treasury\Services;

use App\Domain\Treasury\Repositories\SafeRepositoryInterface;
use InvalidArgumentException;

class TransferService
{
    public function __construct(
        private SafeRepositoryInterface $safeRepo
    ) {}

    public function transfer(int $fromId, int $toId, float $amount): void
    {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Transfer amount must be positive');
        }

        $from = $this->safeRepo->findById($fromId);
        if (! $from || $from->balance < $amount) {
            throw new InvalidArgumentException('Insufficient balance');
        }

        $this->safeRepo->updateBalance($fromId, -$amount);
        $this->safeRepo->updateBalance($toId, $amount);
    }
}
