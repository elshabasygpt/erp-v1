<?php

declare(strict_types=1);

namespace App\Domain\Accounting\Repositories;

use App\Domain\Accounting\Entities\JournalEntry;

interface JournalEntryRepositoryInterface
{
    public function findById(string $id): ?JournalEntry;

    public function create(JournalEntry $entry): JournalEntry;

    public function update(JournalEntry $entry): JournalEntry;

    public function delete(string $id): bool;

    public function getNextEntryNumber(): string;

    public function paginate(int $perPage = 15, array $filters = []): array;

    public function getByAccount(string $accountId, ?\DateTimeImmutable $from = null, ?\DateTimeImmutable $to = null): array;

    public function getGeneralLedger(\DateTimeImmutable $from, \DateTimeImmutable $to): array;

    public function getTrialBalance(\DateTimeImmutable $asOf): array;
}
