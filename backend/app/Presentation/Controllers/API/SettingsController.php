<?php

namespace App\Presentation\Controllers\API;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SettingsController extends BaseTenantController
{
    /**
     * GET /api/settings — Retrieve tenant settings.
     */
    public function index(Request $request): JsonResponse
    {
        $settings = DB::table('tenant_settings')->where('tenant_id', $this->getTenantId($request))->pluck('value', 'key');

        return $this->success([
            'company_name' => $settings['company_name'] ?? null,
            'phone' => $settings['phone'] ?? null,
            'email' => $settings['email'] ?? null,
            'website' => $settings['website'] ?? null,
            'logo_url' => $settings['logo_url'] ?? null,
            'address' => $settings['address'] ?? null,
            'vat_number' => $settings['vat_number'] ?? null,
            'cr_number' => $settings['cr_number'] ?? null,
            'sales_channel_types' => isset($settings['sales_channel_types']) ? json_decode($settings['sales_channel_types'], true) : ['Delivery App', 'Internal Delivery', 'Marketplace', 'Custom'],
            'country' => $settings['country'] ?? 'SA',
            'base_currency' => $settings['base_currency'] ?? 'SAR',
            'tax_rate' => $settings['tax_rate'] ?? '15',
            'tax_registration_number' => $settings['tax_registration_number'] ?? null,
            'barcode_settings' => $settings['barcode_settings'] ?? null,
        ]);
    }

    /**
     * PUT /api/settings — Update tenant settings.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'country' => 'sometimes|string|in:SA,EG',
            'base_currency' => 'sometimes|string|in:SAR,EGP',
        ]);

        // Auto-derive tax_rate and currency from country if country is being set
        if (isset($validated['country']) && !$request->has('tax_rate')) {
            $request->merge(['tax_rate' => $validated['country'] === 'EG' ? '14' : '15']);
        }
        if (isset($validated['country']) && !$request->has('base_currency')) {
            $request->merge(['base_currency' => $validated['country'] === 'EG' ? 'EGP' : 'SAR']);
        }

        $allowedKeys = [
            'company_name', 'phone', 'email', 'website',
            'logo_url', 'address', 'vat_number', 'cr_number', 'sales_channel_types',
            'country', 'base_currency', 'tax_rate', 'tax_registration_number',
            'barcode_settings',
        ];

        $data = $request->only($allowedKeys);

        foreach ($data as $key => $value) {
            if ($value !== null) {
                if (is_array($value)) {
                    $value = json_encode($value);
                }

                $exists = DB::table('tenant_settings')
                    ->where('tenant_id', $this->getTenantId($request))
                    ->where('key', $key)
                    ->exists();
                if ($exists) {
                    DB::table('tenant_settings')
                        ->where('tenant_id', $this->getTenantId($request))
                        ->where('key', $key)
                        ->update([
                            'value' => $value,
                            'updated_at' => now(),
                        ]);
                } else {
                    DB::table('tenant_settings')->insert([
                        'id' => Str::uuid(),
                        'tenant_id' => $this->getTenantId($request),
                        'key' => $key,
                        'value' => $value,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        return $this->success(null, 'Settings updated successfully');
    }

    public function updateHrManagerEmail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email'
        ]);

        $exists = DB::table('tenant_settings')
            ->where('tenant_id', $this->getTenantId($request))
            ->where('key', 'hr_manager_email')
            ->exists();

        if ($exists) {
            DB::table('tenant_settings')
                ->where('tenant_id', $this->getTenantId($request))
                ->where('key', 'hr_manager_email')
                ->update([
                    'value' => $validated['email'],
                    'updated_at' => now(),
                ]);
        } else {
            DB::table('tenant_settings')->insert([
                'id' => Str::uuid(),
                'tenant_id' => $this->getTenantId($request),
                'key' => 'hr_manager_email',
                'value' => $validated['email'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $this->success(null, 'HR Manager Email updated successfully');
    }
}
