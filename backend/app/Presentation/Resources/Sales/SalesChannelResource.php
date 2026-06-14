<?php

namespace App\Presentation\Resources\Sales;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SalesChannelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->getId(),
            'name' => $this->getName(),
            'code' => $this->getCode(),
            'type' => $this->getType(),
            'pricing_method' => $this->getPricingMethod(),
            'markup_percentage' => $this->getMarkupPercentage(),
            'fixed_markup' => $this->getFixedMarkup(),
            'apply_before_tax' => $this->isApplyBeforeTax(),
            'is_active' => $this->isActive(),
            'sort_order' => $this->getSortOrder(),
            'logo_url' => $this->getLogoUrl(),
        ];
    }
}
