<?php

namespace App\Application\Sales\UseCases;

use App\Domain\Sales\Repositories\SalesChannelRepositoryInterface;

class DeleteSalesChannelUseCase
{
    public function __construct(
        private readonly SalesChannelRepositoryInterface $repository
    ) {}

    public function execute(string $id): void
    {
        $this->repository->delete($id);
    }
}
