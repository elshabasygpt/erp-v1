<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\CRM;

use App\Infrastructure\Eloquent\Models\CRM\CustomerInteractionModel;
use App\Infrastructure\Eloquent\Models\CRM\CustomerNoteModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CustomerInteractionController extends BaseTenantController
{
    public function addNote(Request $request, string $customerId): JsonResponse
    {
        $customer = CustomerModel::query()->where('tenant_id', $this->getTenantId($request))->find($customerId);
        if (! $customer) {
            return $this->error('Customer not found', 404);
        }

        $validated['tenant_id'] = $this->getTenantId($request);
        $note = CustomerNoteModel::query()->create([
            'tenant_id' => $this->getTenantId($request),
            'id' => Str::uuid()->toString(),
            'customer_id' => $customerId,
            'user_id' => auth()->id() ?? '', // fallback for testing
            'content' => $validated['content'],
        ]);

        return $this->created($note->toArray(), 'Customer note added successfully');
    }

    public function addInteraction(Request $request, string $customerId): JsonResponse
    {
        $customer = CustomerModel::query()->where('tenant_id', $this->getTenantId($request))->find($customerId);
        if (! $customer) {
            return $this->error('Customer not found', 404);
        }

        $validated['tenant_id'] = $this->getTenantId($request);
        $interaction = CustomerInteractionModel::query()->create([
            'tenant_id' => $this->getTenantId($request),
            'id' => Str::uuid()->toString(),
            'customer_id' => $customerId,
            'user_id' => auth()->id() ?? '',
            'type' => $validated['type'],
            'description' => $validated['description'] ?? null,
            'interaction_date' => $validated['interaction_date'],
        ]);

        return $this->created($interaction->toArray(), 'Customer interaction recorded successfully');
    }
}
