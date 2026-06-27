<?php

namespace Tests\Feature\Automation;

use Tests\TestCase;

class AutomationWorkflowTest extends TestCase
{
    public function test_can_list_workflows()
    {
        $user = $this->actingAsAuthenticatedUser();

        $response = $this->actingAs($user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->getJson('/api/automation/workflows');

        $response->assertStatus(200);
        $response->assertJsonStructure(['success', 'data']);
    }

    public function test_can_create_workflow()
    {
        $user = $this->actingAsAuthenticatedUser();

        $response = $this->actingAs($user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->postJson('/api/automation/workflows', [
                'name'         => 'Test Workflow',
                'trigger_type' => 'invoice_confirmed',
                'is_active'    => true,
                'nodes_json'   => [],
                'edges_json'   => [],
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.name', 'Test Workflow');
    }

    public function test_can_get_single_workflow()
    {
        $user = $this->actingAsAuthenticatedUser();

        // Create first
        $created = $this->actingAs($user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->postJson('/api/automation/workflows', [
                'name'         => 'Workflow For Get',
                'trigger_type' => 'payment_received',
                'is_active'    => false,
            ]);

        $created->assertStatus(200);
        $id = $created->json('data.id');

        $response = $this->actingAs($user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->getJson("/api/automation/workflows/{$id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $id);
    }

    public function test_can_delete_workflow()
    {
        $user = $this->actingAsAuthenticatedUser();

        $created = $this->actingAs($user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->postJson('/api/automation/workflows', [
                'name'         => 'Workflow To Delete',
                'trigger_type' => 'low_stock',
                'is_active'    => true,
            ]);

        $created->assertStatus(200);
        $id = $created->json('data.id');

        $response = $this->actingAs($user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->deleteJson("/api/automation/workflows/{$id}");

        $response->assertStatus(200);
    }

    public function test_cannot_access_workflows_without_auth()
    {
        $response = $this->getJson('/api/automation/workflows');
        $response->assertStatus(401);
    }
}
