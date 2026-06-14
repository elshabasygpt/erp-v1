<?php
namespace Tests\Feature\Approvals;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_approval_inbox(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/approvals/inbox');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data']);
    }

    public function test_can_approve_pending_request(): void
    {
        $this->actingAsAuthenticatedUser();

        $approvalRequest = $this->createApprovalRequest(['status' => 'pending']);

        $response = $this->postJson("/api/approvals/{$approvalRequest->id}/approve", [
            'notes' => 'تمت الموافقة',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('approved', $approvalRequest->fresh()->status);
    }

    public function test_can_reject_pending_request(): void
    {
        $this->actingAsAuthenticatedUser();

        $approvalRequest = $this->createApprovalRequest(['status' => 'pending']);

        $response = $this->postJson("/api/approvals/{$approvalRequest->id}/reject", [
            'notes' => 'يتجاوز الميزانية المعتمدة',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('rejected', $approvalRequest->fresh()->status);
    }

    public function test_cannot_approve_already_approved_request(): void
    {
        $this->actingAsAuthenticatedUser();

        $approvalRequest = $this->createApprovalRequest(['status' => 'approved']);

        $response = $this->postJson("/api/approvals/{$approvalRequest->id}/approve");

        $response->assertStatus(422);
    }

    public function test_can_save_and_list_approval_rules(): void
    {
        $this->actingAsAuthenticatedUser();

        $this->postJson('/api/approvals/rules', [
            'requestable_type'     => 'PurchaseInvoice',
            'min_amount'           => 1000,
            'max_amount'           => 50000,
            'approver_role_id'     => 2,
            'escalate_after_hours' => 24,
        ])->assertStatus(201);

        $this->getJson('/api/approvals/rules')
             ->assertStatus(200)
             ->assertJsonStructure(['data']);
    }
}
