<?php

declare(strict_types=1);

namespace App\Infrastructure\Providers;

use App\Domain\Accounting\Repositories\AccountRepositoryInterface;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Approvals\Repositories\ApprovalRepositoryInterface;
use App\Domain\Auth\Repositories\UserRepositoryInterface;
use App\Domain\CRM\Repositories\CustomerRepositoryInterface;
use App\Domain\CRM\Repositories\SupplierRepositoryInterface;
use App\Domain\HR\Repositories\AttendanceRepositoryInterface;
use App\Domain\HR\Repositories\EmployeeRepositoryInterface;
use App\Domain\HR\Repositories\PayrollRepositoryInterface;
use App\Domain\Inventory\Repositories\ProductRepositoryInterface;
use App\Domain\Purchases\Repositories\PurchaseRepositoryInterface;
use App\Domain\Sales\Repositories\InvoiceRepositoryInterface;
use App\Domain\Sales\Repositories\SalesChannelRepositoryInterface;
use App\Domain\Subscription\Repositories\PlanRepositoryInterface;
use App\Domain\Treasury\Repositories\SafeRepositoryInterface;
use App\Domain\Treasury\Repositories\SafeTransactionRepositoryInterface;
use App\Infrastructure\Eloquent\Repositories\Approvals\EloquentApprovalRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentAccountRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentCustomerRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentInvoiceRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentJournalEntryRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentPlanRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentProductRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentPurchaseRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentSalesChannelRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentSupplierRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentUserRepository;
use App\Infrastructure\Eloquent\Repositories\HR\EloquentAttendanceRepository;
use App\Infrastructure\Eloquent\Repositories\HR\EloquentEmployeeRepository;
use App\Infrastructure\Eloquent\Repositories\HR\EloquentPayrollRepository;
use App\Infrastructure\Eloquent\Repositories\Treasury\EloquentSafeRepository;
use App\Infrastructure\Eloquent\Repositories\Treasury\EloquentSafeTransactionRepository;
use Illuminate\Support\ServiceProvider;

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
            EmployeeRepositoryInterface::class,
            EloquentEmployeeRepository::class
        );
        $this->app->bind(
            AttendanceRepositoryInterface::class,
            EloquentAttendanceRepository::class
        );
        $this->app->bind(
            PayrollRepositoryInterface::class,
            EloquentPayrollRepository::class
        );

        // Treasury
        $this->app->bind(
            SafeRepositoryInterface::class,
            EloquentSafeRepository::class
        );
        $this->app->bind(
            SafeTransactionRepositoryInterface::class,
            EloquentSafeTransactionRepository::class
        );

        // Approvals
        $this->app->bind(
            ApprovalRepositoryInterface::class,
            EloquentApprovalRepository::class
        );
    }
}
