<?php

namespace App\Presentation\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  Request  $request
     * @return array
     */
    public function toArray($request)
    {
        $user = $request->user();
        $meta = $user ? ($user->role->meta_attributes ?? []) : [];
        $canViewCost = $meta['can_view_cost'] ?? true; // Defaults to true unless explicitly restricted
        $canViewProfit = $meta['can_view_profit'] ?? true;

        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'type' => $this->type,
            'status' => $this->status,
            'total_amount' => $this->total_amount,
            'tax_amount' => $this->tax_amount,

            // Field-Level Security: Only return these if the user's role explicitly allows it
            'cost_amount' => $this->when($canViewCost, $this->cost_amount),
            'profit_margin' => $this->when($canViewProfit, $this->profit_margin),

            'branch_id' => $this->branch_id,
            'cost_center_id' => $this->cost_center_id,
            'currency_id' => $this->currency_id,
            'exchange_rate' => $this->exchange_rate,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
