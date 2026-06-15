$controllers = @(
    "app\Presentation\Controllers\API\HR\LeaveController.php",
    "app\Presentation\Controllers\API\HR\PayrollController.php",
    "app\Presentation\Controllers\API\Treasury\ExpenseController.php",
    "app\Presentation\Controllers\API\Partnerships\PartnerController.php",
    "app\Presentation\Controllers\API\Partnerships\ProfitDistributionController.php",
    "app\Presentation\Controllers\API\Portal\PartnerDashboardController.php"
)

foreach ($c in $controllers) {
    if (Test-Path $c) {
        $content = Get-Content $c -Raw
        $content = $content -replace "use App\\Presentation\\Controllers\\API\\BaseController;", "use App\Presentation\Controllers\API\BaseTenantController;"
        $content = $content -replace "extends BaseController", "extends BaseTenantController"
        Set-Content -Path $c -Value $content
        Write-Output "Updated $c"
    } else {
        Write-Output "Missing $c"
    }
}
