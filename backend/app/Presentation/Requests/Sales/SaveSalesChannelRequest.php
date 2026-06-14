<?php

namespace App\Presentation\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveSalesChannelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('channel');

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', Rule::unique('sales_channels')->ignore($id)],
            'type' => ['required', 'string', 'max:100'],
            'pricing_method' => ['required', 'string', Rule::in(['percentage', 'fixed'])],
            'markup_percentage' => ['required_if:pricing_method,percentage', 'numeric', 'min:0', 'max:100'],
            'fixed_markup' => ['required_if:pricing_method,fixed', 'numeric', 'min:0'],
            'apply_before_tax' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
            'logo_url' => ['nullable', 'string', 'url', 'max:2048'],
        ];
    }
}
