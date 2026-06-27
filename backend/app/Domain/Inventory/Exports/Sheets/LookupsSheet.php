<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use App\Infrastructure\Eloquent\Models\InventoryCategoryModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class LookupsSheet implements FromArray, WithTitle, WithEvents
{
    private string $tenantId;

    public function __construct(string $tenantId)
    {
        $this->tenantId = $tenantId;
    }

    public function array(): array
    {
        // Fetch Categories
        $categories = InventoryCategoryModel::where('tenant_id', $this->tenantId)->pluck('name')->toArray();
        
        // Fetch Units
        $units = [];
        if (class_exists(\App\Infrastructure\Eloquent\Models\ProductUnitModel::class)) {
            $units = \App\Infrastructure\Eloquent\Models\ProductUnitModel::where('tenant_id', $this->tenantId)->pluck('name')->toArray();
        }

        // Fetch Brands
        $brands = ProductModel::where('tenant_id', $this->tenantId)
            ->whereNotNull('brand')
            ->distinct()
            ->pluck('brand')
            ->toArray();

        // Build columns. Excel needs a matrix. We find the max rows needed.
        $maxRows = max(count($categories), count($units), count($brands), 1);
        $data = [];
        
        // Header
        $data[] = ['Categories', 'Units', 'Brands'];

        for ($i = 0; $i < $maxRows; $i++) {
            $data[] = [
                $categories[$i] ?? '',
                $units[$i] ?? '',
                $brands[$i] ?? '',
            ];
        }

        return $data;
    }

    public function title(): string
    {
        return 'Lookups';
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                // Hide the Lookups sheet
                $event->sheet->getDelegate()->setSheetState(Worksheet::SHEETSTATE_HIDDEN);
            },
        ];
    }
}
