<?php

declare(strict_types=1);

namespace Tests\Unit\Domain\Accounting;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use PHPUnit\Framework\TestCase;

class JournalEntryToleranceTest extends TestCase
{
    private function createJournalEntry(): JournalEntry
    {
        return new JournalEntry(
            id: null,
            entryNumber: 'JE-001',
            date: new \DateTimeImmutable(),
            description: 'Test Entry'
        );
    }

    private function createLine(float $debit, float $credit): JournalEntryLine
    {
        return new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: 'acc-1',
            debit: $debit,
            credit: $credit,
            transactionDebit: $debit,
            transactionCredit: $credit,
            description: ''
        );
    }

    public function test_perfectly_balanced_entry()
    {
        $je = $this->createJournalEntry();
        $je->addLine($this->createLine(100.123456, 0.0));
        $je->addLine($this->createLine(0.0, 100.123456));

        $this->assertTrue($je->isBalanced());
    }

    public function test_balanced_within_tolerance_of_0_000001()
    {
        $je = $this->createJournalEntry();
        $je->addLine($this->createLine(100.123456, 0.0));
        // Credit is exactly 0.000001 less than debit
        $je->addLine($this->createLine(0.0, 100.123455));

        $this->assertTrue($je->isBalanced());
    }

    public function test_unbalanced_just_outside_tolerance_0_000002()
    {
        $je = $this->createJournalEntry();
        $je->addLine($this->createLine(100.123456, 0.0));
        // Credit is 0.000002 less than debit (outside tolerance)
        $je->addLine($this->createLine(0.0, 100.123454));

        $this->assertFalse($je->isBalanced());
    }

    public function test_floating_point_drift_edge_case()
    {
        $je = $this->createJournalEntry();
        // Add multiple lines that would cause standard float sum to drift
        for ($i = 0; $i < 1000; $i++) {
            $je->addLine($this->createLine(0.100000, 0.0));
        }
        
        // 1000 * 0.1 = 100.000000 exactly using BCMath
        $je->addLine($this->createLine(0.0, 100.000000));

        $this->assertTrue($je->isBalanced());
        $this->assertSame(100.0, $je->getTotalDebit());
        $this->assertSame(100.0, $je->getTotalCredit());
    }

    public function test_floating_point_drift_edge_case_with_imbalance()
    {
        $je = $this->createJournalEntry();
        for ($i = 0; $i < 1000; $i++) {
            $je->addLine($this->createLine(0.100000, 0.0));
        }
        
        // 1000 * 0.1 = 100.000000
        // We supply 99.999998 (Difference of 0.000002, outside tolerance)
        $je->addLine($this->createLine(0.0, 99.999998));

        $this->assertFalse($je->isBalanced());
    }
}
