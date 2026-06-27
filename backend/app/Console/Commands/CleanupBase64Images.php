<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupBase64Images extends Command
{
    protected $signature = 'images:cleanup-base64';
    protected $description = 'Null out any base64 data-URLs that leaked into image_url columns';

    public function handle(): void
    {
        $tables = [
            'products'       => 'image_url',
            'categories'     => 'image_url',
            'brands'         => 'image_url',
            'vehicle_models' => 'image_url',
            'vehicle_years'  => 'engine_image_url',
        ];

        foreach ($tables as $table => $column) {
            $affected = DB::connection('tenant')
                ->table($table)
                ->where($column, 'like', 'data:%')
                ->update([$column => null]);

            $this->info("{$table}.{$column}: نُظّف {$affected} صف.");
        }

        $this->info('تم التنظيف. الصور القديمة المخزنة كـ base64 أُزيلت — أعد رفعها من الواجهة.');
    }
}
