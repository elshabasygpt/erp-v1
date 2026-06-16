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
            $make = new VehicleMakeModel($validated);
            $make->tenant_id = $this->getTenantId($request);
            $make->created_by = $request->user()?->id;
            $make->save();
            return $make;
        });

        return $this->success($make, 'Vehicle make created successfully', 201);
    }

    public function storeModel(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'make_id' => 'required|uuid',
            'name' => 'required|string|max:255',
            'name_ar' => 'required|string|max:255',
            'body_type' => 'nullable|string|max:50',
        ]);

        $make = VehicleMakeModel::find($validated['make_id']);
        if (!$make) {
            return $this->error('Make not found', 404);
        }

        $model = DB::connection('tenant')->transaction(function () use ($validated, $request) {
            $modelRecord = new VehicleModelModel($validated);
            $modelRecord->tenant_id = $this->getTenantId($request);
            $modelRecord->created_by = $request->user()?->id;
            $modelRecord->save();
            return $modelRecord;
        });

        return $this->success($model, 'Vehicle model created successfully', 201);
    }

    public function storeYear(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'model_id' => 'required|uuid',
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
            $yearRecord = new VehicleYearModel($validated);
            $yearRecord->tenant_id = $this->getTenantId($request);
            $yearRecord->created_by = $request->user()?->id;
            $yearRecord->save();
            return $yearRecord;
        });

        return $this->success($year, 'Vehicle year created successfully', 201);
    }

    public function searchByVehicle(Request $request): JsonResponse
    {
        $makeId = $request->query('make_id');
        $modelId = $request->query('model_id');
        $year = $request->query('year');
        $warehouseId = $request->query('warehouse_id');

        $productsQuery = ProductModel::where('products.is_active', true)
            ->whereHas('compatibleVehicles', function ($q) use ($makeId, $modelId, $year) {
                if ($modelId) {
                    $q->where('vehicle_years.model_id', $modelId);
                } elseif ($makeId) {
                    $q->whereHas('vehicleModel', function ($modelQ) use ($makeId) {
                        $modelQ->where('make_id', $makeId);
                    });
                }
                
                if ($year) {
                    $yearInt = (int) $year;
                    $q->where('vehicle_years.year_from', '<=', $yearInt)
                      ->where(function ($yearQ) use ($yearInt) {
                          $yearQ->whereNull('vehicle_years.year_to')
                                ->orWhere('vehicle_years.year_to', '>=', $yearInt);
                      });
                }
            })
            ->leftJoin('warehouse_products', function ($join) use ($warehouseId) {
                $join->on('products.id', '=', 'warehouse_products.product_id');
                if ($warehouseId) {
                    $join->where('warehouse_products.warehouse_id', '=', $warehouseId);
                }
            })
            ->select([
                'products.id', 'products.name', 'products.name_ar', 'products.sku', 'products.barcode',
                'products.oem_number', 'products.part_number', 'products.brand', 'products.quality_grade',
                'products.sell_price', 'products.cost_price', 'products.vat_rate', 'products.image_url',
                DB::raw('COALESCE(SUM(warehouse_products.quantity), 0) as stock_quantity')
            ])
            ->groupBy([
                'products.id', 'products.name', 'products.name_ar', 'products.sku', 'products.barcode',
                'products.oem_number', 'products.part_number', 'products.brand', 'products.quality_grade',
                'products.sell_price', 'products.cost_price', 'products.vat_rate', 'products.image_url'
            ]);

        $products = $productsQuery->get();

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
            'vehicle_year_id' => 'required|uuid',
            'notes' => 'nullable|string|max:255',
        ]);

        $year = VehicleYearModel::find($validated['vehicle_year_id']);
        if (!$year) {
            return $this->error('Vehicle year not found', 404);
        }

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

        $terms = explode(' ', strtolower(trim($q)));

        $years = VehicleYearModel::with(['vehicleModel.make'])
            ->where('is_active', true)
            ->whereHas('vehicleModel', function ($modelQ) use ($terms) {
                foreach ($terms as $term) {
                    if (empty(trim($term))) continue;
                    $modelQ->where(function ($subQ) use ($term) {
                        $subQ->where(DB::raw('LOWER(name)'), 'LIKE', "%{$term}%")
                             ->orWhere(DB::raw('LOWER(name_ar)'), 'LIKE', "%{$term}%")
                             ->orWhereHas('make', function ($makeQ) use ($term) {
                                 $makeQ->where(DB::raw('LOWER(name)'), 'LIKE', "%{$term}%")
                                       ->orWhere(DB::raw('LOWER(name_ar)'), 'LIKE', "%{$term}%");
                             });
                    });
                }
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
