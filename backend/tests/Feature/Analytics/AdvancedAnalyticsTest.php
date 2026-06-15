<?php

namespace Tests\Feature\Analytics;

use Tests\TestCase;
use App\Infrastructure\Eloquent\Models\UserModel;
use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;

use Illuminate\Support\Str;

class AdvancedAnalyticsTest extends TestCase
{
    // Using an existing tenant database structure, or mocking DB calls.
    // Since this is a tenant-aware application, we need to ensure the user is authenticated.

    protected function setUp(): void
    {
        parent::setUp();
        // Skip RefreshDatabase if it's dropping the actual DB in tenant context without proper isolation.
        // For standard testing, if we use RefreshDatabase, we must be careful with tenant schemas.
    }

    private function authenticate()
    {
        $user = UserModel::first() ?? UserModel::factory()->create();
        $this->actingAs($user, 'api');
        return $user;
    }

    public function test_sales_performance_endpoint_returns_valid_structure()
    {
        $this->authenticate();

        $response = $this->getJson('/api/analytics/sales-performance?interval=day');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'period',
                        'revenue',
                        'invoices_count',
                        'total_discount'
                    ]
                ],
                'message'
            ]);
    }

    public function test_profitability_analysis_endpoint_returns_valid_structure()
    {
        $this->authenticate();

        $response = $this->getJson('/api/analytics/profitability?dimension=product');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'entity_id',
                        'entity_name',
                        'units_sold',
                        'revenue',
                        'cogs',
                        'gross_profit'
                    ]
                ],
                'message'
            ]);
    }

    public function test_sales_by_channel_endpoint_returns_valid_structure()
    {
        $this->authenticate();

        $response = $this->getJson('/api/analytics/sales-by-channel');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'channel',
                        'revenue',
                        'orders_count'
                    ]
                ],
                'message'
            ]);
    }

    public function test_returns_analysis_endpoint_returns_valid_structure()
    {
        $this->authenticate();

        $response = $this->getJson('/api/analytics/returns-analysis');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_sales',
                    'total_returned',
                    'return_rate_percent',
                    'breakdown_by_reason'
                ],
                'message'
            ]);
    }

    public function test_customer_lifetime_value_endpoint_returns_valid_structure()
    {
        $this->authenticate();

        $response = $this->getJson('/api/analytics/customer-lifetime-value');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'average_order_value',
                    'purchase_frequency',
                    'historical_clv',
                    'top_lifetime_customers'
                ],
                'message'
            ]);
    }

    public function test_discount_analysis_endpoint_returns_valid_structure()
    {
        $this->authenticate();

        $response = $this->getJson('/api/analytics/discount-analysis');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'gross_sales',
                    'total_discounts',
                    'average_discount_rate_percent',
                    'discounts_by_salesperson'
                ],
                'message'
            ]);
    }

    public function test_top_categories_endpoint_returns_valid_structure()
    {
        $this->authenticate();

        $response = $this->getJson('/api/analytics/top-categories');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'product_type',
                        'revenue',
                        'units_sold'
                    ]
                ],
                'message'
            ]);
    }

    public function test_conversion_funnel_endpoint_returns_valid_structure()
    {
        $this->authenticate();

        $response = $this->getJson('/api/analytics/conversion-funnel');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_quotations',
                    'total_sales_orders',
                    'converted_to_invoice',
                    'quotation_to_so_conversion_rate',
                    'so_to_invoice_conversion_rate'
                ],
                'message'
            ]);
    }
}
