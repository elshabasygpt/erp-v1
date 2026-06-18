<?php

namespace Database\Factories;

use App\Infrastructure\Eloquent\Models\WarehouseModel;
use Illuminate\Database\Eloquent\Factories\Factory;

class WarehouseFactory extends Factory
{
    protected $model = WarehouseModel::class;

    public function definition(): array
    {
        return [

            'name' => $this->faker->word().' warehouse',
            'location' => $this->faker->city(),
            'is_active' => true,
        ];
    }
}
