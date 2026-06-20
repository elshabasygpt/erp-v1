<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

\Illuminate\Support\Facades\DB::connection('tenant')->enableQueryLog();

try {
    $db = \Illuminate\Support\Facades\DB::connection('tenant');
    $safes = $db->table('safes')->limit(2)->get();
    
    $req = new \Illuminate\Http\Request();
    $req->merge([
        'from_safe_id' => $safes[0]->id,
        'to_safe_id' => $safes[1]->id,
        'amount' => 50,
        'transaction_date' => '2026-06-20',
        'description' => 'Test transfer'
    ]);
    $req->headers->set('X-Tenant-ID', $safes[0]->tenant_id);
    
    $c = app(\App\Presentation\Controllers\API\Treasury\TreasuryController::class);
    
    // Let's directly call the UseCase here to see what happens
    $uc = app(\App\Application\Treasury\UseCases\TransferBetweenSafesUseCase::class);
    try {
        $uc->execute(
            $safes[0]->tenant_id,
            $safes[0]->id,
            $safes[1]->id,
            50.0,
            'user1',
            '2026-06-20',
            'Test transfer'
        );
        echo "SUCCESS!\n";
    } catch (\Exception $e) {
        echo "USECASE ERROR: " . $e->getMessage() . "\n";
    }
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage();
}

echo "\nQueries:\n";
print_r(\Illuminate\Support\Facades\DB::connection('tenant')->getQueryLog());
