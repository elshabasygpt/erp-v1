<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

// Sales
use App\Domain\Sales\Repositories\InvoiceRepositoryInterface;
use App\Domain\Sales\Repositories\SalesChannelRepositoryInterface;
use App\Infrastructure\Eloquent\Repositories\EloquentInvoiceRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentSalesChannelRepository;

// Inventory
use App\Domain\Inventory\Repositories\ProductRepositoryInterface;
use App\Infrastructure\Eloquent\Repositories\EloquentProductRepository;

// CRM
use App\Domain\CRM\Repositories\CustomerRepositoryInterface;
use App\Domain\CRM\Repositories\SupplierRepositoryInterface;
use App\Infrastructure\Eloquent\Repositories\EloquentCustomerRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentSupplierRepository;

// Purchases
use App\Domain\Purchases\Repositories\PurchaseRepositoryInterface;
use App\Infrastructure\Eloquent\Repositories\EloquentPurchaseRepository;

// Accounting
use App\Domain\Accounting\Repositories\AccountRepositoryInterface;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Infrastructure\Eloquent\Repositories\EloquentAccountRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentJournalEntryRepository;

// HR
use App\Domain\HR\Repositories\EmployeeRepositoryInterface;
use App\Domain\HR\Repositories\AttendanceRepositoryInterface;
use App\Domain\HR\Repositories\PayrollRepositoryInterface;
use App\Infrastructure\Eloquent\Repositories\HR\EloquentEmployeeRepository;
use App\Infrastructure\Eloquent\Repositories\HR\EloquentAttendanceRepository;
use App\Infrastructure\Eloquent\Repositories\HR\EloquentPayrollRepository;

// Treasury
use App\Domain\Treasury\Repositories\SafeRepositoryInterface;
use App\Domain\Treasury\Repositories\SafeTransactionRepositoryInterface;
use App\Infrastructure\Eloquent\Repositories\Treasury\EloquentSafeRepository;
use App\Infrastructure\Eloquent\Repositories\Treasury\EloquentSafeTransactionRepository;

// Approvals
use App\Domain\Approvals\Repositories\ApprovalRepositoryInterface;
use App\Infrastructure\Eloquent\Repositories\Approvals\EloquentApprovalRepository;

// Auth
use App\Domain\Auth\Repositories\UserRepositoryInterface;
use App\Infrastructure\Eloquent\Repositories\EloquentUserRepository;

// Partnerships
// use App\Domain\Partnerships\Repositories\PartnerRepositoryInterface;
// use App\Infrastructure\Eloquent\Repositories\EloquentPartnerRepository;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Sales
        $this->app->bind(InvoiceRepositoryInterface::class, EloquentInvoiceRepository::class);
        $this->app->bind(SalesChannelRepositoryInterface::class, EloquentSalesChannelRepository::class);

        // Inventory
        $this->app->bind(ProductRepositoryInterface::class, EloquentProductRepository::class);

        // CRM
        $this->app->bind(CustomerRepositoryInterface::class, EloquentCustomerRepository::class);
        $this->app->bind(SupplierRepositoryInterface::class, EloquentSupplierRepository::class);

        // Purchases
        $this->app->bind(PurchaseRepositoryInterface::class, EloquentPurchaseRepository::class);

        // Accounting
        $this->app->bind(AccountRepositoryInterface::class, EloquentAccountRepository::class);
        $this->app->bind(JournalEntryRepositoryInterface::class, EloquentJournalEntryRepository::class);

        // HR
        $this->app->bind(EmployeeRepositoryInterface::class, EloquentEmployeeRepository::class);
        $this->app->bind(AttendanceRepositoryInterface::class, EloquentAttendanceRepository::class);
        $this->app->bind(PayrollRepositoryInterface::class, EloquentPayrollRepository::class);

        // Treasury
        $this->app->bind(SafeRepositoryInterface::class, EloquentSafeRepository::class);
        $this->app->bind(SafeTransactionRepositoryInterface::class, EloquentSafeTransactionRepository::class);

        // Approvals
        $this->app->bind(ApprovalRepositoryInterface::class, EloquentApprovalRepository::class);

        // Auth
        $this->app->bind(UserRepositoryInterface::class, EloquentUserRepository::class);

        // Partnerships
        // $this->app->bind(PartnerRepositoryInterface::class, EloquentPartnerRepository::class);
    }

    public function boot(): void
    {
        //
    }
}
