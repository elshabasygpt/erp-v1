<?php

namespace App\Presentation\Requests\Approvals;

use Illuminate\Foundation\Http\FormRequest;

class SaveApprovalRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'entity_type' => 'required|string',
            'trigger_type' => 'required|string',
            'threshold' => 'nullable|numeric',
            'required_role' => 'required|string',
            'is_active' => 'required|boolean',
        ];
    }
}
