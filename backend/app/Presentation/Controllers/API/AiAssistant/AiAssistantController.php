<?php

namespace App\Presentation\Controllers\API\AiAssistant;

use App\Presentation\Controllers\API\BaseController;
use App\Application\AiAssistant\Services\AiAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAssistantController extends BaseController
{
    public function chat(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $service = new AiAssistantService($tenantId);

        $validated = $request->validate([
            'prompt' => 'required|string|max:1000',
        ]);

        try {
            // Simulate AI delay
            usleep(1500000); // 1.5 seconds

            $response = $service->processQuery($validated['prompt']);

            return $this->success([
                'reply' => $response,
            ], 'Chat response generated successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to generate response: ' . $e->getMessage(), 500);
        }
    }
}
