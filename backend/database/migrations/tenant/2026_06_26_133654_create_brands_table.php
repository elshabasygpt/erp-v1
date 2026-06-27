<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('brands', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->index();
            $table->string('name_ar')->nullable()->index();
            $table->string('image_url')->nullable();
            $table->uuid('tenant_id')->index();
            $table->timestamps();
            $table->softDeletes();
        });

        // Add brand_id to products
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'brand_id')) {
                $table->uuid('brand_id')->nullable()->after('brand');
                $table->foreign('brand_id')->references('id')->on('brands')->nullOnDelete();
            }
        });

        // Migrate existing brands from string to brand_id
        $distinctTenantBrands = DB::table('products')
            ->whereNotNull('brand')
            ->where('brand', '!=', '')
            ->select('brand', 'tenant_id')
            ->distinct()
            ->get();
            
        foreach ($distinctTenantBrands as $tb) {
            $brandName = $tb->brand;
            $tenantId = $tb->tenant_id;
            $brandId = \Ramsey\Uuid\Uuid::uuid4()->toString();

            DB::table('brands')->insert([
                'id' => $brandId,
                'name' => $brandName,
                'tenant_id' => $tenantId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('products')
                ->where('brand', $brandName)
                ->where('tenant_id', $tenantId)
                ->update(['brand_id' => $brandId]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'brand_id')) {
                $table->dropForeign(['brand_id']);
                $table->dropColumn('brand_id');
            }
        });
        
        Schema::dropIfExists('brands');
    }
};
