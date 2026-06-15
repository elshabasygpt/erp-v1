<?php
namespace App\Presentation\Requests\HR;

use Illuminate\Foundation\Http\FormRequest;

class GeneratePayrollRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'period_start'           => 'required|date',
            'period_end'             => 'required|date|after:period_start',
            'working_days_in_month'  => 'required|integer|min:20|max:31',
        ];
    }
}
