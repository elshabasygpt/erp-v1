<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('invoices', function (Blueprint $table) {
            $table->text('zatca_qr_code')->nullable()->after('status');
            $table->longText('zatca_xml')->nullable()->after('zatca_qr_code');
            $table->string('zatca_hash')->nullable()->after('zatca_xml');
            $table->uuid('zatca_uuid')->nullable()->after('zatca_hash');
            $table->enum('zatca_status', ['pending', 'reported', 'cleared', 'failed'])->default('pending')->after('zatca_uuid');
            $table->text('zatca_error_message')->nullable()->after('zatca_status');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'zatca_qr_code', 'zatca_xml', 'zatca_hash', 'zatca_uuid', 'zatca_status', 'zatca_error_message'
            ]);
        });
    }
};
