<?php

declare(strict_types=1);

namespace App\Application\Accounting\UseCases;

use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;

final class GenerateTrialBalanceUseCase
{
    public function __construct(
        private JournalEntryRepositoryInterface $journalEntryRepository,
    ) {}

    /**
     * Generate trial balance as of a given date.
     * Returns array of accounts with their debit/credit balances.
     */
    public function execute(\DateTimeImmutable $asOf): array
    {
        return $this->journalEntryRepository->getTrialBalance($asOf);
    }
}
