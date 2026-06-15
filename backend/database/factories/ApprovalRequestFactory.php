<?php
namespace Database\Factories;

use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel;
use Illuminate\Database\Eloquent\Factories\Factory;

class ApprovalRequestFactory extends Factory
{
    protected $model = ApprovalRequestModel::class;

    public function definition(): array
    {
        return [
            'entity_type'  => 'PurchaseInvoice',
            'entity_id'    => $this->faker->uuid(),
            'trigger_type' => 'high_discount',
            'requested_by' => $this->faker->uuid(),
            'status'       => 'pending',
            'resolved_by'  => null,
            'notes'        => null,
        ];
    }
}
