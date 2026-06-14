<?php

declare(strict_types=1);

namespace App\Domain\Sales\Repositories;

use App\Domain\Sales\Entities\Invoice;

interface InvoiceRepositoryInterface
{
    public function findById(string $id): ?Invoice;

    public function findByInvoiceNumber(string $invoiceNumber): ?Invoice;

    public function create(Invoice $invoice): Invoice;

    public function update(Invoice $invoice): Invoice;

    public function delete(string $id): bool;

    public function getNextInvoiceNumber(): string;

    public function paginate(int $perPage = 15, array $filters = []): array;

    public function getByCustomer(string $customerId, int $perPage = 15): array;

    public function getSalesReport(\DateTimeImmutable $from, \DateTimeImmutable $to): array;
}
