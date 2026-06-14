<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Analytics;

use App\Presentation\Controllers\API\BaseController;
use App\Domain\Inventory\Services\InventoryForecastingService;
use App\Domain\Partnerships\Services\PartnerForecastingService;
use App\Domain\Purchases\Services\SmartPurchaseDrafter;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ForecastingController extends BaseController
{
    public function __construct(
        private InventoryForecastingService $inventoryForecaster,
        private PartnerForecastingService $partnerForecaster,
        private SmartPurchaseDrafter $purchaseDrafter
    ) {}

    public function getInventoryForecast(Request $request): JsonResponse
    {
        $threshold = (int) $request->get('threshold', 10);
        $forecasts = $this->inventoryForecaster->getLowStockForecasts($threshold);

        return $this->success([
            'alerts_count' => count($forecasts),
            'forecasts' => $forecasts
        ]);
    }

    public function autoDraftPurchaseOrder(Request $request): JsonResponse
    {
        $request->validate([
            'warehouse_id' => 'required|uuid'
        ]);

        try {
            $result = $this->purchaseDrafter->generateDraftPurchaseInvoice(
                $request->get('warehouse_id'),
                $request->user()->id
            );

            return $this->success($result);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    public function getPartnerForecast(): JsonResponse
    {
        try {
            $projections = $this->partnerForecaster->getEndOfYearProjections();
            return $this->success($projections);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }
}
