<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ProductLabelController extends BaseTenantController
{
    /**
     * Return a print-ready HTML page for one or more product labels.
     *
     * GET /inventory/products/{id}/label?qty=1
     * GET /inventory/products/labels?ids[]=uuid1&ids[]=uuid2&qty=1
     *
     * Opens directly in the browser — window.print() is triggered automatically.
     * Uses the "Libre Barcode 128" Google Font so no library is required.
     */
    public function single(Request $request, string $id): Response
    {
        $tenantId = $this->getTenantId($request);
        $qty      = max(1, min(100, (int) $request->query('qty', 1)));

        $product = ProductModel::query()
            ->where('tenant_id', $tenantId)
            ->findOrFail($id);

        return response($this->_buildHtml([$product], $qty), 200)
            ->header('Content-Type', 'text/html; charset=utf-8');
    }

    /** Bulk label print: POST /inventory/labels  body: {ids: [...], qty: 1} */
    public function bulk(Request $request): Response
    {
        $tenantId  = $this->getTenantId($request);
        $validated = $request->validate([
            'ids'   => 'required|array|min:1|max:100',
            'ids.*' => 'uuid',
            'qty'   => 'nullable|integer|min:1|max:50',
        ]);

        $qty      = $validated['qty'] ?? 1;
        $products = ProductModel::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $validated['ids'])
            ->get();

        return response($this->_buildHtml($products->all(), $qty), 200)
            ->header('Content-Type', 'text/html; charset=utf-8');
    }

    // -----------------------------------------------------------------------

    private function _buildHtml(array $products, int $qty): string
    {
        $labels = '';
        foreach ($products as $product) {
            $barcodeVal = htmlspecialchars($product->barcode ?: $product->sku ?: $product->id, ENT_QUOTES);
            $name       = htmlspecialchars($product->name, ENT_QUOTES);
            $sku        = htmlspecialchars($product->sku ?? '', ENT_QUOTES);
            $oem        = $product->oem_number ? htmlspecialchars($product->oem_number, ENT_QUOTES) : '';

            $single = <<<LABEL
<div class="label">
  <div class="product-name">{$name}</div>
  <div class="barcode">{$barcodeVal}</div>
  <div class="barcode-text">{$barcodeVal}</div>
  <div class="meta">SKU: {$sku}
LABEL;
            if ($oem) {
                $single .= " &nbsp;|&nbsp; OEM: {$oem}";
            }
            $single .= "</div></div>\n";

            for ($i = 0; $i < $qty; $i++) {
                $labels .= $single;
            }
        }

        return <<<HTML
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>طباعة ملصقات المنتجات</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128+Text&family=Cairo:wght@400;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; background: #fff; }
  .grid { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px; }
  .label {
    width: 90mm; min-height: 40mm; padding: 6px 8px;
    border: 1px solid #ccc; border-radius: 4px;
    display: flex; flex-direction: column; align-items: center;
    page-break-inside: avoid;
  }
  .product-name {
    font-size: 11pt; font-weight: 600; text-align: center;
    margin-bottom: 2px; max-width: 100%; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
  }
  .barcode {
    font-family: 'Libre Barcode 128 Text', cursive;
    font-size: 42pt; line-height: 1; color: #000;
    max-width: 100%; overflow: hidden;
  }
  .barcode-text { font-size: 7pt; letter-spacing: 2px; color: #333; margin-top: 1px; }
  .meta { font-size: 7.5pt; color: #555; margin-top: 3px; text-align: center; }
  @media print {
    body { margin: 0; }
    .no-print { display: none; }
    .grid { padding: 4px; gap: 4px; }
    .label { border-color: #999; }
  }
</style>
</head>
<body onload="window.print()">
<div class="no-print" style="padding:12px;background:#f0f0f0;text-align:center;font-family:sans-serif;">
  <strong>معاينة الطباعة</strong> — ستفتح نافذة الطباعة تلقائياً.
  <button onclick="window.print()" style="margin-right:12px;padding:6px 16px;cursor:pointer;">طباعة الآن</button>
</div>
<div class="grid">
{$labels}
</div>
</body>
</html>
HTML;
    }
}
