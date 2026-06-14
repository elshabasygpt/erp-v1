<?php
namespace App\Application\Treasury\UseCases;

use App\Domain\Treasury\Repositories\SafeRepositoryInterface;
use App\Domain\Treasury\Repositories\SafeTransactionRepositoryInterface;
use App\Domain\Treasury\Entities\SafeTransaction;
use InvalidArgumentException;

class TransferBetweenSafesUseCase
{
    public function __construct(
        private SafeRepositoryInterface $safeRepo,
        private SafeTransactionRepositoryInterface $txRepo,
    ) {}

    public function execute(int $fromId, int $toId, float $amount, string $description = ''): void
    {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Transfer amount must be positive');
        }

        $from = $this->safeRepo->findById($fromId);
        if (!$from) {
            throw new InvalidArgumentException('Source safe not found');
        }

        if ($from->balance < $amount) {
            throw new InvalidArgumentException('Insufficient balance in source safe');
        }

        $to = $this->safeRepo->findById($toId);
        if (!$to) {
            throw new InvalidArgumentException('Destination safe not found');
        }

        $this->safeRepo->updateBalance($fromId, -$amount);
        $this->safeRepo->updateBalance($toId, $amount);

        $this->txRepo->save(SafeTransaction::create([
            'safe_id'         => $fromId,
            'type'            => 'transfer',
            'amount'          => $amount,
            'description'     => $description,
            'related_safe_id' => $toId,
        ]));

        $this->txRepo->save(SafeTransaction::create([
            'safe_id'         => $toId,
            'type'            => 'transfer',
            'amount'          => $amount,
            'description'     => $description,
            'related_safe_id' => $fromId,
        ]));
    }
}
