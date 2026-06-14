<?php

declare(strict_types=1);

namespace App\Domain\Purchases\Repositories;

use App\Domain\Purchases\Entities\PurchaseInvoice;

interface PurchaseRepositoryInterface
{
    public function findById(string $id): ?PurchaseInvoice;

    public function create(PurchaseInvoice $invoice): PurchaseInvoice;

    public function update(PurchaseInvoice $invoice): PurchaseInvoice;

    public function delete(string $id): bool;

    public function getNextInvoiceNumber(): string;

    public function paginate(int $perPage = 15, array $filters = []): array;

    public function getBySupplier(string $supplierId, int $perPage = 15): array;
}
