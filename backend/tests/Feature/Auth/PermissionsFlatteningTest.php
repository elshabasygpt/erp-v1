<?php

namespace Tests\Feature\Auth;

use App\Infrastructure\Eloquent\Models\PermissionModel;
use App\Infrastructure\Eloquent\Models\RoleModel;
use Tests\TestCase;

class PermissionsFlatteningTest extends TestCase
{
    public function test_me_endpoint_returns_the_users_permission_names()
    {
        $user = $this->actingAsAuthenticatedUser();

        $role = RoleModel::find($user->role_id);
        $permission = PermissionModel::create([
            'name' => 'manage_test_widgets',
            'guard_name' => $role->guard_name,
        ]);
        $role->givePermissionTo($permission);

        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(200);
        $this->assertContains('manage_test_widgets', $response->json('data.user.permissions'));
    }

    public function test_me_endpoint_returns_empty_permissions_array_when_role_has_none()
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(200);
        $this->assertIsArray($response->json('data.user.permissions'));
        $this->assertEmpty($response->json('data.user.permissions'));
    }
}
