<?php

namespace Database\Factories;

use App\Infrastructure\Eloquent\Models\SupplierModel;
use Illuminate\Database\Eloquent\Factories\Factory;

class SupplierFactory extends Factory
{
    protected $model = SupplierModel::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->company(),
            'email' => $this->faker->companyEmail(),
            'phone' => $this->faker->phoneNumber(),
            'address' => $this->faker->address(),
            'tax_number' => $this->faker->numerify('TAX-#########'),
            'balance' => 0,
            'is_active' => true,
            
        ];
    }
}
