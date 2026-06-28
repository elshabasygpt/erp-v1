<?php

declare(strict_types=1);

namespace Tests\Feature\Crm;

use App\Infrastructure\Eloquent\Models\PipelineStageModel;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Covers the newly-built CRM pipeline backend that the Kanban board
 * (/dashboard/crm) calls. Previously these three endpoints did not exist
 * (every board action 404'd).
 */
class PipelineTest extends TestCase
{
    public function test_stages_endpoint_seeds_default_stages_and_returns_them_with_deals(): void
    {
        $this->actingAsAuthenticatedUser();

        $res = $this->getJson('/api/crm/pipeline/stages');
        $res->assertStatus(200);

        $stages = $res->json('data');
        $this->assertCount(5, $stages, 'first load seeds 5 default stages');
        $this->assertSame('Lead', $stages[0]['name']);
        $this->assertArrayHasKey('deals', $stages[0]);

        // Idempotent — opening the board again must not re-seed.
        $this->getJson('/api/crm/pipeline/stages')->assertStatus(200);
        $this->assertSame(5, PipelineStageModel::query()->count());
    }

    public function test_create_deal_then_move_it_between_stages(): void
    {
        $this->actingAsAuthenticatedUser();

        $stages = $this->getJson('/api/crm/pipeline/stages')->json('data');
        $leadId = $stages[0]['id']; // Lead
        $wonId = $stages[3]['id'];  // Won

        $create = $this->postJson('/api/crm/pipeline/deals', [
            'stage_id' => $leadId,
            'title' => 'Acme fleet order',
            'expected_value' => 5000,
        ]);
        $create->assertStatus(201);
        $dealId = $create->json('data.id');

        $this->assertSame($leadId, DB::connection('tenant')->table('deals')->where('id', $dealId)->value('stage_id'));

        $move = $this->putJson("/api/crm/pipeline/deals/{$dealId}/move", [
            'new_stage_id' => $wonId,
            'new_order_index' => 0,
        ]);
        $move->assertStatus(200);

        $this->assertSame($wonId, DB::connection('tenant')->table('deals')->where('id', $dealId)->value('stage_id'));

        // The moved deal now shows under the Won stage in the board payload.
        $after = $this->getJson('/api/crm/pipeline/stages')->json('data');
        $wonStage = collect($after)->firstWhere('id', $wonId);
        $this->assertCount(1, $wonStage['deals']);
        $this->assertSame('Acme fleet order', $wonStage['deals'][0]['title']);
    }

    public function test_create_deal_rejects_unknown_stage(): void
    {
        $this->actingAsAuthenticatedUser();

        $this->postJson('/api/crm/pipeline/deals', [
            'stage_id' => '00000000-0000-4000-8000-000000000123',
            'title' => 'Orphan deal',
        ])->assertStatus(422);
    }
}
