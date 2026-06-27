<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Exports;

use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use App\Domain\Inventory\Exports\Sheets\ProductsTemplateSheet;
use App\Domain\Inventory\Exports\Sheets\InstructionsSheet;
use App\Domain\Inventory\Exports\Sheets\LookupsSheet;

class ProductTemplateExport implements WithMultipleSheets
{
    use Exportable;

    private string $tenantId;

    public function __construct(string $tenantId)
    {
        $this->tenantId = $tenantId;
    }

    public function sheets(): array
    {
        return [
            new InstructionsSheet(),
            new ProductsTemplateSheet($this->tenantId),
            new LookupsSheet($this->tenantId),
        ];
    }
}
