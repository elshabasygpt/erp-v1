<?php

namespace App\Presentation\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class CreateInvoiceRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'customer_id' => ['nullable', 'uuid'],
            'type' => ['required', 'in:cash,credit'],
            'warehouse_id' => ['required', 'uuid'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'uuid'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.vat_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Invoice must have at least one item.',
            'items.min' => 'Invoice must have at least one item.',
            'type.in' => 'Invoice type must be either cash or credit.',
        ];
    }
}
