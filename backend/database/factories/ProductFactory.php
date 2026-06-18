<?php

namespace Database\Factories;

use App\Infrastructure\Eloquent\Models\ProductModel;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    protected $model = ProductModel::class;

    public function definition(): array
    {
        return [
            'name' => fake()->word(),
            'name_ar' => fake()->word().' بالعربي',
            'sku' => fake()->unique()->numerify('SKU-#####'),
            'barcode' => fake()->unique()->ean13(),
            'cost_price' => fake()->randomFloat(2, 10, 500),
            'sell_price' => fake()->randomFloat(2, 20, 1000),
            'vat_rate' => 15.00,
            'stock_alert_level' => 10,
            'is_active' => true,
            'category_id' => null,
            'unit_of_measure' => 'piece',
            'description' => $this->faker->sentence(),

        ];
    }
}
