<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

class BaseController extends Controller
{
    protected function success(mixed $data = null, string $message = 'Success', int $code = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $code);
    }

    protected function error(string $message = 'Error', int $code = 400, mixed $errors = null): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $code);
    }

    protected function paginated(array $paginatedData, string $message = 'Success'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $paginatedData['data'] ?? [],
            'meta' => [
                'current_page' => $paginatedData['current_page'] ?? 1,
                'last_page' => $paginatedData['last_page'] ?? 1,
                'per_page' => $paginatedData['per_page'] ?? 15,
                'total' => $paginatedData['total'] ?? 0,
            ],
        ]);
    }
}
