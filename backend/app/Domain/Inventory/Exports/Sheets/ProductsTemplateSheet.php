<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Style\Protection;
use App\Infrastructure\Eloquent\Models\InventoryCategoryModel;
use App\Infrastructure\Eloquent\Models\ProductModel;

class ProductsTemplateSheet implements FromArray, WithTitle, WithEvents, WithColumnFormatting
{
    private string $tenantId;

    public function __construct(string $tenantId)
    {
        $this->tenantId = $tenantId;
    }

    public function array(): array
    {
        return [
            // Row 1: Headers
            [
                // Hidden System Columns
                'Product UUID', 'Tenant UUID', 'ERP Version', 'Template Version', 'Schema Version', 'Row Hash (SHA256)',
                
                // Visible Columns
                'Product Code', 'Barcode', 'SKU', 'Arabic Name', 'English Name', 'Alternative Names', 'Customer Aliases', 
                'Category', 'Brand', 'Unit', 'Purchase Price', 'Sale Price', 'Wholesale Price', 'Cost Price', 
                'Minimum Stock', 'Maximum Stock', 'Tax', 'OEM', 'Vehicle Compatibility', 'Description', 'Status', 
                'Created At', 'Updated At'
            ],
            // Row 2: Sample 1
            [
                '', '', '1.0.0', '1.1', '1.1', '',
                'TEST-001', '1234567890123', 'TEST-001', 'منتج تجريبي 1', 'Sample Product 1', '', '',
                '', 'SampleBrand', 'Piece', '100.00', '150.00', '140.00', '100.00', 
                '10', '100', '15', 'OEM-001', '', 'Sample description', 'Active',
                '', ''
            ],
            // Row 3: Sample 2
            [
                '', '', '1.0.0', '1.1', '1.1', '',
                'TEST-002', '9876543210987', 'TEST-002', 'منتج تجريبي 2', 'Sample Product 2', 'Alt-Name1|بديل 1|OEM-A', 'Customer A=تيل فرامل A5|Customer B=Brake Pad A4',
                '', 'SampleBrand', 'Box', '200.00', '250.00', '240.00', '200.00', 
                '5', '50', '0', 'OEM-002', '', '', 'Active',
                '', ''
            ]
        ];
    }

    public function title(): string
    {
        return 'Products';
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
            AfterSheet::class => function(AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                // Hide system columns A to F
                $sheet->getColumnDimension('A')->setVisible(false);
                $sheet->getColumnDimension('B')->setVisible(false);
                $sheet->getColumnDimension('C')->setVisible(false);
                $sheet->getColumnDimension('D')->setVisible(false);
                $sheet->getColumnDimension('E')->setVisible(false);
                $sheet->getColumnDimension('F')->setVisible(false);

                // Style Headers (A to AC = 29 columns)
                $sheet->getStyle('A1:AC1')->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFF']],
                    'fill' => [
                        'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                        'startColor' => ['argb' => 'FF1F4E78'] // Matches ProductsDataSheet
                    ]
                ]);

                // Protection
                $sheet->getParent()->getSecurity()->setLockWindows(true);
                $sheet->getParent()->getSecurity()->setLockStructure(true);
                
                $sheet->getProtection()->setSheet(true);
                $sheet->getProtection()->setPassword('secret123'); // Prevent accidental unlock
                
                // Unlock everything except Row 1 (up to 1000 rows to save memory)
                $sheet->getStyle('A2:AC1000')->getProtection()->setLocked(Protection::PROTECTION_UNPROTECTED);
                // Lock Row 1 explicitly
                $sheet->getStyle('A1:AC1')->getProtection()->setLocked(Protection::PROTECTION_PROTECTED);

                // Freeze Pane
                $sheet->freezePane('A2');

                // Auto Filters
                $dimension = $sheet->calculateWorksheetDimension();
                $sheet->setAutoFilter($dimension);

                // Add Header Comments
                $sheet->getComment('I1')->getText()->createTextRun('Stock Keeping Unit. Must be unique.');
                $sheet->getComment('L1')->getText()->createTextRun('Separate multiple aliases using | (e.g. Name1|Name2|Name3)');
                $sheet->getComment('M1')->getText()->createTextRun('Format: CustomerName=AliasName|Customer2=Alias2');
                $sheet->getComment('N1')->getText()->createTextRun('Must match a Category from the Lookups sheet.');
                $sheet->getComment('O1')->getText()->createTextRun('Must match a Brand from the Lookups sheet.');
                $sheet->getComment('P1')->getText()->createTextRun('Must match a Unit from the Lookups sheet.');

                // Auto-size visible columns
                foreach (range('G', 'Z') as $col) {
                    $sheet->getColumnDimension($col)->setAutoSize(true);
                }
                $sheet->getColumnDimension('AA')->setAutoSize(true);
                $sheet->getColumnDimension('AB')->setAutoSize(true);
                $sheet->getColumnDimension('AC')->setAutoSize(true);

                // DATA VALIDATION
                
                // Get counts to set formula boundaries accurately
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
