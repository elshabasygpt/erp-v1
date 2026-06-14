<?php

namespace App\Application\Sales\UseCases;

use App\Domain\Sales\Repositories\SalesChannelRepositoryInterface;

class ListSalesChannelsUseCase
{
    public function __construct(
        private readonly SalesChannelRepositoryInterface $repository
    ) {}

    public function execute(bool $activeOnly = false): array
    {
        if ($activeOnly) {
            return $this->repository->getActive();
        }

        return $this->repository->findAll();
    }
}
