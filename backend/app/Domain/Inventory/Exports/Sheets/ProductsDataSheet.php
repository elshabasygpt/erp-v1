<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Exports\Sheets;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\InventoryCategoryModel;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Protection;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use Illuminate\Database\Eloquent\Builder;

class ProductsDataSheet implements FromQuery, WithHeadings, WithMapping, ShouldAutoSize, WithEvents, WithColumnFormatting, WithTitle
{
    private string $tenantId;
    private array $categories = [];
    private ?array $productIds;
    private ?string $searchQuery;
    private ?string $categoryId;
    private ?string $isActive;
    private ?string $brand;
    private ?string $supplierId;
    private ?string $warehouseId;

    public function __construct(
        string $tenantId, 
        ?array $productIds = null, 
        ?string $searchQuery = null, 
        ?string $categoryId = null,
        ?string $isActive = null,
        ?string $brand = null,
        ?string $supplierId = null,
        ?string $warehouseId = null
    ) {
        $this->tenantId = $tenantId;
        $this->productIds = $productIds;
        $this->searchQuery = $searchQuery;
        $this->categoryId = $categoryId;
        $this->isActive = $isActive;
        $this->brand = $brand;
        $this->supplierId = $supplierId;
        $this->warehouseId = $warehouseId;

        $cats = InventoryCategoryModel::where('tenant_id', $tenantId)->get(['id', 'name']);
        foreach ($cats as $c) {
            $this->categories[$c->id] = $c->name;
        }
    }

    public function title(): string
    {
        return 'Products Data';
    }

    public function query()
    {
        $query = ProductModel::query()
            ->where('tenant_id', $this->tenantId)
            ->with(['aliases', 'customerAliases.customer', 'warehouseStocks', 'compatibleVehicles.vehicleModel.make']);

        if (!empty($this->productIds)) {
            $query->whereIn('id', $this->productIds);
        } else {
            if ($this->searchQuery) {
                $query->where(function (Builder $q) {
                    $q->where('name', 'like', '%' . $this->searchQuery . '%')
                      ->orWhere('name_ar', 'like', '%' . $this->searchQuery . '%')
                      ->orWhere('sku', 'like', '%' . $this->searchQuery . '%')
                      ->orWhere('barcode', 'like', '%' . $this->searchQuery . '%');
                });
            }
            if ($this->categoryId) {
                $query->where('category_id', $this->categoryId);
            }
            if ($this->isActive !== null && $this->isActive !== '') {
                $query->where('is_active', filter_var($this->isActive, FILTER_VALIDATE_BOOLEAN));
            }
            if ($this->brand) {
                $query->where('brand', $this->brand);
            }
            if ($this->supplierId) {
                $query->whereHas('allSuppliers', function ($q) {
                    $q->where('supplier_id', $this->supplierId);
                });
            }
            if ($this->warehouseId) {
                $query->whereHas('warehouseStocks', function ($q) {
                    $q->where('warehouse_id', $this->warehouseId);
                });
            }
        }

        return $query;
    }

    public function headings(): array
    {
        return [
            // Hidden System Columns
            'Product UUID',
            'Tenant UUID',
            'ERP Version',
            'Template Version',
            'Schema Version',
            'Row Hash (SHA256)',
            
            // Visible Columns
            'Product Code',
            'Barcode',
            'SKU',
            'Arabic Name',
            'English Name',
            'Alternative Names',
            'Customer Aliases',
            'Category',
            'Brand',
            'Unit',
            'Purchase Price',
            'Sale Price',
            'Wholesale Price',
            'Cost Price',
            'Minimum Stock',
            'Maximum Stock',
            'Tax',
            'OEM',
            'Vehicle Compatibility',
            'Description',
            'Status',
            'Created At',
            'Updated At',
        ];
    }

    public function map($product): array
    {
        $categoryName = '';
        if ($product->category_id && isset($this->categories[$product->category_id])) {
            $categoryName = $this->categories[$product->category_id];
        }

        $alternativeNames = $product->aliases ? $product->aliases->pluck('alias_name')->join(' | ') : '';
        $customerAliases = $product->customerAliases ? $product->customerAliases->map(function ($ca) {
            return ($ca->customer ? $ca->customer->name : 'Unknown') . '=' . $ca->alias_name;
        })->join(' | ') : '';

        $vehicles = $product->compatibleVehicles ? $product->compatibleVehicles->map(function ($v) {
            return ($v->vehicleModel->make->name ?? '') . ' ' . ($v->vehicleModel->name ?? '') . ' (' . $v->year . ')';
        })->join(' | ') : '';
        
        $rowHash = hash('sha256', $product->id . ($product->updated_at ? $product->updated_at->timestamp : ''));

        $row = [
            // Hidden System Columns
            $product->id,
            $product->tenant_id,
            '1.0.0', // ERP Version
            '1.1',   // Template Version
            '1.1',   // Schema Version
            $rowHash,

            // Visible Columns
            $product->sku, // Product Code
            $product->barcode,
            $product->sku,
            $product->name_ar,
            $product->name,
            $alternativeNames,
            $customerAliases,
            $categoryName,
            $product->brand,
            $product->unit_of_measure,
            $product->cost_price, // Purchase Price
            $product->sell_price,
            $product->wholesale_price,
            $product->cost_price, // Cost Price
            $product->stock_alert_level, // Minimum Stock
            '', // Maximum Stock
            $product->vat_rate, // Tax
            $product->oem_number,
            $vehicles,
            $product->description,
            $product->is_active ? 'Active' : 'Inactive',
            $product->created_at ? $product->created_at->format('Y-m-d H:i:s') : '',
            $product->updated_at ? $product->updated_at->format('Y-m-d H:i:s') : '',
        ];

        // Enterprise Security: Prevent CSV/Excel Formula Injection
        return array_map(function ($value) {
            if (is_string($value) && preg_match('/^[\=\+\-\@]/', $value)) {
                return "'" . $value;
            }
            return $value;
        }, $row);
    }

