<?php
namespace Database\Factories;

use App\Infrastructure\Eloquent\Models\UserModel;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected $model = UserModel::class;

    public function definition(): array
    {
        return [
            'tenant_id' => 1,
            'name'      => $this->faker->name(),
            'email'     => $this->faker->unique()->safeEmail(),
            'password'  => bcrypt('password'),
        ];
    }
}
