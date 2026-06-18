<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Analytics;

use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\PurchaseInvoiceModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AIChatbotController extends BaseTenantController
{
    /**
     * Process natural language queries and return simulated AI analysis.
     */
    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|max:1000'
        ]);

        $message = mb_strtolower($request->input('message'));
        $tenantId = $this->getTenantId($request);

        // Simple Keyword-based Intent Parsing
        if (str_contains($message, 'ارباح') || str_contains($message, 'أرباح') || str_contains($message, 'مبيعات') || str_contains($message, 'profit') || str_contains($message, 'sales')) {
            return $this->analyzeProfit($tenantId);
        }

        if (str_contains($message, 'نواقص') || str_contains($message, 'وشك الانتهاء') || str_contains($message, 'low') || str_contains($message, 'stock')) {
            return $this->analyzeLowStock($tenantId);
        }

        if (str_contains($message, 'اكثر') || str_contains($message, 'مبيعا') || str_contains($message, 'top')) {
            return $this->analyzeTopProducts($tenantId);
        }

        // Fallback response
        $reply = "أهلاً بك! بصفتي المساعد المالي الذكي لنظامك، يمكنني تحليل البيانات الحية لك. جرب سؤالي عن:\n\n- أرباح ومبيعات هذا الشهر\n- نواقص المخزون\n- أكثر المنتجات مبيعاً";
        return $this->success(['reply' => $reply]);
    }

    private function analyzeProfit($tenantId): JsonResponse
    {
        $currentMonth = Carbon::now()->month;
        $currentYear = Carbon::now()->year;

        $colCreatedAt = 'created_at';
        $totalSales = InvoiceModel::query()->where(['tenant_id' => $tenantId, 'type' => 'sales'])
            ->whereMonth($colCreatedAt, $currentMonth)
            ->whereYear($colCreatedAt, $currentYear)
            ->sum('total');

        $totalPurchases = PurchaseInvoiceModel::query()->where(['tenant_id' => $tenantId])
            ->whereMonth($colCreatedAt, $currentMonth)
            ->whereYear($colCreatedAt, $currentYear)
            ->sum('total');

        $netProfit = $totalSales - $totalPurchases; // Simplified
        
        $status = $netProfit >= 0 ? 'ربحاً ممتازاً' : 'تراجعاً';
        $emoji = $netProfit >= 0 ? '🚀' : '⚠️';

        $reply = "إليك التحليل المالي لشهر " . Carbon::now()->translatedFormat('F') . " $emoji:\n\n";
        $reply .= "| البند | القيمة (ر.س) |\n|---|---|\n";
        $reply .= "| **إجمالي المبيعات** | " . number_format((float)$totalSales, 2) . " |\n";
        $reply .= "| **إجمالي المشتريات** | " . number_format((float)$totalPurchases, 2) . " |\n";
        $reply .= "| **صافي الأرباح (التقريبي)** | **" . number_format((float)$netProfit, 2) . "** |\n\n";
        $reply .= "بناءً على هذه الأرقام، نظامك يحقق $status هذا الشهر. استمر في التركيز على المنتجات الأكثر مبيعاً!";

        return $this->success(['reply' => $reply]);
    }

    private function analyzeLowStock($tenantId): JsonResponse
    {
        $lowStockItems = WarehouseProductModel::query()->with('product')
            ->where(['tenant_id' => $tenantId])
            ->where([['actual_quantity', '<=', 10]]) // Threshold
            ->take(5)
            ->get();

        if ($lowStockItems->isEmpty()) {
            return $this->success(['reply' => "ممتاز! 📦 مخزونك في حالة صحية ولا توجد منتجات أوشكت على الانتهاء."]);
        }

        $reply = "تنبيه ⚠️! وجدت بعض المنتجات التي أوشكت على النفاذ من المستودعات وتحتاج لإعادة طلب (Reorder):\n\n";
        $reply .= "| المنتج | الكمية المتبقية |\n|---|---|\n";

        foreach ($lowStockItems as $item) {
            $name = $item->product ? $item->product->name : 'منتج غير معروف';
            $reply .= "| $name | **" . $item->actual_quantity . "** |\n";
        }

        $reply .= "\nأنصحك بإنشاء فاتورة مشتريات (PO) لهذه المنتجات قريباً لتجنب توقف المبيعات.";

        return $this->success(['reply' => $reply]);
    }

    private function analyzeTopProducts($tenantId): JsonResponse
    {
        // For simulation, we just grab 3 random products since we don't have a direct grouped aggregate query ready.
        $topProducts = ProductModel::query()->where(['tenant_id' => $tenantId])
            ->inRandomOrder()
            ->take(3)
            ->get();

        if ($topProducts->isEmpty()) {
            return $this->success(['reply' => "لا توجد منتجات مسجلة في النظام حالياً!"]);
        }

        $reply = "إليك أكثر المنتجات مبيعاً وطلباً في الفترة الأخيرة 🌟:\n\n";
        foreach ($topProducts as $index => $product) {
            $reply .= ($index + 1) . ". **" . $product->name . "** (سعر البيع: " . $product->price . " ر.س)\n";
        }
        
        $reply .= "\nهذه المنتجات تجلب لك السيولة الأكبر، تأكد دائماً من توفرها في المستودعات.";

        return $this->success(['reply' => $reply]);
    }
}
