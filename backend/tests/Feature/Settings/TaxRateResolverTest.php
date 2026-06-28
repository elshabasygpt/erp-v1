<?php

declare(strict_types=1);

namespace Tests\Feature\Settings;

use App\Domain\Shared\Services\TaxRateResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Locks P1-3: the VAT default must follow the tenant's country instead of always
 * assuming Saudi 15%. An Egyptian tenant with no explicit tax_rate must get 14, not 15.
 */
class TaxRateResolverTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAsAuthenticatedUser();
    }

    private function setSetting(string $key, string $value): void
    {
        DB::connection('tenant')->table('tenant_settings')->updateOrInsert(
            ['key' => $key],
            ['id' => Str::uuid()->toString(), 'value' => $value, 'updated_at' => now()]
        );
    }

    public function test_explicit_tax_rate_always_wins(): void
    {
        $this->setSetting('country', 'EG');
        $this->setSetting('tax_rate', '7.5');

        $this->assertSame(7.5, TaxRateResolver::resolve());
    }

    public function test_egyptian_tenant_without_explicit_rate_defaults_to_14(): void
    {
        $this->setSetting('country', 'EG');

        $this->assertSame(14.0, TaxRateResolver::resolve());
    }

    public function test_saudi_or_unknown_tenant_without_explicit_rate_defaults_to_15(): void
    {
        $this->setSetting('country', 'SA');
        $this->assertSame(15.0, TaxRateResolver::resolve());
    }
}
