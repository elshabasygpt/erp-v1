<?php

namespace Database\Factories;

use App\Infrastructure\Eloquent\Models\PartnerModel;
use Illuminate\Database\Eloquent\Factories\Factory;

class PartnerFactory extends Factory
{
    protected $model = PartnerModel::class;

    public function definition(): array
    {
        return [

            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'profit_share_percentage' => $this->faker->numberBetween(10, 40),
            'is_active' => true,
            'portal_enabled' => false,
            'capital_amount' => 10000,
        ];
    }
}
