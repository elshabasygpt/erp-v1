<?php

function replaceInFile($file, $search, $replace) {
    if (!file_exists($file)) return;
    $content = file_get_contents($file);
    if (is_array($search)) {
        foreach($search as $i => $s) {
            $content = str_replace($s, $replace[$i], $content);
        }
    } else {
        $content = str_replace($search, $replace, $content);
    }
    file_put_contents($file, $content);
}

// 1. AccountingService
replaceInFile(
    'app/Application/Accounting/Services/AccountingService.php',
    [
        "public function generateIncomeStatement(\DateTimeImmutable \$from, \DateTimeImmutable \$to): array",
        "DB::connection('tenant')->table('journal_entry_lines')"
    ],
    [
        "public function generateIncomeStatement(\DateTimeImmutable \$from, \DateTimeImmutable \$to, string \$tenantId): array",
        "DB::connection('tenant')->table('journal_entry_lines')->where('journal_entry_lines.tenant_id', \$tenantId)"
    ]
);
// Also need to update ReportsController to pass tenantId
replaceInFile(
    'app/Presentation/Controllers/API/Accounting/ReportsController.php',
    "return \$this->success(\$this->accountingService->generateIncomeStatement(\$from, \$to));",
    "return \$this->success(\$this->accountingService->generateIncomeStatement(\$from, \$to, (string) \$this->getTenantId(\$request)));"
);

// 2. ConfirmInvoiceUseCase
replaceInFile(
    'app/Application/Sales/UseCases/ConfirmInvoiceUseCase.php',
    [
        "DB::connection('tenant')->table('safe_users')",
        "public function execute(string \$invoiceId, string \$userId): void"
    ],
    [
        "DB::connection('tenant')->table('safe_users')->where('tenant_id', \$invoice->tenant_id)",
        "public function execute(string \$invoiceId, string \$userId): void"
    ]
);

// 3. GetCustomerStatementUseCase
replaceInFile(
    'app/Application/Sales/UseCases/GetCustomerStatementUseCase.php',
    [
        "DB::table('invoices')",
        "DB::table('customer_payments')"
    ],
    [
        "DB::table('invoices')->where('tenant_id', \$tenantId)",
        "DB::table('customer_payments')->where('tenant_id', \$tenantId)"
    ]
);

// 4. UpdateInvoiceUseCase
replaceInFile(
    'app/Application/Sales/UseCases/UpdateInvoiceUseCase.php',
    "DB::connection('tenant')->table('safe_users')",
    "DB::connection('tenant')->table('safe_users')->where('tenant_id', \$dto->tenantId)"
);

// 5. AccountMappingService
replaceInFile(
    'app/Domain/Accounting/Services/AccountMappingService.php',
    "DB::connection('tenant')->table('tenant_settings')->updateOrInsert(\n            ['key' => \$settingKey],",
    "DB::connection('tenant')->table('tenant_settings')->updateOrInsert(\n            ['key' => \$settingKey, 'tenant_id' => \$tenantId],"
);

// 6. FiscalPeriodService
replaceInFile(
    'app/Domain/Accounting/Services/FiscalPeriodService.php',
    [
        "DB::connection('tenant')->table('fiscal_periods')\n            ->where('id', \$periodId)",
        "DB::connection('tenant')->table('fiscal_periods')->insert(["
    ],
    [
        "DB::connection('tenant')->table('fiscal_periods')\n            ->where('tenant_id', \$tenantId)\n            ->where('id', \$periodId)",
        "DB::connection('tenant')->table('fiscal_periods')->insert([\n            'tenant_id' => \$tenantId,"
    ]
);

// 7. EloquentCustomerRepository
replaceInFile(
    'app/Infrastructure/Eloquent/Repositories/EloquentCustomerRepository.php',
    "DB::connection('tenant')->table('invoices')->where('customer_id',\$customerId)",
    "DB::connection('tenant')->table('invoices')->where('tenant_id', \$tenantId)->where('customer_id',\$customerId)"
);

// 8. EloquentJournalEntryRepository
replaceInFile(
    'app/Infrastructure/Eloquent/Repositories/EloquentJournalEntryRepository.php',
    "DB::connection('tenant')->table('journal_entry_lines')",
    "DB::connection('tenant')->table('journal_entry_lines')->where('journal_entry_lines.tenant_id', \$tenantId)"
);

// 9. ZatcaOnboardingService
replaceInFile(
    'app/Infrastructure/Zatca/ZatcaOnboardingService.php',
    "DB::connection('tenant')->table('tenant_settings')->updateOrInsert(\n            ['key' => \$key],",
    "DB::connection('tenant')->table('tenant_settings')->updateOrInsert(\n            ['key' => \$key, 'tenant_id' => \$tenantId],"
);

// 10. CrmDashboardController
replaceInFile(
    'app/Presentation/Controllers/API/CRM/CrmDashboardController.php',
    "DB::connection('tenant')->table('invoice_items')",
    "DB::connection('tenant')->table('invoice_items')->where('invoice_items.tenant_id', \$this->getTenantId(\$request))"
);

// 11. SubscriptionController
replaceInFile(
    'app/Presentation/Controllers/API/Subscription/SubscriptionController.php',
    "DB::connection('pgsql')->table('plans')",
    "DB::connection('pgsql')->table('plans') // Plans table is public, not scoped to tenant"
);

echo "Patched successfully\n";
