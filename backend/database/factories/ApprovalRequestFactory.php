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
            'tenant_id'        => 1,
            'requestable_type' => 'PurchaseInvoice',
            'requestable_id'   => $this->faker->numberBetween(1, 100),
            'requested_by'     => 1,
            'status'           => 'pending',
            'assigned_to'      => null,
            'notes'            => null,
            'decided_at'       => null,
        ];
    }
}
