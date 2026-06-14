<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('webhook_endpoints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('url');
            $table->string('name')->nullable();
            $table->json('events'); // array of event names, e.g. ["invoice.created", "product.updated"]
            $table->string('secret')->nullable(); // For signing payloads
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::connection('tenant')->create('webhook_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('endpoint_id');
            $table->string('event_name');
            $table->json('payload');
            $table->integer('response_status')->nullable();
            $table->text('response_body')->nullable();
            $table->boolean('is_successful')->default(false);
            $table->timestamps();

            $table->foreign('endpoint_id')->references('id')->on('webhook_endpoints')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('webhook_logs');
        Schema::connection('tenant')->dropIfExists('webhook_endpoints');
    }
};
