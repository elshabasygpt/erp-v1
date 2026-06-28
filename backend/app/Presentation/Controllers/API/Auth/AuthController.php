<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Auth;

use App\Application\Auth\DTOs\LoginDTO;
use App\Application\Auth\DTOs\RegisterDTO;
use App\Application\Auth\UseCases\LoginUseCase;
use App\Application\Auth\UseCases\RegisterUseCase;
use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use App\Infrastructure\Services\TenantDatabaseManager;
use App\Presentation\Controllers\API\BaseController;
use App\Presentation\Requests\Auth\LoginRequest;
use App\Presentation\Requests\Auth\RegisterRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends BaseController
{
    public function __construct(
        private LoginUseCase $loginUseCase,
        private RegisterUseCase $registerUseCase,
        private TenantDatabaseManager $databaseManager,
    ) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $dto = LoginDTO::fromRequest($request->validated());

        // Step 1: Identify the tenant before touching the tenant DB
        $tenant = $this->resolveTenant($request, $dto->email);

        if (! $tenant) {
            return $this->error('Tenant not found. Please contact support.', 404);
        }

        // Step 2: Switch to the tenant database
        $this->databaseManager->switchToDatabase($tenant->database_name);

        try {
            $result = $this->loginUseCase->execute($dto);
        } catch (\DomainException $e) {
            $this->databaseManager->resetConnection();
            return $this->error($e->getMessage(), 401);
        }

        // Step 3: Verify password and create token inside tenant DB
        $userModel = UserModel::query()->where('email', $dto->email)->first();
        if (! $userModel || ! Hash::check($dto->password, $userModel->password)) {
            $this->databaseManager->resetConnection();
            return $this->error('Invalid credentials.', 401);
        }

        $token = $userModel->createToken('auth-token')->plainTextToken;

        $this->databaseManager->resetConnection();

        // Step 4: Ensure tenant_users mapping exists in central DB for next login
        $centralConn = env('DB_CONNECTION', 'sqlite');
        DB::connection($centralConn)->table('tenant_users')->updateOrInsert(
            ['email' => $dto->email],
            ['id' => \Illuminate\Support\Str::uuid(), 'tenant_id' => $tenant->id, 'email' => $dto->email, 'password' => '', 'created_at' => now(), 'updated_at' => now()]
        );

        return $this->success([
            'user' => $result['user'],
            'token' => $token,
            'token_type' => 'Bearer',
            'tenant_id' => $tenant->id,
        ], 'Login successful.');
    }

    private function resolveTenant(Request $request, string $email): ?TenantModel
    {
        // Priority 1: X-Tenant-ID header (sent after first login)
        $headerTenantId = $request->header('X-Tenant-ID');
        if ($headerTenantId) {
            $tenant = TenantModel::where('id', $headerTenantId)
                ->orWhere('domain', $headerTenantId)
                ->first();
            if ($tenant) {
                return $tenant;
            }
        }

        // Priority 2: Central tenant_users mapping by email
        $tenantUser = DB::table('tenant_users')->where('email', $email)->first();
        if ($tenantUser) {
            $tenant = TenantModel::find($tenantUser->tenant_id);
            if ($tenant) {
                return $tenant;
            }
        }

        // Priority 3: Fallback to the single active tenant (single-tenant / dev mode)
        return TenantModel::where('status', 'active')->whereNull('deleted_at')->first();
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $dto = RegisterDTO::fromRequest($request->validated());

        try {
            $user = $this->registerUseCase->execute($dto);
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }

        $userModel = UserModel::query()->find($user->getId());
        $token = $userModel->createToken('auth-token')->plainTextToken;

        return $this->success([
            'user' => $user->toArray(),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Registration successful.', 201);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $userData = $user->toArray();

        $userData['permissions'] = $user->role_id
            ? DB::connection('tenant')
                ->table('permissions')
                ->join('role_permissions', 'permissions.id', '=', 'role_permissions.permission_id')
                ->where('role_permissions.role_id', $user->role_id)
                ->pluck('permissions.name')
                ->toArray()
            : [];

        return $this->success(['user' => $userData]);
    }

    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return $this->error('Unauthenticated.', 401);
        }

        $user->currentAccessToken()->delete();
        $newToken = $user->createToken('auth-token')->plainTextToken;

        return $this->success([
            'token'      => $newToken,
            'token_type' => 'Bearer',
        ], 'Token refreshed.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(null, 'Logged out successfully.');
    }
}
