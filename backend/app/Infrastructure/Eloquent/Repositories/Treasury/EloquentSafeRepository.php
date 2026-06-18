<?php

namespace App\Infrastructure\Eloquent\Repositories\Treasury;

use App\Domain\Treasury\Entities\Safe;
use App\Domain\Treasury\Repositories\SafeRepositoryInterface;
use App\Infrastructure\Eloquent\Models\SafeModel;

class EloquentSafeRepository implements SafeRepositoryInterface
{
    public function findById(int $id): ?Safe
    {
        $model = SafeModel::query()->find($id);

        return $model ? $this->toEntity($model) : null;
    }

    public function findAll(int $tenantId): array
    {
        return SafeModel::query()->where('tenant_id', $tenantId)
            ->get()
            ->map(fn (SafeModel $m) => $this->toEntity($m))
            ->toArray();
    }

    public function save(Safe $safe): Safe
    {
        $model = $safe->id
            ? SafeModel::query()->findOrFail($safe->id)
            : new SafeModel;

        $model->fill([
            'tenant_id' => $safe->tenantId,
            'name' => $safe->name,
            'balance' => $safe->balance,
            'currency' => $safe->currency,
            'is_default' => $safe->isDefault,
        ])->save();

        return $this->toEntity($model);
    }

    public function updateBalance(int $id, float $delta): void
    {
        SafeModel::query()->lockForUpdate()->findOrFail($id)->increment('balance', $delta);
    }

    private function toEntity(SafeModel $model): Safe
    {
        return new Safe(
            id: $model->id,
            tenantId: $model->tenant_id,
            name: $model->name,
            balance: (float) $model->balance,
            currency: $model->currency,
            isDefault: (bool) $model->is_default,
        );
    }
}
