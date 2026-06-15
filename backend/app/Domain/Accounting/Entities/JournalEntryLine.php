<?php

declare(strict_types=1);

namespace App\Domain\Accounting\Entities;

use App\Domain\Shared\Entity;

final class JournalEntryLine extends Entity
{
    public function __construct(
        ?string $id,
        private string $journalEntryId,
        private string $accountId,
        private float $debit,
        private float $credit,
        private float $transactionDebit = 0.0,
        private float $transactionCredit = 0.0,
        private ?string $description = null,
        private ?string $costCenterId = null,
        private ?string $projectId = null,
    ) {
        parent::__construct($id);
        $this->validate();
    }

    public function getJournalEntryId(): string { return $this->journalEntryId; }
    public function getAccountId(): string { return $this->accountId; }
    public function getDebit(): float { return $this->debit; }
    public function getCredit(): float { return $this->credit; }
    public function getTransactionDebit(): float { return $this->transactionDebit; }
    public function getTransactionCredit(): float { return $this->transactionCredit; }
    public function getDescription(): ?string { return $this->description; }
    public function getCostCenterId(): ?string { return $this->costCenterId; }
    public function getProjectId(): ?string { return $this->projectId; }

    private function validate(): void
    {
        if ($this->debit < 0 || $this->credit < 0) {
            throw new \DomainException('Debit and credit amounts cannot be negative.');
        }

        if ($this->debit > 0 && $this->credit > 0) {
            throw new \DomainException('A journal line cannot have both debit and credit amounts.');
        }

        if ($this->debit === 0.0 && $this->credit === 0.0) {
            throw new \DomainException('A journal line must have either a debit or credit amount.');
        }
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'journal_entry_id' => $this->journalEntryId,
            'account_id' => $this->accountId,
            'debit' => $this->debit,
            'credit' => $this->credit,
            'transaction_debit' => $this->transactionDebit,
            'transaction_credit' => $this->transactionCredit,
            'description' => $this->description,
            'cost_center_id' => $this->costCenterId,
            'project_id' => $this->projectId,
        ];
    }
}
