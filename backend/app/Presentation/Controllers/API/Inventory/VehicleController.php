<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
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

        return $this->success($makes, 'Vehicle makes retrieved successfully');
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

        return $this->success($models, 'Vehicle models retrieved successfully');
    }

    public function storeMake(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'required|string|max:255',
            'logo_url' => 'nullable|string|url',
        ]);

        $make = DB::connection('tenant')->transaction(function () use ($validated, $request) {
            $data = $validated;
            $data['tenant_id'] = $this->getTenantId($request);
            $data['created_by'] = $request->user()?->id;
            return VehicleMakeModel::create($data);
        });

        return $this->success($make, 'Vehicle make created successfully', 201);
    }

    public function storeModel(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'make_id' => 'required|uuid|exists:tenant.vehicle_makes,id',
            'name' => 'required|string|max:255',
            'name_ar' => 'required|string|max:255',
            'body_type' => 'nullable|string|max:50',
        ]);

        $make = VehicleMakeModel::find($validated['make_id']);
        if (!$make) {
            return $this->error('Make not found', 404);
        }

        $model = DB::connection('tenant')->transaction(function () use ($validated, $request) {
            $data = $validated;
            $data['tenant_id'] = $this->getTenantId($request);
            $data['created_by'] = $request->user()?->id;
            return VehicleModelModel::create($data);
        });

        return $this->success($model, 'Vehicle model created successfully', 201);
    }

    public function storeYear(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'model_id' => 'required|uuid|exists:tenant.vehicle_models,id',
            'year_from' => 'required|integer|min:1900|max:2030',
            'year_to' => 'nullable|integer|gte:year_from',
            'engine_size' => 'nullable|string|max:50',
            'engine_code' => 'nullable|string|max:100',
            'fuel_type' => 'nullable|in:petrol,diesel,hybrid,electric',
        ]);

        $modelRec = VehicleModelModel::find($validated['model_id']);
        if (!$modelRec) {
            return $this->error('Model not found', 404);
        }

        $year = DB::connection('tenant')->transaction(function () use ($validated, $request) {
            $data = $validated;
            $data['tenant_id'] = $this->getTenantId($request);
            $data['created_by'] = $request->user()?->id;
            return VehicleYearModel::create($data);
        });

        return $this->success($year, 'Vehicle year created successfully', 201);
    }

    public function searchByVehicle(Request $request): JsonResponse
    {
        $makeId = $request->query('make_id');
        $modelId = $request->query('model_id');
        $year = $request->query('year');
        $warehouseId = $request->query('warehouse_id');

        $yearQuery = VehicleYearModel::where('is_active', true);
        
        if ($modelId) {
            $yearQuery->where('model_id', $modelId);
        } elseif ($makeId) {
            $yearQuery->whereHas('vehicleModel', function ($q) use ($makeId) {
                $q->where('make_id', $makeId);
            });
        }

        if ($year) {
            $year = (int) $year;
            $yearQuery->where('year_from', '<=', $year)
                      ->where(function ($q) use ($year) {
                          $q->whereNull('year_to')->orWhere('year_to', '>=', $year);
                      });
        }

        $vehicleYearIds = $yearQuery->pluck('id');

        if ($vehicleYearIds->isEmpty()) {
            return $this->success([]);
        }

        $productsQuery = ProductModel::where('is_active', true)
            ->whereHas('compatibleVehicles', function ($q) use ($vehicleYearIds) {
                $q->whereIn('product_vehicle_compatibility.vehicle_year_id', $vehicleYearIds);
            })
            ->select([
                'id', 'name', 'name_ar', 'sku', 'barcode',
                'oem_number', 'part_number', 'brand', 'quality_grade',
                'sell_price', 'cost_price', 'vat_rate', 'image_url'
            ]);

        if ($warehouseId) {
            $productsQuery->with(['warehouseStocks' => function ($q) use ($warehouseId) {
                $q->where('warehouse_id', $warehouseId)->select(['id', 'product_id', 'quantity as stock_quantity']);
            }]);
        }

        $products = $productsQuery->get()->map(function ($product) {
            $productArray = $product->toArray();
            
            if (isset($productArray['warehouse_stocks']) && count($productArray['warehouse_stocks']) > 0) {
                $productArray['stock_quantity'] = $productArray['warehouse_stocks'][0]['stock_quantity'];
            } else {
                $productArray['stock_quantity'] = 0;
            }
            
            unset($productArray['warehouse_stocks']);
            return $productArray;
        });

        return $this->success($products);
    }

    public function getProductCompatibility(Request $request, string $productId): JsonResponse
    {
        $product = ProductModel::find($productId);
        if (!$product) {
            return $this->error('Product not found', 404);
        }
        
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

        return $this->success($compatibleVehicles);
    }

    public function attachVehicle(Request $request, string $productId): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_year_id' => 'required|uuid|exists:tenant.vehicle_years,id',
            'notes' => 'nullable|string|max:255',
        ]);

        $product = ProductModel::find($productId);
        if (!$product) {
            return $this->error('Product not found', 404);
        }

        $existing = DB::connection('tenant')->table('product_vehicle_compatibility')
            ->where('product_id', $productId)
            ->where('vehicle_year_id', $validated['vehicle_year_id'])
            ->first();

        if ($existing) {
            DB::connection('tenant')->table('product_vehicle_compatibility')
                ->where('id', $existing->id)
                ->update([
                    'notes' => $validated['notes'] ?? null,
                    'updated_at' => now()
                ]);
        } else {
            DB::connection('tenant')->table('product_vehicle_compatibility')->insert([
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'tenant_id' => $this->getTenantId($request),
                'product_id' => $productId,
                'vehicle_year_id' => $validated['vehicle_year_id'],
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        return $this->success(null, 'Vehicle attached successfully');
    }

    public function detachVehicle(Request $request, string $productId, string $vehicleYearId): JsonResponse
    {
        $product = ProductModel::find($productId);
        if (!$product) {
            return $this->error('Product not found', 404);
        }
        
        $product->compatibleVehicles()->detach($vehicleYearId);

        return $this->success(null, 'Vehicle detached successfully');
    }

    public function quickLookup(Request $request): JsonResponse
    {
        $q = strtolower(trim($request->query('q', '')));

        if (empty($q)) {
            return $this->success([]);
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

        return $this->success($results);
    }
}
