<?php

namespace App\Providers;

use App\Domain\Accounting\Repositories\AccountRepositoryInterface;
// Sales
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Approvals\Repositories\ApprovalRepositoryInterface;
use App\Domain\Auth\Repositories\UserRepositoryInterface;
use App\Domain\CRM\Repositories\CustomerRepositoryInterface;
// Inventory
use App\Domain\CRM\Repositories\SupplierRepositoryInterface;
use App\Domain\HR\Repositories\AttendanceRepositoryInterface;
// CRM
use App\Domain\HR\Repositories\EmployeeRepositoryInterface;
use App\Domain\HR\Repositories\PayrollRepositoryInterface;
use App\Domain\Inventory\Repositories\ProductRepositoryInterface;
use App\Domain\Purchases\Repositories\PurchaseRepositoryInterface;
// Purchases
use App\Domain\Sales\Repositories\InvoiceRepositoryInterface;
use App\Domain\Sales\Repositories\SalesChannelRepositoryInterface;
// Accounting
use App\Domain\Treasury\Repositories\SafeRepositoryInterface;
use App\Domain\Treasury\Repositories\SafeTransactionRepositoryInterface;
use App\Infrastructure\Eloquent\Repositories\Approvals\EloquentApprovalRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentAccountRepository;
// HR
use App\Infrastructure\Eloquent\Repositories\EloquentCustomerRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentInvoiceRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentJournalEntryRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentProductRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentPurchaseRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentSalesChannelRepository;
// Treasury
use App\Infrastructure\Eloquent\Repositories\EloquentSupplierRepository;
use App\Infrastructure\Eloquent\Repositories\EloquentUserRepository;
use App\Infrastructure\Eloquent\Repositories\HR\EloquentAttendanceRepository;
use App\Infrastructure\Eloquent\Repositories\HR\EloquentEmployeeRepository;
// Approvals
use App\Infrastructure\Eloquent\Repositories\HR\EloquentPayrollRepository;
use App\Infrastructure\Eloquent\Repositories\Treasury\EloquentSafeRepository;
// Auth
use App\Infrastructure\Eloquent\Repositories\Treasury\EloquentSafeTransactionRepository;
use App\Infrastructure\Validation\TenantPresenceVerifier;
use Illuminate\Support\ServiceProvider;

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
        $this->app->singleton('validation.presence', function ($app) {
            return new TenantPresenceVerifier($app['db']);
        });
    }
}
