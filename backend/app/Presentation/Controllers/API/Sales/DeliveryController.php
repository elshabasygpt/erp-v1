<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Presentation\Controllers\API\BaseController;
use App\Application\Sales\DTOs\Deliveries\CreateDeliveryDTO;
use App\Application\Sales\DTOs\Deliveries\UpdateDeliveryStatusDTO;
use App\Application\Sales\DTOs\Deliveries\AssignDeliveryDTO;
use App\Application\Sales\UseCases\Deliveries\CreateDeliveryUseCase;
use App\Application\Sales\UseCases\Deliveries\UpdateDeliveryStatusUseCase;
use App\Application\Sales\UseCases\Deliveries\AssignDeliveryUseCase;
use App\Infrastructure\Eloquent\Models\DeliveryModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeliveryController extends BaseController
{
    public function __construct(
        private readonly CreateDeliveryUseCase $createDeliveryUseCase,
        private readonly UpdateDeliveryStatusUseCase $updateDeliveryStatusUseCase,
        private readonly AssignDeliveryUseCase $assignDeliveryUseCase
    ) {}

    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', 15);
        $status = $request->query('status');
        
        $query = DeliveryModel::with(['customer', 'driver', 'deliveryPlatform'])->orderBy('created_at', 'desc');
        
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where('delivery_number', 'ilike', "%{$search}%");
        }

        $deliveries = $query->paginate((int) $limit);
        return $this->paginated($deliveries->toArray(), 'Deliveries retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_type' => 'required|string|in:sales_order,invoice,return',
            'order_id' => 'required|uuid',
            'customer_id' => 'required|uuid|exists:customers,id',
            'driver_id' => 'nullable|uuid|exists:employees,id',
            'delivery_platform_id' => 'nullable|uuid|exists:sales_channels,id',
            'delivery_fee' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|in:pending,assigned,dispatched,out_for_delivery,delivered,failed,returned',
        ]);

        try {
            $dto = CreateDeliveryDTO::fromRequest($validated);
            $delivery = $this->createDeliveryUseCase->execute($dto, auth()->id() ?? '');

            return $this->created($delivery->toArray(), 'Delivery created successfully');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Delivery creation failed: ' . $e->getMessage());
            return $this->error('Failed to create delivery: ' . $e->getMessage(), 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        $delivery = DeliveryModel::with(['customer', 'driver', 'deliveryPlatform', 'statusLogs.creator'])->find($id);
        
        if (!$delivery) {
            return $this->error('Delivery not found', 404);
        }

        // Fetch the related order if needed, but for now just returning the delivery data.
        return $this->success($delivery->toArray(), 'Delivery details');
    }

    public function assign(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'driver_id' => 'nullable|uuid|exists:employees,id',
            'delivery_platform_id' => 'nullable|uuid|exists:sales_channels,id',
            'tracking_code' => 'nullable|string',
            'eta' => 'nullable|date',
            'delivery_fee' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        try {
            $dto = AssignDeliveryDTO::fromRequest($validated);
            $delivery = $this->assignDeliveryUseCase->execute($id, $dto, auth()->id() ?? '');

            return $this->success($delivery->toArray(), 'Delivery assigned successfully');
        } catch (\Exception $e) {
            \Log::error('Delivery assignment failed: ' . $e->getMessage());
            return $this->error('Failed to assign delivery: ' . $e->getMessage(), 500);
        }
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending,assigned,dispatched,out_for_delivery,delivered,failed,returned',
            'notes' => 'nullable|string',
        ]);

        try {
            $dto = UpdateDeliveryStatusDTO::fromRequest($validated);
            $delivery = $this->updateDeliveryStatusUseCase->execute($id, $dto, auth()->id() ?? '');

            return $this->success($delivery->toArray(), 'Delivery status updated successfully');
        } catch (\Exception $e) {
            \Log::error('Delivery status update failed: ' . $e->getMessage());
            return $this->error('Failed to update delivery status: ' . $e->getMessage(), 500);
        }
    }
}
