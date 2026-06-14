<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\Deliveries;

use App\Application\Sales\DTOs\Deliveries\CreateDeliveryDTO;
use App\Infrastructure\Eloquent\Models\DeliveryModel;
use App\Infrastructure\Eloquent\Models\DeliveryStatusLogModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CreateDeliveryUseCase
{
    public function execute(CreateDeliveryDTO $dto, string $userId): DeliveryModel
    {
        return DB::transaction(function () use ($dto, $userId) {
            
            // Check if delivery already exists for this order
            $existing = DeliveryModel::where('order_id', $dto->orderId)
                ->where('order_type', $dto->orderType)
                ->first();
                
            if ($existing) {
                throw new \DomainException("A delivery already exists for this {$dto->orderType}");
            }

            $delivery = DeliveryModel::create([
                'id' => Str::uuid()->toString(),
                'delivery_number' => 'DEL-' . Date('YmdHis') . rand(10,99),
                'order_type' => $dto->orderType,
                'order_id' => $dto->orderId,
                'customer_id' => $dto->customerId,
                'driver_id' => $dto->driverId,
                'delivery_platform_id' => $dto->deliveryPlatformId,
                'status' => $dto->status,
                'delivery_fee' => $dto->deliveryFee,
                'notes' => $dto->notes,
                'created_by' => $userId,
            ]);

            DeliveryStatusLogModel::create([
                'id' => Str::uuid()->toString(),
                'delivery_id' => $delivery->id,
                'status' => $dto->status,
                'notes' => 'Delivery created',
                'created_by' => $userId,
            ]);

            return $delivery;
        });
    }
}
