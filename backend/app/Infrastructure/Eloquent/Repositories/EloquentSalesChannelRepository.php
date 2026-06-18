<?php

namespace App\Infrastructure\Eloquent\Repositories;

use App\Domain\Sales\Entities\SalesChannel;
use App\Domain\Sales\Repositories\SalesChannelRepositoryInterface;
use App\Infrastructure\Eloquent\Models\SalesChannelModel;

class EloquentSalesChannelRepository implements SalesChannelRepositoryInterface
{
    public function findById(string $id): ?SalesChannel
    {
        $model = SalesChannelModel::query()->find($id);

        if (! $model) {
            return null;
        }

        return $this->toDomain($model);
    }

    public function findAll(): array
    {
        $models = SalesChannelModel::orderBy('sort_order')->get();

        return $models->map(fn ($m) => $this->toDomain($m))->toArray();
    }

    public function getActive(): array
    {
        $models = SalesChannelModel::query()->where('is_active', true)->orderBy('sort_order')->get();

        return $models->map(fn ($m) => $this->toDomain($m))->toArray();
    }

    public function save(SalesChannel $channel): void
    {
        $model = new SalesChannelModel;
        $this->fillModel($model, $channel);
        $model->save();
    }

    public function update(SalesChannel $channel): void
    {
        $model = SalesChannelModel::query()->findOrFail($channel->getId());
        $this->fillModel($model, $channel);
        $model->save();
    }

    public function delete(string $id): void
    {
        SalesChannelModel::destroy($id);
    }

    private function fillModel(SalesChannelModel $model, SalesChannel $channel): void
    {
        $model->id = $channel->getId();
        $model->name = $channel->getName();
        $model->code = $channel->getCode();
        $model->type = $channel->getType();
        $model->pricing_method = $channel->getPricingMethod();
        $model->markup_percentage = $channel->getMarkupPercentage();
        $model->fixed_markup = $channel->getFixedMarkup();
        $model->apply_before_tax = $channel->isApplyBeforeTax();
        $model->is_active = $channel->isActive();
        $model->sort_order = $channel->getSortOrder();
        $model->logo_url = $channel->getLogoUrl();
    }

    private function toDomain(SalesChannelModel $model): SalesChannel
    {
        return new SalesChannel(
            id: $model->id,
            name: $model->name,
            code: $model->code,
            type: $model->type,
            pricingMethod: $model->pricing_method,
            markupPercentage: $model->markup_percentage,
            fixedMarkup: $model->fixed_markup,
            applyBeforeTax: $model->apply_before_tax,
            isActive: $model->is_active,
            sortOrder: $model->sort_order,
            logoUrl: $model->logo_url
        );
    }
}
