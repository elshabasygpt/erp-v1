<?php

declare(strict_types=1);

namespace App\Infrastructure\Providers;

use Illuminate\Support\ServiceProvider;
use App\Domain\Auth\Repositories\UserRepositoryInterface;
use App\Domain\Sales\Repositories\InvoiceRepositoryInterface;
use App\Domain\Inventory\Repositories\ProductRepositoryInterface;
use App\Domain\Purchases\Repositories\PurchaseRepositoryInterface;
use App\Domain\Accounting\Repositories\AccountRepositoryInterface;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\CRM\Repositories\CustomerRepositoryInterface;
use App\Domain\CRM\Repositories\SupplierRepositoryInterface;
use App\Domain\Subscription\Repositories\PlanRepositoryInterface;
use App\Infrastructure\Eloquent\Repositories\EloquentUserRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentInvoiceRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentProductRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentPurchaseRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentAccountRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentJournalEntryRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentCustomerRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentSupplierRepository;
use App\Domain\Sales\Repositories\SalesChannelRepositoryInterface;
use App\Infrastructure\Eloquent\Repositories\EloquentSalesChannelRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentPlanRepository;

class RepositoryServiceProvider extends ServiceProvider
{
    /**
     * All repository bindings.
     * Domain interfaces → Infrastructure implementations.
     */
    public array $bindings = [
        UserRepositoryInterface::class => EloquentUserRepository::class,
        InvoiceRepositoryInterface::class => EloquentInvoiceRepository::class,
        ProductRepositoryInterface::class => EloquentProductRepository::class,
        PurchaseRepositoryInterface::class => EloquentPurchaseRepository::class,
        AccountRepositoryInterface::class => EloquentAccountRepository::class,
        JournalEntryRepositoryInterface::class => EloquentJournalEntryRepository::class,
        CustomerRepositoryInterface::class => EloquentCustomerRepository::class,
        SupplierRepositoryInterface::class => EloquentSupplierRepository::class,
        PlanRepositoryInterface::class => EloquentPlanRepository::class,
        SalesChannelRepositoryInterface::class => EloquentSalesChannelRepository::class,
    ];

    public function register(): void
    {
        foreach ($this->bindings as $abstract => $concrete) {
            $this->app->bind($abstract, $concrete);
        }

        // HR
        $this->app->bind(
            \App\Domain\HR\Repositories\EmployeeRepositoryInterface::class,
            \App\Infrastructure\Eloquent\Repositories\HR\EloquentEmployeeRepository::class
        );
        $this->app->bind(
            \App\Domain\HR\Repositories\AttendanceRepositoryInterface::class,
            \App\Infrastructure\Eloquent\Repositories\HR\EloquentAttendanceRepository::class
        );
        $this->app->bind(
            \App\Domain\HR\Repositories\PayrollRepositoryInterface::class,
            \App\Infrastructure\Eloquent\Repositories\HR\EloquentPayrollRepository::class
        );

        // Treasury
        $this->app->bind(
            \App\Domain\Treasury\Repositories\SafeRepositoryInterface::class,
            \App\Infrastructure\Eloquent\Repositories\Treasury\EloquentSafeRepository::class
        );
        $this->app->bind(
            \App\Domain\Treasury\Repositories\SafeTransactionRepositoryInterface::class,
            \App\Infrastructure\Eloquent\Repositories\Treasury\EloquentSafeTransactionRepository::class
        );

        // Approvals
        $this->app->bind(
            \App\Domain\Approvals\Repositories\ApprovalRepositoryInterface::class,
            \App\Infrastructure\Eloquent\Repositories\Approvals\EloquentApprovalRepository::class
        );
    }
}
