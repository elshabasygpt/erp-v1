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
            
            'name'          => $this->faker->name(),
            'email'         => $this->faker->unique()->safeEmail(),
            'profit_share'  => $this->faker->numberBetween(10, 40),
            'joined_at'     => $this->faker->date(),
            'status'        => 'active',
            'portal_access' => false,
        ];
    }
}
