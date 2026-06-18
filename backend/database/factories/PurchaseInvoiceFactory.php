<?php

namespace Database\Factories;

use App\Infrastructure\Eloquent\Models\PurchaseInvoiceModel;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseInvoiceFactory extends Factory
{
    protected $model = PurchaseInvoiceModel::class;

    public function definition(): array
    {
        return [

            'invoice_number' => $this->faker->unique()->numerify('PI-#####'),
            'supplier_id' => 1,
            'invoice_date' => $this->faker->date(),
            'total' => $this->faker->numberBetween(100, 10000),
            'status' => 'draft',
        ];
    }
}
