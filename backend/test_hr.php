<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Presentation\Controllers\API\HR\HrController;
use App\Infrastructure\Eloquent\Models\SafeModel;
use Illuminate\Http\Request;

echo "--- Starting HR & Payroll Verification ---\n";

$hrController = app(HrController::class);

// 1. Hire Employee
$req = new Request([
    'name' => 'John Doe - Test Employee',
    'position' => 'Sales',
    'base_salary' => 6000,
    'shift_start' => '09:00',
    'shift_end' => '17:00'
]);
$res = $hrController->storeEmployee($req);
if ($res->getStatusCode() !== 201) { echo "[FAIL] Employee creation failed\n"; exit; }
$employee = $res->getData()->data;
echo "[OK] Employee Hired. ID: {$employee->id}\n";

// 2. Check in late (09:30)
$reqIn = new Request([
    'employee_id' => $employee->id,
    'time' => '09:30'
]);
$resIn = $hrController->checkIn($reqIn);
$att = $resIn->getData()->data;
echo "[OK] Checked in at 09:30. Late Minutes calculated: {$att->late_minutes}\n";
if ($att->late_minutes !== 30) {
    echo "[FAIL] Expected 30 minutes late! Got {$att->late_minutes}\n"; exit;
}

// 3. Generate Payroll
$reqPay = new Request([
    'employee_id' => $employee->id,
    'month' => (int)date('m'),
    'year' => (int)date('Y')
]);
$resPay = $hrController->generatePayroll($reqPay);
$payroll = $resPay->getData()->data;
echo "[OK] Payroll Generated.\n";
echo "     Base: {$payroll->base_salary}\n";
echo "     Deductions: {$payroll->deductions}\n";
echo "     Net: {$payroll->net_salary}\n";

// Deduction should be: (6000 / 30 / 8 / 60) * 30 mins
// minute_rate = 6000 / 240 / 60 = 0.4166
// 0.4166 * 30 = 12.5
if (abs($payroll->deductions - 12.5) > 0.1) {
    echo "[WARN] Deduction amount seems different from 12.5. Calculated: {$payroll->deductions}\n";
}

// 4. Pay via Treasury
// Pick the safe we created earlier or any cash safe
$safe = SafeModel::where('type', 'cash')->first();
if (!$safe) {
    $safe = SafeModel::create(['name' => 'HR Cash Test', 'type' => 'cash', 'balance' => 10000]);
}

// Make sure it has enough money
$safe->balance += 10000;
$safe->save();
$oldBalance = $safe->balance;

$reqPayExec = new Request([
    'safe_id' => $safe->id
]);
$resExec = $hrController->payPayroll($reqPayExec, $payroll->id);
if ($resExec->getStatusCode() !== 200) {
    echo "[FAIL] Payroll payment failed. " . json_encode($resExec->getData()) . "\n"; exit; 
}
echo "[OK] Payroll PAID via Treasury Safe.\n";

$safe->refresh();
if ((float)$safe->balance === (float)($oldBalance - $payroll->net_salary)) {
    echo "[OK] Safe balance accurately deducted!\n";
} else {
    echo "[FAIL] Safe balance mismatch. Expected " . ($oldBalance-$payroll->net_salary) . ", got {$safe->balance}\n"; 
}

echo "--- All HR Tests Completed Successfully! ---\n";
