<?php

declare(strict_types=1);

namespace App\Domain\Accounting\Entities;

use App\Domain\Shared\Entity;

final class JournalEntry extends Entity
{
    private array $lines = [];

    public function __construct(
        ?string $id,
        private string $entryNumber,
        private \DateTimeImmutable $date,
        private string $description,
        private ?string $transactionCurrencyId = null,
        private float $exchangeRate = 1.0,
        private bool $isPosted = false,
        private ?string $referenceType = null, // invoice, purchase, payment
        private ?string $referenceId = null,
        private ?string $createdBy = null,
    ) {
        parent::__construct($id);
    }

    public function getEntryNumber(): string
    {
        return $this->entryNumber;
    }

    public function getDate(): \DateTimeImmutable
    {
        return $this->date;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function getTransactionCurrencyId(): ?string
    {
        return $this->transactionCurrencyId;
    }

    public function getExchangeRate(): float
    {
        return $this->exchangeRate;
    }

    public function isPosted(): bool
    {
        return $this->isPosted;
    }

    public function getReferenceType(): ?string
    {
        return $this->referenceType;
    }

    public function getReferenceId(): ?string
    {
        return $this->referenceId;
    }

    public function getCreatedBy(): ?string
    {
        return $this->createdBy;
    }

    public function getLines(): array
    {
        return $this->lines;
    }

    public function addLine(JournalEntryLine $line): void
    {
        $this->lines[] = $line;
    }

    public function setLines(array $lines): void
    {
        $this->lines = $lines;
    }

    public function post(): void
    {
        if ($this->isPosted) {
            throw new \DomainException('Journal entry is already posted.');
        }

        if (! $this->isBalanced()) {
            throw new \DomainException('Journal entry is not balanced. Total debits must equal total credits.');
        }

        if (empty($this->lines)) {
            throw new \DomainException('Journal entry must have at least one line.');
        }

        $this->isPosted = true;
    }

    public function isBalanced(): bool
    {
        $totalDebit = '0.000000';
        $totalCredit = '0.000000';

        foreach ($this->lines as $line) {
            $debitStr = sprintf('%.6F', $line->getDebit());
            $creditStr = sprintf('%.6F', $line->getCredit());
            
            $totalDebit = bcadd($totalDebit, $debitStr, 6);
            $totalCredit = bcadd($totalCredit, $creditStr, 6);
        }

        // Absolute difference
        $diff = bcsub($totalDebit, $totalCredit, 6);
        if (bccomp($diff, '0.000000', 6) === -1) {
            $diff = bcsub('0.000000', $diff, 6);
        }

        // Tolerance validation strictly up to 0.000001
        return bccomp($diff, '0.000001', 6) <= 0;
    }

    public function getTotalDebit(): float
    {
        $total = '0.000000';
        foreach ($this->lines as $line) {
            $total = bcadd($total, sprintf('%.6F', $line->getDebit()), 6);
        }
        return (float) $total;
    }

    public function getTotalCredit(): float
    {
        $total = '0.000000';
        foreach ($this->lines as $line) {
            $total = bcadd($total, sprintf('%.6F', $line->getCredit()), 6);
        }
        return (float) $total;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'entry_number' => $this->entryNumber,
            'date' => $this->date->format('Y-m-d'),
            'description' => $this->description,
            'transaction_currency_id' => $this->transactionCurrencyId,
            'exchange_rate' => $this->exchangeRate,
            'is_posted' => $this->isPosted,
            'reference_type' => $this->referenceType,
            'reference_id' => $this->referenceId,
            'total_debit' => $this->getTotalDebit(),
            'total_credit' => $this->getTotalCredit(),
            'lines' => array_map(fn (JournalEntryLine $l) => $l->toArray(), $this->lines),
        ];
    }
}
