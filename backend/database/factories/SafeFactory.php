<?php
namespace Database\Factories;

use App\Infrastructure\Eloquent\Models\SafeModel;
use Illuminate\Database\Eloquent\Factories\Factory;

class SafeFactory extends Factory
{
    protected $model = SafeModel::class;

    public function definition(): array
    {
        return [
            'name'       => $this->faker->company() . ' Safe',
            'type'       => 'cash',
            'balance'    => $this->faker->numberBetween(1000, 50000),
            'is_active'  => true,
        ];
    }
}
