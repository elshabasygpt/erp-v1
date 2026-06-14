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
            'tenant_id'  => 1,
            'name'       => 'خزينة ' . $this->faker->word(),
            'balance'    => $this->faker->numberBetween(1000, 50000),
            'currency'   => 'SAR',
            'is_default' => false,
        ];
    }
}
