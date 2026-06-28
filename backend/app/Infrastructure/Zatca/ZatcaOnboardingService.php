<?php

declare(strict_types=1);

namespace App\Infrastructure\Zatca;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ZatcaOnboardingService
{
    private const ZATCA_SIMULATION_URL = 'https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation';

    private const ZATCA_DEVELOPER_URL = 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal';

    private const ZATCA_PRODUCTION_URL = 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core';

    public function getBaseUrl(): string
    {
        $env = $this->getTenantSetting('zatca_environment') ?? 'simulation';

        return match ($env) {
            'production' => self::ZATCA_PRODUCTION_URL,
            'developer' => self::ZATCA_DEVELOPER_URL,
            default => self::ZATCA_SIMULATION_URL,
        };
    }

    /**
     * Submit OTP to get Compliance CSID from ZATCA.
     */
    public function issueComplianceCSID(string $otp): array
    {
        // 1. Generate CSR & Private Key for the given Tenant
        $keys = $this->generateCryptoKeys();

        // 2. Submit CSR and OTP to ZATCA
        $response = Http::withHeaders([
            'OTP' => $otp,
            'Accept-Version' => 'V2',
            'Content-Type' => 'application/json',
        ])->post($this->getBaseUrl().'/compliance', [
            'csr' => base64_encode($keys['csr']),
        ]);

        if ($response->failed()) {
            throw new \Exception('ZATCA API Error: '.$response->body());
        }

        $data = $response->json();

        $binarySecurityToken = $data['binarySecurityToken'] ?? null;
        $secret = $data['secret'] ?? null;

        if (! $binarySecurityToken) {
            throw new \Exception('Invalid ZATCA Response: Missing CSID Token.');
        }

        // 3. Save Private Key and CSID Securely to tenant_settings
        $this->saveTenantSetting('zatca_private_key', Crypt::encryptString($keys['private_key']));
        $this->saveTenantSetting('zatca_compliance_csid', Crypt::encryptString($binarySecurityToken));
        $this->saveTenantSetting('zatca_compliance_secret', Crypt::encryptString($secret));
        $this->saveTenantSetting('zatca_status', 'compliance_issued');

        // احفظ الـ certificate لو رجع في الـ response
        if (! empty($data['binarySecurityToken'])) {
            $certificate = base64_decode($data['binarySecurityToken']);
            $this->saveTenantSetting('zatca_certificate', Crypt::encryptString($certificate));
        }

        $this->saveTenantSetting('zatca_onboarded_at', now()->toISOString());

        return [
            'status' => 'success',
            'message' => 'Compliance CSID acquired successfully.',
        ];
    }

    /**
     * Store key-value in tenant settings securely.
     */
    private function saveTenantSetting(string $key, ?string $value): void
    {
        DB::connection('tenant')->table('tenant_settings')->updateOrInsert(
            ['key' => $key, 'tenant_id' => $tenantId],
            ['value' => $value, 'updated_at' => now(), 'id' => Str::uuid()]
        );

        // امسح الـ Cache عشان القيمة الجديدة تتحمّل
        Cache::forget("tenant_setting_{$key}");
    }

    /**
     * Get a secure tenant setting.
     */
    public function getTenantSetting(string $key): ?string
    {
        $cacheKey = "tenant_setting_{$key}";

        $value = Cache::remember(
            $cacheKey,
            now()->addMinutes(30),
            function () use ($key) {
                $setting = DB::connection('tenant')
                    ->table('tenant_settings')
                    ->where('key', $key)
                    ->first();

                return $setting?->value;
            }
        );

        if (! $value) {
            return null;
        }

        // Try decrypting if it's an encrypted secure key
        try {
            if (str_starts_with($key, 'zatca_')) {
                return Crypt::decryptString($value);
            }
        } catch (\Exception $e) {
            // Value wasn't encrypted or changed app key
            return $value;
        }

        return $value;
    }

    /**
     * Helper to natively generate SECP256k1 keys using OpenSSL if available.
     * In a real severe scenario, the specific ZATCA format CSR is required.
     */
    private function generateCryptoKeys(): array
    {
        $config = [
            'private_key_type' => OPENSSL_KEYTYPE_EC,
            'curve_name' => 'secp256r1',
        ];

        $res = openssl_pkey_new($config);
        openssl_pkey_export($res, $privateKey);

        $dn = [
            'countryName' => 'SA',
            'organizationName' => $this->getTenantSetting('company_name') ?? 'My Company',
            'commonName' => $this->getTenantSetting('branch_name') ?? 'Main Branch',
            'organizationalUnitName' => $this->getTenantSetting('branch_name') ?? 'Main Branch',
            // ZATCA serialNumber format: 1-{solution name}|2-{solution model/version}|3-{unit serial}
            'serialNumber' => '1-'.($this->getTenantSetting('company_name') ?? 'ERP')
                .'|2-'.($this->getTenantSetting('zatca_solution_version') ?? 'ERP-1.0')
                .'|3-'.($this->getTenantSetting('vat_number') ?? '300000000000003'),
        ];

        $csr = openssl_csr_new($dn, $res, $config);
        openssl_csr_export($csr, $csrOut);

        return [
            'private_key' => $privateKey,
            'csr' => $csrOut,
        ];
    }
}
