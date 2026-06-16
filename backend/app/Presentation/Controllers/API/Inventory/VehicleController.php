<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Infrastructure\Eloquent\Models\VehicleMakeModel;
use App\Infrastructure\Eloquent\Models\VehicleModelModel;
use App\Infrastructure\Eloquent\Models\VehicleYearModel;
use App\Infrastructure\Eloquent\Models\ProductModel;

class VehicleController extends BaseTenantController
{
    public function getMakes(Request $request): JsonResponse
    {
        $makes = VehicleMakeModel::where('is_active', true)
            ->withCount('models')
            ->get(['id', 'name', 'name_ar', 'logo_url']);

        return response()->json($makes);
    }

    public function getModels(Request $request, string $makeId): JsonResponse
    {
        $models = VehicleModelModel::where('make_id', $makeId)
            ->where('is_active', true)
            ->with(['years' => function ($q) {
                $q->where('is_active', true)
                  ->orderBy('year_from', 'desc');
            }])
            ->get(['id', 'name', 'name_ar', 'body_type']);

        return response()->json($models);
    }

    public function storeMake(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'required|string|max:255',
            'logo_url' => 'nullable|string|url',
        ]);

        $make = DB::connection('tenant')->transaction(function () use ($validated, $request) {
            return VehicleMakeModel::create([
                'id' => Str::uuid()->toString(),
                'name' => $validated['name'],
                'name_ar' => $validated['name_ar'],
                'logo_url' => $validated['logo_url'],
                'created_by' => $request->user()->id,
            ]);
        });

        return response()->json($make, 201);
    }

    public function storeModel(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'make_id' => 'required|uuid|exists:tenant.vehicle_makes,id',
            'name' => 'required|string|max:255',
            'name_ar' => 'required|string|max:255',
            'body_type' => 'nullable|string|max:50',
        ]);

        $model = DB::connection('tenant')->transaction(function () use ($validated, $request) {
            return VehicleModelModel::create([
                'id' => Str::uuid()->toString(),
                'make_id' => $validated['make_id'],
                'name' => $validated['name'],
                'name_ar' => $validated['name_ar'],
                'body_type' => $validated['body_type'],
                'created_by' => $request->user()->id,
            ]);
        });

        return response()->json($model, 201);
    }

    public function storeYear(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'model_id' => 'required|uuid|exists:tenant.vehicle_models,id',
            'year_from' => 'required|integer|min:1900|max:2100',
            'year_to' => 'nullable|integer|min:1900|max:2100|gte:year_from',
            'engine_size' => 'nullable|string|max:50',
            'engine_code' => 'nullable|string|max:100',
            'fuel_type' => 'nullable|in:petrol,diesel,hybrid,electric',
        ]);

        $year = DB::connection('tenant')->transaction(function () use ($validated, $request) {
            return VehicleYearModel::create([
                'id' => Str::uuid()->toString(),
                'model_id' => $validated['model_id'],
                'year_from' => $validated['year_from'],
                'year_to' => $validated['year_to'] ?? null,
                'engine_size' => $validated['engine_size'] ?? null,
                'engine_code' => $validated['engine_code'] ?? null,
                'fuel_type' => $validated['fuel_type'] ?? 'petrol',
                'created_by' => $request->user()->id,
            ]);
        });

        return response()->json($year, 201);
    }

    public function searchByVehicle(Request $request): JsonResponse
    {
        $makeId = $request->query('make_id');
        $modelId = $request->query('model_id');
        $year = $request->query('year');
        $warehouseId = $request->query('warehouse_id');

        // Find valid vehicle year records
        $yearQuery = VehicleYearModel::where('is_active', true);
        
        if ($modelId) {
            $yearQuery->where('model_id', $modelId);
        } elseif ($makeId) {
            $yearQuery->whereHas('vehicleModel', function ($q) use ($makeId) {
                $q->where('make_id', $makeId);
            });
        }

        if ($year) {
            $yearQuery->where('year_from', '<=', $year)
                      ->where(function ($q) use ($year) {
                          $q->where('year_to', '>=', $year)
                            ->orWhereNull('year_to');
                      });
        }

        $vehicleYearIds = $yearQuery->pluck('id');

        if ($vehicleYearIds->isEmpty()) {
            return response()->json([]);
        }

        // Fetch products that have a pivot entry for these vehicle_year_ids
        $productsQuery = ProductModel::where('is_active', true)
            ->whereHas('compatibleVehicles', function ($q) use ($vehicleYearIds) {
                $q->whereIn('vehicle_year_id', $vehicleYearIds);
            })
            ->select([
                'id', 'name', 'name_ar', 'sku', 'barcode',
                'oem_number', 'part_number', 'brand', 'quality_grade',
                'sell_price', 'cost_price', 'vat_rate', 'image_url'
            ]);

        // Eager load stock for the requested warehouse
        if ($warehouseId) {
            $productsQuery->with(['warehouseStocks' => function ($q) use ($warehouseId) {
                $q->where('warehouse_id', $warehouseId)->select(['id', 'product_id', 'quantity']);
            }]);
        }

        $products = $productsQuery->get();

        return response()->json($products);
    }

    public function getProductCompatibility(Request $request, string $productId): JsonResponse
    {
        $product = ProductModel::findOrFail($productId);
        
        $compatibleVehicles = $product->compatibleVehicles()->get()->map(function ($year) {
            return [
                'vehicle_year_id' => $year->pivot->vehicle_year_id,
                'notes' => $year->pivot->notes,
                'make' => [
                    'id' => $year->vehicleModel->make->id,
                    'name' => $year->vehicleModel->make->name,
                    'name_ar' => $year->vehicleModel->make->name_ar,
                ],
                'model' => [
                    'id' => $year->vehicleModel->id,
                    'name' => $year->vehicleModel->name,
                    'name_ar' => $year->vehicleModel->name_ar,
                ],
                'year' => [
                    'id' => $year->id,
                    'year_from' => $year->year_from,
                    'year_to' => $year->year_to,
                    'engine_size' => $year->engine_size,
                ]
            ];
        });

        return response()->json($compatibleVehicles);
    }

    public function attachVehicle(Request $request, string $productId): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_year_id' => 'required|uuid|exists:tenant.vehicle_years,id',
            'notes' => 'nullable|string|max:255',
        ]);

        $product = ProductModel::findOrFail($productId);

        DB::connection('tenant')->transaction(function () use ($product, $validated, $request) {
            $product->compatibleVehicles()->syncWithoutDetaching([
                $validated['vehicle_year_id'] => [
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $this->getTenantId($request),
                    'notes' => $validated['notes'] ?? null,
                    'created_by' => $request->user()->id,
                ]
            ]);
        });

        return response()->json(['success' => true]);
    }

    public function detachVehicle(Request $request, string $productId, string $vehicleYearId): JsonResponse
    {
        $product = ProductModel::findOrFail($productId);
        
        DB::connection('tenant')->transaction(function () use ($product, $vehicleYearId) {
            $product->compatibleVehicles()->detach($vehicleYearId);
        });

        return response()->json(['success' => true]);
    }

    public function quickLookup(Request $request): JsonResponse
    {
        $q = strtolower(trim($request->query('q', '')));

        if (empty($q)) {
            return response()->json([]);
        }

        $years = VehicleYearModel::with(['vehicleModel.make'])
            ->where('is_active', true)
            ->whereHas('vehicleModel', function ($modelQ) use ($q) {
                $modelQ->where(DB::raw('LOWER(name)'), 'LIKE', "%{$q}%")
                       ->orWhere(DB::raw('LOWER(name_ar)'), 'LIKE', "%{$q}%")
                       ->orWhereHas('make', function ($makeQ) use ($q) {
                           $makeQ->where(DB::raw('LOWER(name)'), 'LIKE', "%{$q}%")
                                 ->orWhere(DB::raw('LOWER(name_ar)'), 'LIKE', "%{$q}%");
                       });
            })
            ->limit(20)
            ->get();

        $results = $years->map(function ($year) {
            $makeName = $year->vehicleModel->make->name;
            $makeNameAr = $year->vehicleModel->make->name_ar;
            $modelName = $year->vehicleModel->name;
            $modelNameAr = $year->vehicleModel->name_ar;
            
            $yearTo = $year->year_to ? "-{$year->year_to}" : "-Present";
            $engine = $year->engine_size ? " ({$year->engine_size})" : "";

            return [
                'vehicle_year_id' => $year->id,
                'label' => "{$makeName} {$modelName} {$year->year_from}{$yearTo}{$engine}",
                'label_ar' => "{$makeNameAr} {$modelNameAr} {$year->year_from}{$yearTo}{$engine}",
                'make_id' => $year->vehicleModel->make_id,
                'model_id' => $year->model_id,
            ];
        });

        return response()->json($results);
    }
}
