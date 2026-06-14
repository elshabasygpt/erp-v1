<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Auth;

use App\Presentation\Controllers\API\BaseController;
use App\Application\Auth\DTOs\LoginDTO;
use App\Application\Auth\DTOs\RegisterDTO;
use App\Application\Auth\UseCases\LoginUseCase;
use App\Application\Auth\UseCases\RegisterUseCase;
use App\Presentation\Requests\Auth\LoginRequest;
use App\Presentation\Requests\Auth\RegisterRequest;
use App\Infrastructure\Eloquent\Models\UserModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends BaseController
{
    public function __construct(
        private LoginUseCase $loginUseCase,
        private RegisterUseCase $registerUseCase,
    ) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $dto = LoginDTO::fromRequest($request->validated());

        try {
            $result = $this->loginUseCase->execute($dto);
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 401);
        }

        // Verify password via Eloquent model (tenant DB)
        $userModel = UserModel::where('email', $dto->email)->first();
        if (!$userModel || !Hash::check($dto->password, $userModel->password)) {
            return $this->error('Invalid credentials.', 401);
        }

        $token = $userModel->createToken('auth-token')->plainTextToken;

        // Look up tenant from central tenant_users table
        $tenantUser = \Illuminate\Support\Facades\DB::connection('pgsql')
            ->table('tenant_users')
            ->where('email', $dto->email)
            ->first();

        $tenantId = $tenantUser?->tenant_id;

        return $this->success([
            'user' => $result['user'],
            'token' => $token,
            'token_type' => 'Bearer',
            'tenant_id' => $tenantId,
        ], 'Login successful.');
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $dto = RegisterDTO::fromRequest($request->validated());

        try {
            $user = $this->registerUseCase->execute($dto);
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }

        $userModel = UserModel::find($user->getId());
        $token = $userModel->createToken('auth-token')->plainTextToken;

        return $this->success([
            'user' => $user->toArray(),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Registration successful.', 201);
    }

    public function me(Request $request): JsonResponse
    {
        return $this->success([
            'user' => $request->user()->load('role.permissions')->toArray(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return $this->success(null, 'Logged out successfully.');
    }
}
