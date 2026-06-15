<?php
namespace App\Presentation\Requests\Treasury;

use Illuminate\Foundation\Http\FormRequest;

class TransferRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'from_safe_id' => 'required|uuid|exists:tenant.safes,id|different:to_safe_id',
            'to_safe_id'   => 'required|uuid|exists:tenant.safes,id',
            'amount'       => 'required|numeric|min:0.01',
            'description'  => 'nullable|string',
        ];
    }
}
