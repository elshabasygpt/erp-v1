<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Infrastructure\Eloquent\Repositories\EloquentJournalEntryRepository;
use PHPUnit\Framework\TestCase;

/**
 * Locks the P0-1 invariant: the journal-entry repository must refuse to persist any
 * unbalanced entry (SUM debit != SUM credit), even when the use-case constructed the
 * entry with isPosted=true and never called JournalEntry::post(). The guard runs before
 * any DB write, so this test needs no database.
 */
class JournalEntryBalanceGuardTest extends TestCase
{
    private function line(string $accountId, float $debit, float $credit): JournalEntryLine
    {
        return new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $accountId,
            debit: $debit,
            credit: $credit,
        );
    }

    private function entry(): JournalEntry
    {
        return new JournalEntry(
            id: null,
            entryNumber: 'JE-TEST',
            date: new \DateTimeImmutable('2026-01-01'),
            description: 'Guard test',
            transactionCurrencyId: null,
            exchangeRate: 1.0,
            isPosted: true,
        );
    }

    public function test_it_rejects_an_unbalanced_entry_before_persistence(): void
    {
        $entry = $this->entry();
        $entry->addLine($this->line('acc-debit', 100.0, 0.0));
        $entry->addLine($this->line('acc-credit', 0.0, 90.0)); // 10.00 short

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessageMatches('/unbalanced journal entry/i');

        (new EloquentJournalEntryRepository())->create($entry);
    }

    public function test_balanced_entry_passes_the_guard(): void
    {
        $entry = $this->entry();
        $entry->addLine($this->line('acc-debit', 100.0, 0.0));
        $entry->addLine($this->line('acc-credit', 0.0, 100.0));

        // The guard must not be what stops a balanced entry; isBalanced() is true here.
        $this->assertTrue($entry->isBalanced());
    }
}
