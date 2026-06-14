<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            // Portal login credentials
            $table->string('email')->nullable()->unique()->after('phone');
            $table->string('password_hash')->nullable()->after('email');
            
            // Token-based access
            $table->string('access_token', 128)->nullable()->after('password_hash');
            
            // Magic Link support
            $table->string('magic_link_token', 128)->nullable();
            $table->timestamp('magic_link_expires_at')->nullable();
            
            // Portal settings
            $table->boolean('portal_enabled')->default(false)->after('is_active');
            $table->timestamp('last_login_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            $table->dropColumn([
                'email', 'password_hash', 'access_token',
                'magic_link_token', 'magic_link_expires_at',
                'portal_enabled', 'last_login_at'
            ]);
        });
    }
};
