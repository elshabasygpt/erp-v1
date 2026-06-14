<?php

namespace App\Application\Sales\UseCases;

use App\Application\Sales\DTOs\SalesChannelDTO;
use App\Domain\Sales\Entities\SalesChannel;
use App\Domain\Sales\Repositories\SalesChannelRepositoryInterface;
use Illuminate\Support\Str;

class CreateSalesChannelUseCase
{
    public function __construct(
        private readonly SalesChannelRepositoryInterface $repository
    ) {}

    public function execute(SalesChannelDTO $dto): SalesChannel
    {
        $channel = new SalesChannel(
            id: Str::uuid()->toString(),
            name: $dto->name,
            code: $dto->code,
            type: $dto->type,
            pricingMethod: $dto->pricingMethod,
            markupPercentage: $dto->markupPercentage,
            fixedMarkup: $dto->fixedMarkup,
            applyBeforeTax: $dto->applyBeforeTax,
            isActive: $dto->isActive,
            sortOrder: $dto->sortOrder,
            logoUrl: $dto->logoUrl
        );

        $this->repository->save($channel);

        return $channel;
    }
}
