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
        private bool $isPosted = false,
        private ?string $referenceType = null, // invoice, purchase, payment
        private ?string $referenceId = null,
        private ?string $createdBy = null,
    ) {
        parent::__construct($id);
    }

    public function getEntryNumber(): string { return $this->entryNumber; }
    public function getDate(): \DateTimeImmutable { return $this->date; }
    public function getDescription(): string { return $this->description; }
    public function isPosted(): bool { return $this->isPosted; }
    public function getReferenceType(): ?string { return $this->referenceType; }
    public function getReferenceId(): ?string { return $this->referenceId; }
    public function getLines(): array { return $this->lines; }

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

        if (!$this->isBalanced()) {
            throw new \DomainException('Journal entry is not balanced. Total debits must equal total credits.');
        }

        if (empty($this->lines)) {
            throw new \DomainException('Journal entry must have at least one line.');
        }

        $this->isPosted = true;
    }

    public function isBalanced(): bool
    {
        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($this->lines as $line) {
            $totalDebit += $line->getDebit();
            $totalCredit += $line->getCredit();
        }

        return abs($totalDebit - $totalCredit) < 0.01; // tolerance for float
    }

    public function getTotalDebit(): float
    {
        return array_sum(array_map(fn(JournalEntryLine $l) => $l->getDebit(), $this->lines));
    }

    public function getTotalCredit(): float
    {
        return array_sum(array_map(fn(JournalEntryLine $l) => $l->getCredit(), $this->lines));
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'entry_number' => $this->entryNumber,
            'date' => $this->date->format('Y-m-d'),
            'description' => $this->description,
            'is_posted' => $this->isPosted,
            'reference_type' => $this->referenceType,
            'reference_id' => $this->referenceId,
            'total_debit' => $this->getTotalDebit(),
            'total_credit' => $this->getTotalCredit(),
            'lines' => array_map(fn(JournalEntryLine $l) => $l->toArray(), $this->lines),
        ];
    }
}
