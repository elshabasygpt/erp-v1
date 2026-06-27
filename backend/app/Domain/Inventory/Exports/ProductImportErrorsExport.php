<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProductImportErrorsExport implements FromArray, WithHeadings, WithStyles
{
    protected array $failedRows;

    public function __construct(array $failedRows)
    {
        $this->failedRows = $failedRows;
    }

    public function array(): array
    {
        $exportData = [];
        
        foreach ($this->failedRows as $failure) {
            $rowNum = $failure['row'] ?? 'Unknown';
            $attribute = $failure['attribute'] ?? '';
            $errors = is_array($failure['errors']) ? implode(' | ', $failure['errors']) : ($failure['errors'] ?? 'Validation Error');
            $providedValue = '';
            
            if (isset($failure['values']) && is_array($failure['values'])) {
                // If it's an array of values, maybe we just json_encode it or show the specific attribute
                $val = $failure['values'][$attribute] ?? '';
                $providedValue = is_array($val) ? json_encode($val) : (string)$val;
            }

            $row = [
                $rowNum,
                $attribute,
                $errors,
                $providedValue
            ];
            
            // Enterprise Security: Prevent CSV/Excel Formula Injection
            $exportData[] = array_map(function ($value) {
                if (is_string($value) && preg_match('/^[\=\+\-\@]/', $value)) {
                    return "'" . $value;
                }
                return $value;
            }, $row);
        }

        return $exportData;
    }

    public function headings(): array
    {
        return [
            'Row Number',
            'Field (Attribute)',
            'Error Details',
            'Provided Value'
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']], 'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FFCC0000']]],
        ];
    }
}
