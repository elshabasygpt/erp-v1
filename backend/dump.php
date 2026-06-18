<?php

$files = [
    'app/Application/Accounting/Services/AccountingService.php',
    'app/Application/Sales\UseCases\ConfirmInvoiceUseCase.php',
    'app/Application/Sales\UseCases\GetCustomerStatementUseCase.php',
    'app/Application/Sales\UseCases\UpdateInvoiceUseCase.php',
    'app/Domain/Accounting\Services\AccountMappingService.php',
    'app/Domain/Accounting\Services\FiscalPeriodService.php',
    'app/Infrastructure/Eloquent\Repositories\EloquentCustomerRepository.php',
    'app/Infrastructure/Eloquent\Repositories\EloquentJournalEntryRepository.php',
    'app/Infrastructure/Zatca\ZatcaOnboardingService.php',
    'app/Presentation/Controllers/API\CRM\CrmDashboardController.php',
    'app/Presentation/Controllers/API\CRM\VoucherController.php',
];

foreach ($files as $file) {
    if (! file_exists($file)) {
        continue;
    }
    $content = file_get_contents($file);
    echo "==== $file ====\n";
    preg_match_all('/DB::(:?connection\([^\)]+\)->)?table\(([^)]+)\)/', $content, $matches, PREG_OFFSET_CAPTURE);
    foreach ($matches[0] as $i => $matchStr) {
        $offset = $matches[0][$i][1];
        $snippet = substr($content, $offset, 150);
        if (! str_contains($snippet, 'tenant_id') && ! str_contains($snippet, 'tenantId')) {
            echo $snippet."\n---\n";
        }
    }
}
