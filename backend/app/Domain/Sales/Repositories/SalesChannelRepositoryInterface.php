<?php

namespace App\Domain\Sales\Repositories;

use App\Domain\Sales\Entities\SalesChannel;

interface SalesChannelRepositoryInterface
{
    public function findById(string $id): ?SalesChannel;
    public function findAll(): array;
    public function getActive(): array;
    public function save(SalesChannel $channel): void;
    public function update(SalesChannel $channel): void;
    public function delete(string $id): void;
}
