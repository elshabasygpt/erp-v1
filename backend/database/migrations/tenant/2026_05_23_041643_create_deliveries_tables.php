<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('delivery_number')->unique();
            $table->enum('order_type', ['sales_order', 'invoice', 'return']);
            $table->uuid('order_id'); // Polymorphic linkage to the document
            $table->uuid('customer_id');
            $table->uuid('driver_id')->nullable(); // From employees
            $table->uuid('delivery_platform_id')->nullable(); // From sales_channels
            $table->enum('status', ['pending', 'assigned', 'dispatched', 'out_for_delivery', 'delivered', 'failed', 'returned'])->default('pending');
            $table->decimal('delivery_fee', 14, 2)->default(0);
            $table->string('tracking_code')->nullable();
            $table->timestamp('eta')->nullable();
            $table->text('notes')->nullable();
            
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('restrict');
            $table->foreign('driver_id')->references('id')->on('employees')->onDelete('set null');
            $table->foreign('delivery_platform_id')->references('id')->on('sales_channels')->onDelete('set null');
        });

        Schema::connection('tenant')->create('delivery_status_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('delivery_id');
            $table->string('status');
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('delivery_id')->references('id')->on('deliveries')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('delivery_status_logs');
        Schema::connection('tenant')->dropIfExists('deliveries');
    }
};
