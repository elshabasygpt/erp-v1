<?php

namespace App\Presentation\Controllers\Sales;

use App\Application\Sales\DTOs\SalesChannelDTO;
use App\Application\Sales\UseCases\CreateSalesChannelUseCase;
use App\Application\Sales\UseCases\DeleteSalesChannelUseCase;
use App\Application\Sales\UseCases\ListSalesChannelsUseCase;
use App\Application\Sales\UseCases\UpdateSalesChannelUseCase;
use App\Presentation\Controllers\API\BaseController;
use App\Presentation\Requests\Sales\SaveSalesChannelRequest;
use App\Presentation\Resources\Sales\SalesChannelResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesChannelController extends BaseController
{
    public function __construct(
        private readonly ListSalesChannelsUseCase $listUseCase,
        private readonly CreateSalesChannelUseCase $createUseCase,
        private readonly UpdateSalesChannelUseCase $updateUseCase,
        private readonly DeleteSalesChannelUseCase $deleteUseCase
    ) {}

    public function index(Request $request): JsonResponse
    {
        $activeOnly = $request->boolean('active_only', false);
        $channels = $this->listUseCase->execute($activeOnly);

        return response()->json([
            'status' => 'success',
            'data' => SalesChannelResource::collection($channels)
        ]);
    }

    public function store(SaveSalesChannelRequest $request): JsonResponse
    {
        $dto = SalesChannelDTO::fromArray($request->validated());
        $channel = $this->createUseCase->execute($dto);

        return response()->json([
            'status' => 'success',
            'message' => 'Sales channel created successfully.',
            'data' => new SalesChannelResource($channel)
        ], 201);
    }

    public function update(SaveSalesChannelRequest $request, string $id): JsonResponse
    {
        $dto = SalesChannelDTO::fromArray($request->validated());
        $channel = $this->updateUseCase->execute($id, $dto);

        return response()->json([
            'status' => 'success',
            'message' => 'Sales channel updated successfully.',
            'data' => new SalesChannelResource($channel)
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $this->deleteUseCase->execute($id);

        return response()->json([
            'status' => 'success',
            'message' => 'Sales channel deleted successfully.'
        ]);
    }

    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            
            $destinationPath = public_path('uploads/channels');
            if (!file_exists($destinationPath)) {
                mkdir($destinationPath, 0755, true);
            }
            
            $file->move($destinationPath, $filename);
            
            $url = $request->getSchemeAndHttpHost() . '/uploads/channels/' . $filename;
            
            return response()->json([
                'status' => 'success',
                'data' => ['image_url' => $url],
                'message' => 'Image uploaded successfully'
            ]);
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Failed to upload image'
        ], 400);
    }
}
