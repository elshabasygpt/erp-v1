<?php
namespace Database\Factories;

use App\Infrastructure\Eloquent\Models\WebhookEndpointModel;
use Illuminate\Database\Eloquent\Factories\Factory;

class WebhookEndpointFactory extends Factory
{
    protected $model = WebhookEndpointModel::class;

    public function definition(): array
    {
        return [
            
            'url'       => $this->faker->url(),
            'events'    => ['invoice.confirmed'],
            'is_active' => true,
            'secret'    => $this->faker->uuid(),
        ];
    }
}
