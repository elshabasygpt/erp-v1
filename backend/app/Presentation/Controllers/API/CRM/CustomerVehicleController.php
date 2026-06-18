<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\CRM;

use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\CustomerVehicleModel;
use App\Infrastructure\Eloquent\Models\CustomerVehicleServiceHistoryModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerVehicleController extends BaseTenantController
{
    public function searchByPlate(Request $request): JsonResponse
    {
        $query = $request->query('plate', '');
        if (strlen($query) < 2) {
            return $this->success([]);
        }

        $vehicles = CustomerVehicleModel::query()->where(function ($q) use ($query) {
            $q->where('plate_number', 'ilike', "%{$query}%")
                ->orWhere('plate_number_en', 'ilike', "%{$query}%")
                ->orWhere('vin', 'ilike', "%{$query}%");
        })
            ->with(['customer:id,name,phone', 'vehicleYear.vehicleModel.make'])
            ->limit(10)
            ->get()
            ->map(fn ($v) => [
            'id' => $v->id,
            'display_name' => $v->display_name,
            'plate_number' => $v->plate_number,
            'customer' => $v->customer,
        ]);

        return $this->success($vehicles);
    }

    public function index(Request $request, string $customerId): JsonResponse
    {
        $customer = CustomerModel::query()->find($customerId);
        if (! $customer) {
            return $this->error('Customer not found', 404);
        }

        $vehicles = CustomerVehicleModel::query()->where('customer_id', $customerId)
            ->with([
                'vehicleYear.vehicleModel.make',
                'lastService',
                'serviceHistory' => fn ($q) => $q->latest('service_date')->limit(3),
            ])
            ->get()
            ->map(function ($v) {
                return array_merge($v->toArray(), [
                    'display_name' => $v->display_name,
                    'make_name' => $v->vehicleYear?->vehicleModel?->make?->name_ar
                                      ?? $v->vehicleYear?->vehicleModel?->make?->name,
                    'model_name' => $v->vehicleYear?->vehicleModel?->name_ar
                                      ?? $v->vehicleYear?->vehicleModel?->name,
                    'year_range' => $v->vehicleYear ? ($v->vehicleYear->year_from
                                      .($v->vehicleYear->year_to ? '-'.$v->vehicleYear->year_to : '+')) : null,
                    'fuel_type' => $v->vehicleYear?->fuel_type,
                ]);
            });

        return $this->success($vehicles);
    }

    public function store(Request $request, string $customerId): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_year_id' => 'required|uuid|exists:vehicle_years,id',
            'plate_number' => 'nullable|string|max:20',
            'plate_number_en' => 'nullable|string|max:20',
            'color' => 'nullable|string|max:50',
            'mileage' => 'nullable|integer|min:0',
            'purchase_year' => 'nullable|integer|min:1900|max:'.(date('Y') + 1),
            'vin' => 'nullable|string|max:17',
            'notes' => 'nullable|string',
        ]);

        $customer = CustomerModel::query()->find($customerId);
        if (! $customer) {
            return $this->error('Customer not found', 404);
        }

        if (! empty($validated['plate_number'])) {
            $exists = CustomerVehicleModel::query()->where('customer_id', $customerId)
                ->where('plate_number', $validated['plate_number'])
                ->whereNull('deleted_at')
                ->exists();
            if ($exists) {
                return $this->error('هذه اللوحة مسجلة مسبقاً لهذا العميل', 422);
            }
        }

        $vehicle = new CustomerVehicleModel($validated);
        $vehicle->customer_id = $customerId;
        $vehicle->tenant_id = $this->getTenantId($request);
        $vehicle->created_by = $request->user()?->id;
        $vehicle->save();

        $vehicle->load(['vehicleYear.vehicleModel.make']);

        return $this->success(array_merge($vehicle->toArray(), [
            'display_name' => $vehicle->display_name,
        ]), 'Vehicle added successfully', 201);
    }

    public function update(Request $request, string $customerId, string $vehicleId): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_year_id' => 'sometimes|required|uuid|exists:vehicle_years,id',
            'plate_number' => 'nullable|string|max:20',
            'plate_number_en' => 'nullable|string|max:20',
            'color' => 'nullable|string|max:50',
            'mileage' => 'nullable|integer|min:0',
            'purchase_year' => 'nullable|integer|min:1900|max:'.(date('Y') + 1),
            'vin' => 'nullable|string|max:17',
            'notes' => 'nullable|string',
        ]);

        $vehicle = CustomerVehicleModel::query()->where('customer_id', $customerId)->find($vehicleId);
        if (! $vehicle) {
            return $this->error('Vehicle not found', 404);
        }

        if (! empty($validated['plate_number']) && $validated['plate_number'] !== $vehicle->plate_number) {
            $exists = CustomerVehicleModel::query()->where('customer_id', $customerId)
                ->where('plate_number', $validated['plate_number'])
                ->where('id', '!=', $vehicleId)
                ->whereNull('deleted_at')
                ->exists();
            if ($exists) {
                return $this->error('هذه اللوحة مسجلة مسبقاً لهذا العميل', 422);
            }
        }

        $vehicle->update($validated);
        $vehicle->load(['vehicleYear.vehicleModel.make']);

        return $this->success(array_merge($vehicle->toArray(), [
            'display_name' => $vehicle->display_name,
        ]), 'Vehicle updated successfully');
    }

    public function destroy(Request $request, string $customerId, string $vehicleId): JsonResponse
    {
        $vehicle = CustomerVehicleModel::query()->where('customer_id', $customerId)->find($vehicleId);
        if (! $vehicle) {
            return $this->error('Vehicle not found', 404);
        }

        $vehicle->delete();

        return $this->success(null, 'Vehicle deleted successfully');
    }

    public function serviceHistory(Request $request, string $customerId, string $vehicleId): JsonResponse
    {
        $vehicle = CustomerVehicleModel::query()->where('customer_id', $customerId)->find($vehicleId);
        if (! $vehicle) {
            return $this->error('Vehicle not found', 404);
        }

        $history = CustomerVehicleServiceHistoryModel::query()->where('customer_vehicle_id', $vehicleId)
            ->with(['invoice:id,invoice_number,total,invoice_date'])
            ->orderBy('service_date', 'desc')
            ->get();

        return $this->success([
            'vehicle' => array_merge($vehicle->toArray(), ['display_name' => $vehicle->display_name]),
            'history' => $history,
            'stats' => [
                'total_services' => $history->count(),
                'total_parts_value' => $history->whereNotNull('invoice_id')->sum(
                    fn ($h) => $h->invoice?->total ?? 0
                ),
                'last_service_date' => $history->first()?->service_date?->format('Y-m-d'),
                'next_service_date' => $history->whereNotNull('next_service_date')
                    ->where('next_service_date', '>=', now())
                    ->sortBy('next_service_date')
                    ->first()?->next_service_date?->format('Y-m-d'),
            ],
        ]);
    }

    public function addService(Request $request, string $customerId, string $vehicleId): JsonResponse
    {
        $validated = $request->validate([
            'invoice_id' => 'nullable|uuid|exists:invoices,id',
            'service_date' => 'required|date',
            'service_type' => 'required|string|in:parts_replacement,maintenance,inspection,other',
            'mileage_at_service' => 'nullable|integer|min:0',
            'description' => 'nullable|string|max:1000',
            'next_service_mileage' => 'nullable|integer|min:0',
            'next_service_date' => 'nullable|date|after:service_date',
        ]);

        $vehicle = CustomerVehicleModel::query()->where('customer_id', $customerId)->find($vehicleId);
        if (! $vehicle) {
            return $this->error('Vehicle not found', 404);
        }

        $service = new CustomerVehicleServiceHistoryModel($validated);
        $service->customer_vehicle_id = $vehicleId;
        $service->tenant_id = $this->getTenantId($request);
        $service->created_by = $request->user()?->id;
        $service->save();

        if (! empty($validated['mileage_at_service']) && $validated['mileage_at_service'] > ($vehicle->mileage ?? 0)) {
            $vehicle->mileage = $validated['mileage_at_service'];
            $vehicle->save();
        }

        return $this->success($service, 'Service history added successfully', 201);
    }
}
