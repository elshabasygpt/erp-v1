<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\CRM;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\CRM\CustomerNoteModel;
use App\Infrastructure\Eloquent\Models\CRM\CustomerInteractionModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CustomerInteractionController extends BaseController
{
    public function addNote(Request $request, string $customerId): JsonResponse
    {
        $customer = CustomerModel::find($customerId);
        if (!$customer) {
            return $this->error('Customer not found', 404);
        }

        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $note = CustomerNoteModel::create([
            'id' => Str::uuid()->toString(),
            'customer_id' => $customerId,
            'user_id' => auth()->id() ?? '', // fallback for testing
            'content' => $validated['content'],
        ]);

        return $this->created($note->toArray(), 'Customer note added successfully');
    }

    public function addInteraction(Request $request, string $customerId): JsonResponse
    {
        $customer = CustomerModel::find($customerId);
        if (!$customer) {
            return $this->error('Customer not found', 404);
        }

        $validated = $request->validate([
            'type' => 'required|string|in:call,email,meeting,whatsapp',
            'description' => 'nullable|string',
            'interaction_date' => 'required|date',
        ]);

        $interaction = CustomerInteractionModel::create([
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