    public function columnFormats(): array
    {
        return [
            'Q' => NumberFormat::FORMAT_NUMBER_00, // Purchase Price
            'R' => NumberFormat::FORMAT_NUMBER_00, // Sale Price
            'S' => NumberFormat::FORMAT_NUMBER_00, // Wholesale Price
            'T' => NumberFormat::FORMAT_NUMBER_00, // Cost Price
            'W' => NumberFormat::FORMAT_NUMBER_00, // Tax
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                
                // Hide system columns A to F
                $sheet->getColumnDimension('A')->setVisible(false);
                $sheet->getColumnDimension('B')->setVisible(false);
                $sheet->getColumnDimension('C')->setVisible(false);
                $sheet->getColumnDimension('D')->setVisible(false);
                $sheet->getColumnDimension('E')->setVisible(false);
                $sheet->getColumnDimension('F')->setVisible(false);
                
                // Freeze the header
                $sheet->freezePane('A2');
                
                // Enable AutoFilters for all columns
                $dimension = $sheet->calculateWorksheetDimension();
                $sheet->setAutoFilter($dimension);

                // Style the header row
                $headerRange = 'A1:AC1'; // 29 columns (A to AC)
                $sheet->getStyle($headerRange)->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'color' => ['argb' => Color::COLOR_WHITE],
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['argb' => 'FF1F4E78'], // Dark blue color
                    ],
                ]);

                // Protection
                $sheet->getParent()->getSecurity()->setLockWindows(true);
                $sheet->getParent()->getSecurity()->setLockStructure(true);
                
                $sheet->getProtection()->setSheet(true);
                $sheet->getProtection()->setPassword('secret123'); // Prevent accidental unlock
                
                // Unlock everything except Row 1 (up to 1000 rows)
                $sheet->getStyle('A2:AC1000')->getProtection()->setLocked(Protection::PROTECTION_UNPROTECTED);
                // Lock Row 1 explicitly
                $sheet->getStyle('A1:AC1')->getProtection()->setLocked(Protection::PROTECTION_PROTECTED);

                // Add Header Comments
                $sheet->getComment('I1')->getText()->createTextRun('Stock Keeping Unit. Must be unique.');
                $sheet->getComment('L1')->getText()->createTextRun('Separate multiple aliases using | (e.g. Name1|Name2|Name3)');
                $sheet->getComment('M1')->getText()->createTextRun('Format: CustomerName=AliasName|Customer2=Alias2');
                $sheet->getComment('N1')->getText()->createTextRun('Must match a Category from the Lookups sheet.');
                $sheet->getComment('O1')->getText()->createTextRun('Must match a Brand from the Lookups sheet.');
                $sheet->getComment('P1')->getText()->createTextRun('Must match a Unit from the Lookups sheet.');

                // DATA VALIDATION
                $catCount = InventoryCategoryModel::where('tenant_id', $this->tenantId)->count();
                $unitCount = class_exists(\App\Infrastructure\Eloquent\Models\ProductUnitModel::class) ? \App\Infrastructure\Eloquent\Models\ProductUnitModel::where('tenant_id', $this->tenantId)->count() : 0;
                $brandCount = ProductModel::where('tenant_id', $this->tenantId)->whereNotNull('brand')->distinct()->count('brand');
                
                // Category Validation (Column N)
                if ($catCount > 0) {
                    $validationCat = $sheet->getCell('N2')->getDataValidation();
                    $validationCat->setType(DataValidation::TYPE_LIST)
                        ->setErrorStyle(DataValidation::STYLE_STOP)
                        ->setAllowBlank(true)
                        ->setShowDropDown(true)
                        ->setErrorTitle('Invalid Category')
                        ->setError('Please select a category from the dropdown list.')
                        ->setFormula1('Lookups!$A$2:$A$' . ($catCount + 1));
                    
                    for ($i = 2; $i <= 1000; $i++) {
                        $sheet->getCell("N{$i}")->setDataValidation(clone $validationCat);
                    }
                }

                // Brand Validation (Column O)
                if ($brandCount > 0) {
                    $validationBrand = $sheet->getCell('O2')->getDataValidation();
                    $validationBrand->setType(DataValidation::TYPE_LIST)
                        ->setErrorStyle(DataValidation::STYLE_STOP)
                        ->setAllowBlank(true)
                        ->setShowDropDown(true)
                        ->setErrorTitle('Invalid Brand')
                        ->setError('Please select a brand from the dropdown list.')
                        ->setFormula1('Lookups!$C$2:$C$' . ($brandCount + 1));
                    
                    for ($i = 2; $i <= 1000; $i++) {
                        $sheet->getCell("O{$i}")->setDataValidation(clone $validationBrand);
                    }
                }

                // Unit Validation (Column P)
                if ($unitCount > 0) {
                    $validationUnit = $sheet->getCell('P2')->getDataValidation();
                    $validationUnit->setType(DataValidation::TYPE_LIST)
                        ->setErrorStyle(DataValidation::STYLE_STOP)
                        ->setAllowBlank(true)
                        ->setShowDropDown(true)
                        ->setErrorTitle('Invalid Unit')
                        ->setError('Please select a unit from the dropdown list.')
                        ->setFormula1('Lookups!$B$2:$B$' . ($unitCount + 1));
                    
                    for ($i = 2; $i <= 1000; $i++) {
                        $sheet->getCell("P{$i}")->setDataValidation(clone $validationUnit);
                    }
                }
            },
        ];
    }
}
