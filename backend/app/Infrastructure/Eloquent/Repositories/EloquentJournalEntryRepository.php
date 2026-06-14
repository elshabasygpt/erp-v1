<?php

namespace App\Infrastructure\Eloquent\Repositories;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use Illuminate\Support\Facades\DB;

final class EloquentJournalEntryRepository implements JournalEntryRepositoryInterface
{
    public function findById(string $id): ?JournalEntry { $m = JournalEntryModel::with('lines')->find($id); return $m ? $this->toDomain($m) : null; }

    public function create(JournalEntry $entry): JournalEntry
    {
        return DB::connection('tenant')->transaction(function () use ($entry) {
            JournalEntryModel::create(['id'=>$entry->getId(),'entry_number'=>$entry->getEntryNumber(),'date'=>$entry->getDate(),'description'=>$entry->getDescription(),'is_posted'=>$entry->isPosted(),'reference_type'=>$entry->getReferenceType(),'reference_id'=>$entry->getReferenceId(),'created_by'=>$entry->getLines()[0]->getDescription() ?? null]);
            foreach ($entry->getLines() as $line) {
                JournalEntryLineModel::create(['id'=>$line->getId(),'journal_entry_id'=>$entry->getId(),'account_id'=>$line->getAccountId(),'debit'=>$line->getDebit(),'credit'=>$line->getCredit(),'description'=>$line->getDescription()]);
            }
            return $this->findById($entry->getId());
        });
    }

    public function update(JournalEntry $entry): JournalEntry { JournalEntryModel::where('id',$entry->getId())->update(['is_posted'=>$entry->isPosted(),'description'=>$entry->getDescription()]); return $entry; }
    public function delete(string $id): bool { return JournalEntryModel::where('id',$id)->delete() > 0; }
    public function getNextEntryNumber(): string { $last = JournalEntryModel::orderBy('created_at','desc')->first(); $n = $last ? ((int)substr($last->entry_number,3))+1 : 1; return 'JE-'.str_pad((string)$n,6,'0',STR_PAD_LEFT); }

    public function paginate(int $perPage = 15, array $filters = []): array
    {
        $q = JournalEntryModel::with('lines.account');
        if (!empty($filters['from'])) $q->where('date','>=',$filters['from']);
        if (!empty($filters['to'])) $q->where('date','<=',$filters['to']);
        if (isset($filters['is_posted'])) $q->where('is_posted',$filters['is_posted']);
        return $q->orderBy('date','desc')->paginate($perPage)->toArray();
    }

    public function getByAccount(string $accountId, ?\DateTimeImmutable $from = null, ?\DateTimeImmutable $to = null): array
    {
        $q = JournalEntryLineModel::with('journalEntry')->where('account_id',$accountId);
        if ($from) $q->whereHas('journalEntry', fn($jq) => $jq->where('date','>=',$from->format('Y-m-d')));
        if ($to) $q->whereHas('journalEntry', fn($jq) => $jq->where('date','<=',$to->format('Y-m-d')));
        return $q->get()->toArray();
    }

    public function getGeneralLedger(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        return DB::connection('tenant')->table('journal_entry_lines')
            ->join('journal_entries','journal_entry_lines.journal_entry_id','=','journal_entries.id')
            ->where('journal_entries.is_posted', true)
            ->whereBetween('journal_entries.date', [$from->format('Y-m-d'), $to->format('Y-m-d')])
            ->select('journal_entry_lines.account_id','journal_entry_lines.debit','journal_entry_lines.credit','journal_entries.date','journal_entries.description')
            ->orderBy('journal_entries.date')
            ->get()->toArray();
    }

    public function getTrialBalance(\DateTimeImmutable $asOf): array
    {
        return DB::connection('tenant')->table('journal_entry_lines')
            ->join('journal_entries','journal_entry_lines.journal_entry_id','=','journal_entries.id')
            ->join('accounts','journal_entry_lines.account_id','=','accounts.id')
            ->where('journal_entries.is_posted', true)
            ->where('journal_entries.date','<=',$asOf->format('Y-m-d'))
            ->groupBy('accounts.id','accounts.code','accounts.name','accounts.name_ar','accounts.type')
            ->selectRaw('accounts.id, accounts.code, accounts.name, accounts.name_ar, accounts.type, SUM(journal_entry_lines.debit) as total_debit, SUM(journal_entry_lines.credit) as total_credit')
            ->orderBy('accounts.code')
            ->get()->toArray();
    }

    private function toDomain(JournalEntryModel $m): JournalEntry
    {
        $entry = new JournalEntry($m->id, $m->entry_number, new \DateTimeImmutable($m->date), $m->description, $m->is_posted, $m->reference_type, $m->reference_id, $m->created_by);
        foreach ($m->lines as $l) {
            $entry->addLine(new JournalEntryLine($l->id, $l->journal_entry_id, $l->account_id, (float)$l->debit, (float)$l->credit, $l->description));
        }
        return $entry;
    }
}
