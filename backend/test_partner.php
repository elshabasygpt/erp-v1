<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Infrastructure\Eloquent\Models\PartnerModel;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

function setup() {
    $uuid = Str::uuid()->toString();
    $partner = PartnerModel::create([
        'id' => $uuid,
        'name' => 'John Doe Investment',
        'phone' => '+1234567890',
        'capital_amount' => 500000,
        'profit_share_percentage' => 25,
        'duration_type' => 'years',
        'duration_value' => '5',
        'total_pending' => 12500,
        'total_withdrawn' => 5000,
        'is_active' => true,
        'portal_enabled' => true,
        'email' => 'test@partner.com',
        'password_hash' => Hash::make('password')
    ]);

    echo "Created Partner: " . $partner->id . " with email test@partner.com and password 'password'\n";
}

try {
    setup();
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
