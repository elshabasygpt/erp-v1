<?php

namespace App\Presentation\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdateInvoiceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $invoice = $this->route('invoice'); // Assuming the parameter is bound
        
        // This leverages the dynamic InvoicePolicy we just created!
        // It checks Row-Level (Branch & Ownership) automatically via Gate.
        if ($invoice) {
            return Gate::check('update', $invoice);
        }
        
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $user = $this->user();
        $meta = $user ? ($user->role->meta_attributes ?? []) : [];
        $canEditDiscount = $meta['can_edit_discount'] ?? true;

        $rules = [
            'status' => 'sometimes|string|in:draft,paid,cancelled',
            'notes' => 'nullable|string',
        ];

        // Field-Level Mutability Security
        // Only allow validating/updating the discount if the role actually permits it
        if ($canEditDiscount) {
            $rules['discount_amount'] = 'sometimes|numeric|min:0';
            $rules['discount_pct'] = 'sometimes|numeric|min:0|max:100';
        }

        return $rules;
    }

    /**
     * Prepare the data for validation.
     * Strip fields that the user shouldn't even be posting.
     */
    protected function prepareForValidation()
    {
        $user = $this->user();
        $meta = $user ? ($user->role->meta_attributes ?? []) : [];
        $canEditDiscount = $meta['can_edit_discount'] ?? true;

        if (!$canEditDiscount && ($this->has('discount_amount') || $this->has('discount_pct'))) {
            // Strip the unauthorized fields gracefully before validation
            $this->request->remove('discount_amount');
            $this->request->remove('discount_pct');
        }
    }
}
