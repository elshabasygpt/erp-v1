<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\Deliveries;

use App\Application\Sales\DTOs\Deliveries\AssignDeliveryDTO;
use App\Infrastructure\Eloquent\Models\DeliveryModel;
use App\Infrastructure\Eloquent\Models\DeliveryStatusLogModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AssignDeliveryUseCase
{
    public function execute(string $deliveryId, AssignDeliveryDTO $dto, string $userId): DeliveryModel
    {
        return DB::transaction(function () use ($deliveryId, $dto, $userId) {
            $delivery = DeliveryModel::findOrFail($deliveryId);
            
            if (in_array($delivery->status, ['delivered', 'returned'])) {
                throw new \DomainException("Cannot modify assignment for a delivery in {$delivery->status} state.");
            }

            if ($dto->driverId !== null) {
                $delivery->driver_id = $dto->driverId;
            }
            if ($dto->deliveryPlatformId !== null) {
                $delivery->delivery_platform_id = $dto->deliveryPlatformId;
            }
            if ($dto->trackingCode !== null) {
                $delivery->tracking_code = $dto->trackingCode;
            }
            if ($dto->eta !== null) {
                $delivery->eta = $dto->eta;
            }
            if ($dto->deliveryFee !== null) {
                $delivery->delivery_fee = $dto->deliveryFee;
            }

            // If it was pending, change to assigned automatically when assigned to a driver/platform
            $newStatus = $delivery->status;
            if ($delivery->status === 'pending' && ($dto->driverId || $dto->deliveryPlatformId)) {
                $newStatus = 'assigned';
                $delivery->status = $newStatus;
            }

            $delivery->updated_by = $userId;
            $delivery->save();

            DeliveryStatusLogModel::create([
                'id' => Str::uuid()->toString(),
                'delivery_id' => $delivery->id,
                'status' => $newStatus,
                'notes' => 'Driver/Platform assigned: ' . ($dto->notes ?? ''),
                'created_by' => $userId,
            ]);

            return $delivery->load(['driver', 'deliveryPlatform', 'statusLogs']);
        });
    }
}
