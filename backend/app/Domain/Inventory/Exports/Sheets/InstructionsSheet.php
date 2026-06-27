<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class InstructionsSheet implements FromArray, WithTitle, WithStyles
{
    public function array(): array
    {
        return [
            ['إرشادات هامة لاستيراد المنتجات (Important Instructions)'],
            [''],
            ['1. الحقول الإلزامية (Required Fields):'],
            ['   - يجب إدخال "اسم المنتج" (Product Name) و "السعر" (Sell Price) كحد أدنى.'],
            [''],
            ['2. منع التكرار والمطابقة (Matching & Duplicates):'],
            ['   - لضمان عدم إنشاء منتجات مكررة، سيقوم النظام بالبحث عن المنتجات الموجودة مسبقاً بالترتيب التالي:'],
            ['     الباركود (Barcode) -> كود المنتج (SKU) -> رقم القطعة (Part Number) -> رقم المصنع (OEM).'],
            ['   - إذا تم العثور على تطابق، سيتم تحديث المنتج الحالي بدلاً من إنشاء منتج جديد.'],
            [''],
            ['3. القوائم المنسدلة (Dropdowns):'],
            ['   - يرجى اختيار القسم (Category) والوحدة (Unit) والعلامة التجارية (Brand) من القوائم المنسدلة المتاحة.'],
            ['   - النظام سيرفض أي قيمة يتم إدخالها يدوياً إذا لم تكن موجودة في حسابك لتجنب الأخطاء الإملائية.'],
            [''],
            ['4. حماية البيانات (Protected Headers):'],
            ['   - الصف الأول (عناوين الأعمدة) محمي ولا يمكن تعديله لضمان نجاح عملية الاستيراد.'],
            [''],
            ['5. البيانات الرقمية (Numeric Data):'],
            ['   - الأسعار (Price/Cost) والمخزون (Stock) ونسبة الضريبة (VAT) يجب أن تكون أرقاماً فقط.'],
            [''],
            ['ملاحظة: يمكنك مسح الأمثلة الموجودة في ورقة "Products" والبدء في إدخال بياناتك.']
        ];
    }

    public function title(): string
    {
        return 'Instructions';
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->getColumnDimension('A')->setWidth(100);
        
        return [
            1 => ['font' => ['bold' => true, 'size' => 14, 'color' => ['argb' => 'FF0000']]],
            3 => ['font' => ['bold' => true]],
            6 => ['font' => ['bold' => true]],
            11 => ['font' => ['bold' => true]],
            15 => ['font' => ['bold' => true]],
            18 => ['font' => ['bold' => true]],
            21 => ['font' => ['italic' => true, 'color' => ['argb' => '555555']]],
        ];
    }
}
