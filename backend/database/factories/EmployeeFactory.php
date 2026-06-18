<?php

namespace Database\Factories;

use App\Infrastructure\Eloquent\Models\EmployeeModel;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmployeeFactory extends Factory
{
    protected $model = EmployeeModel::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'position' => $this->faker->jobTitle(),
            'phone' => $this->faker->phoneNumber(),
            'base_salary' => $this->faker->numberBetween(3000, 15000),
            'is_active' => true,
        ];
    }
}
