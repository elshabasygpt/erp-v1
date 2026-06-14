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
            'tenant_id'   => 1,
            'name'        => $this->faker->name(),
            'email'       => $this->faker->unique()->safeEmail(),
            'job_title'   => $this->faker->jobTitle(),
            'base_salary' => $this->faker->numberBetween(3000, 15000),
            'status'      => 'active',
            'hired_at'    => $this->faker->date(),
        ];
    }
}
