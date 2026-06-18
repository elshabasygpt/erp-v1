<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\Deliveries;

use App\Application\Sales\DTOs\Deliveries\UpdateDeliveryStatusDTO;
use App\Domain\Sales\Services\DeliveryService;
use App\Infrastructure\Eloquent\Models\DeliveryModel;
use App\Infrastructure\Eloquent\Models\DeliveryStatusLogModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class UpdateDeliveryStatusUseCase
{
    public function __construct(
        private readonly DeliveryService $deliveryService
    ) {}

    public function execute(string $deliveryId, UpdateDeliveryStatusDTO $dto, string $userId): DeliveryModel
    {
        return DB::connection('tenant')->transaction(function () use ($deliveryId, $dto, $userId) {
            $delivery = DeliveryModel::query()->findOrFail($deliveryId);

            if ($delivery->status === $dto->status) {
                return $delivery; // No change
            }

            // Define valid transitions
            $validTransitions = [
                'pending' => ['assigned', 'failed', 'returned'], // 'returned' if cancelled before dispatch
                'assigned' => ['dispatched', 'failed', 'pending'],
                'dispatched' => ['out_for_delivery', 'failed', 'returned'],
                'out_for_delivery' => ['delivered', 'failed', 'returned'],
                'delivered' => ['returned'], // can only go to returned from delivered
                'failed' => ['pending', 'assigned'], // retry
                'returned' => [], // terminal state
            ];

            $allowedStates = $validTransitions[$delivery->status] ?? [];
            if (! in_array($dto->status, $allowedStates)) {
                throw new \DomainException("Invalid state transition from {$delivery->status} to {$dto->status}. Allowed transitions: ".implode(', ', $allowedStates));
            }

            $delivery->updated_by = $userId;

            if ($dto->status === 'dispatched') {
                // Let DeliveryService handle the dispatch logic (stock movement, reserved stock reduction)
                $delivery = $this->deliveryService->dispatchDelivery($delivery->tenant_id, $delivery->id, $userId);
            } else {
                $delivery->status = $dto->status;
                $delivery->save();
            }

            DeliveryStatusLogModel::query()->create([
                'id' => Str::uuid()->toString(),
                'delivery_id' => $delivery->id,
                'status' => $dto->status,
                'notes' => $dto->notes,
                'created_by' => $userId,
            ]);

            return $delivery->load('statusLogs');
        });
    }
}
