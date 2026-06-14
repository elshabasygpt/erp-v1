<?php
namespace App\Infrastructure\Eloquent\Repositories\Treasury;

use App\Domain\Treasury\Entities\SafeTransaction;
use App\Domain\Treasury\Repositories\SafeTransactionRepositoryInterface;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;

class EloquentSafeTransactionRepository implements SafeTransactionRepositoryInterface
{
    public function save(SafeTransaction $transaction): SafeTransaction
    {
        $model = new SafeTransactionModel();
        $model->fill([
            'safe_id'          => $transaction->safeId,
            'type'             => $transaction->type,
            'amount'           => $transaction->amount,
            'description'      => $transaction->description,
            'related_safe_id'  => $transaction->relatedSafeId,
            'reference_type'   => $transaction->referenceType,
            'reference_id'     => $transaction->referenceId,
        ])->save();

        return $this->toEntity($model);
    }

    public function findBySafe(int $safeId, array $filters = []): array
    {
        return SafeTransactionModel::where('safe_id', $safeId)
            ->latest()
            ->get()
            ->map(fn(SafeTransactionModel $m) => $this->toEntity($m))
            ->toArray();
    }

    private function toEntity(SafeTransactionModel $model): SafeTransaction
    {
        return new SafeTransaction(
            id: $model->id,
            safeId: $model->safe_id,
            type: $model->type,
            amount: (float) $model->amount,
            description: $model->description,
            relatedSafeId: $model->related_safe_id,
            referenceType: $model->reference_type,
            referenceId: $model->reference_id,
        );
    }
}
