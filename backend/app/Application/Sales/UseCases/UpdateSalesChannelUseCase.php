<?php

namespace App\Application\Sales\UseCases;

use App\Application\Sales\DTOs\SalesChannelDTO;
use App\Domain\Sales\Entities\SalesChannel;
use App\Domain\Sales\Repositories\SalesChannelRepositoryInterface;
use InvalidArgumentException;

class UpdateSalesChannelUseCase
{
    public function __construct(
        private readonly SalesChannelRepositoryInterface $repository
    ) {}

    public function execute(string $id, SalesChannelDTO $dto): SalesChannel
    {
        $existingChannel = $this->repository->findById($id);

        if (!$existingChannel) {
            throw new InvalidArgumentException("Sales channel not found.");
        }

        $channel = new SalesChannel(
            id: $id,
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

        $this->repository->update($channel);

        return $channel;
    }
}
