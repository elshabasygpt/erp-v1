<?php

namespace App\Infrastructure\Eloquent\Repositories;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use Illuminate\Support\Facades\DB;

final class EloquentJournalEntryRepository implements JournalEntryRepositoryInterface
{
    public function findById(string $id): ?JournalEntry
    {
        $m = JournalEntryModel::query()->with('lines')->find($id);

        return $m ? $this->toDomain($m) : null;
    }

    public function create(JournalEntry $entry): JournalEntry
    {
        // Hard invariant: every persisted journal entry must balance (SUM debit == SUM credit).
        // Several use-cases construct entries with isPosted=true and never call JournalEntry::post(),
        // which would otherwise be the balance gate. Enforce it centrally here so no path can
        // silently write an unbalanced (corrupt) entry to the general ledger.
        if (! $entry->isBalanced()) {
            throw new \DomainException(sprintf(
                'Refusing to persist unbalanced journal entry %s: debit %.6F != credit %.6F.',
                $entry->getEntryNumber(),
                $entry->getTotalDebit(),
                $entry->getTotalCredit()
            ));
        }

        $closure = function () use ($entry) {
            $tenantId = null;
            if (app()->has('current_tenant')) {
                $tenantId = app('current_tenant')->id;
            } elseif (auth()->check()) {
                $tenantId = auth()->user()->tenant_id;
            } elseif (request()->header('X-Tenant-ID')) {
                $tenantId = request()->header('X-Tenant-ID');
            }

            JournalEntryModel::query()->create([
                'id' => $entry->getId(),
                'tenant_id' => $tenantId,
                'entry_number' => $entry->getEntryNumber(),
                'date' => $entry->getDate(),
                'description' => $entry->getDescription(),
                'transaction_currency_id' => $entry->getTransactionCurrencyId(),
                'exchange_rate' => $entry->getExchangeRate(),
                'is_posted' => $entry->isPosted(),
                'reference_type' => $entry->getReferenceType(),
                'reference_id' => $entry->getReferenceId(),
                'created_by' => $entry->getCreatedBy(),
            ]);
            foreach ($entry->getLines() as $line) {
                JournalEntryLineModel::query()->create([
                    'id' => $line->getId(),
                    'tenant_id' => $tenantId,
                    'journal_entry_id' => $entry->getId(),
                    'account_id' => $line->getAccountId(),
                    'debit' => $line->getDebit(),
                    'credit' => $line->getCredit(),
                    'transaction_debit' => $line->getTransactionDebit(),
                    'transaction_credit' => $line->getTransactionCredit(),
                    'description' => $line->getDescription(),
                    'cost_center_id' => $line->getCostCenterId(),
                    'project_id' => $line->getProjectId(),
                ]);
            }

            return $this->findById($entry->getId());
        };

        if (app()->environment() === 'testing') {
            return $closure();
        }

        return DB::connection('tenant')->transaction($closure);
    }

    public function update(JournalEntry $entry): JournalEntry
    {
        JournalEntryModel::query()->where('id', $entry->getId())->update(['is_posted' => $entry->isPosted(), 'description' => $entry->getDescription()]);

        return $entry;
    }

    public function delete(string $id): bool
    {
        return JournalEntryModel::query()->where('id', $id)->delete() > 0;
    }

    public function getNextEntryNumber(): string
    {
        $last = JournalEntryModel::orderBy('entry_number', 'desc')->first();
        $n = $last ? ((int) substr($last->entry_number, 3)) + 1 : 1;

        return 'JE-'.str_pad((string) $n, 6, '0', STR_PAD_LEFT);
    }

    public function paginate(int $perPage = 15, array $filters = []): array
    {
        $q = JournalEntryModel::query()->with('lines.account');
        if (! empty($filters['from'])) {
            $q->where('date', '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $q->where('date', '<=', $filters['to']);
        }
        if (isset($filters['is_posted'])) {
            $q->where('is_posted', $filters['is_posted']);
        }

        return $q->orderBy('date', 'desc')->paginate($perPage)->toArray();
    }

    public function getByAccount(string $accountId, ?\DateTimeImmutable $from = null, ?\DateTimeImmutable $to = null): array
    {
        $q = JournalEntryLineModel::query()->with('journalEntry')->where('account_id', $accountId);
        if ($from) {
            $q->whereHas('journalEntry', fn ($jq) => $jq->where('date', '>=', $from->format('Y-m-d')));
        }
        if ($to) {
            $q->whereHas('journalEntry', fn ($jq) => $jq->where('date', '<=', $to->format('Y-m-d')));
        }

        return $q->get()->toArray();
    }

    public function getGeneralLedger(\DateTimeImmutable $from, \DateTimeImmutable $to, ?string $costCenterId = null, ?string $accountId = null): array
    {
        $tenantId = app('current_tenant')->id ?? 'tenant_context';
        $q = DB::connection('tenant')->table('journal_entry_lines')->where('journal_entry_lines.tenant_id', $tenantId)
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.is_posted', true)
            ->whereBetween('journal_entries.date', [$from->format('Y-m-d'), $to->format('Y-m-d')])
            ->select('journal_entry_lines.account_id', 'journal_entry_lines.debit', 'journal_entry_lines.credit', 'journal_entries.date', 'journal_entries.description', 'journal_entry_lines.cost_center_id')
            ->orderBy('journal_entries.date');

        if ($costCenterId) {
            $q->where('journal_entry_lines.cost_center_id', $costCenterId);
        }

        if ($accountId) {
            $q->where('journal_entry_lines.account_id', $accountId);
        }

        return $q->get()->toArray();
    }

    public function getTrialBalance(\DateTimeImmutable $asOf, ?string $costCenterId = null): array
    {
        $tenantId = app('current_tenant')->id ?? 'tenant_context';
        $q = DB::connection('tenant')->table('journal_entry_lines')->where('journal_entry_lines.tenant_id', $tenantId)
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
            ->where('journal_entries.is_posted', true)
            ->where('journal_entries.date', '<=', $asOf->format('Y-m-d'))
            ->groupBy('accounts.id', 'accounts.code', 'accounts.name', 'accounts.name_ar', 'accounts.type')
            ->selectRaw('accounts.id, accounts.code, accounts.name, accounts.name_ar, accounts.type, SUM(journal_entry_lines.debit) as total_debit, SUM(journal_entry_lines.credit) as total_credit')
            ->orderBy('accounts.code');

        if ($costCenterId) {
            $q->where('journal_entry_lines.cost_center_id', $costCenterId);
        }

        return $q->get()->map(function ($r) {
            $r->total_debit = (float) $r->total_debit;
            $r->total_credit = (float) $r->total_credit;

            return (array) $r;
        })->toArray();
    }

    private function toDomain(JournalEntryModel $m): JournalEntry
    {
        $entry = new JournalEntry(
            $m->id,
            $m->entry_number,
            new \DateTimeImmutable($m->date),
            $m->description,
            $m->transaction_currency_id,
            (float) $m->exchange_rate,
            $m->is_posted,
            $m->reference_type,
            $m->reference_id,
            $m->created_by
        );
        foreach ($m->lines as $l) {
            $line = new JournalEntryLine(
                $l->id,
                $l->journal_entry_id,
                $l->account_id,
                (float) $l->debit,
                (float) $l->credit,
                (float) $l->transaction_debit,
                (float) $l->transaction_credit,
                $l->description
            );
            $entry->addLine($line);
        }

        return $entry;
    }
}
