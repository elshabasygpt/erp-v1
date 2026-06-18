<?php

namespace App\Presentation\Requests\Treasury;

use Illuminate\Foundation\Http\FormRequest;

class StoreSafeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'type' => 'required|in:cash,bank',
            'balance' => 'nullable|numeric',
        ];
    }
}
