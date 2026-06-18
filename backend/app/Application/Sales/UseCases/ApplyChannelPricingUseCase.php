<?php

namespace App\Application\Sales\UseCases;

use App\Domain\Sales\Entities\SalesChannel;

class ApplyChannelPricingUseCase
{
    public function execute(SalesChannel $channel, array $cartItems): array
    {
        $updatedItems = [];
        $totalMarkup = 0;

        foreach ($cartItems as $item) {
            $basePrice = $item['base_unit_price'];
            $markup = $channel->calculateMarkup($basePrice);

            $adjustedPrice = $basePrice + $markup;
            $totalMarkup += $markup * $item['quantity'];

            $updatedItems[] = array_merge($item, [
                'adjusted_unit_price' => $adjustedPrice,
                'adjustment_amount' => $markup,
                'total_price' => $adjustedPrice * $item['quantity'],
            ]);
        }

        return [
            'items' => $updatedItems,
            'total_markup' => $totalMarkup,
        ];
    }
}
