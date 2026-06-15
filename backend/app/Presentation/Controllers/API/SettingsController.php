<?php

namespace App\Presentation\Controllers\API;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            'phone'        => $settings['phone'] ?? null,
            'email'        => $settings['email'] ?? null,
            'website'      => $settings['website'] ?? null,
            'logo_url'     => $settings['logo_url'] ?? null,
            'address'      => $settings['address'] ?? null,
            'vat_number'   => $settings['vat_number'] ?? null,
            'cr_number'    => $settings['cr_number'] ?? null,
            'sales_channel_types' => isset($settings['sales_channel_types']) ? json_decode($settings['sales_channel_types'], true) : ['Delivery App', 'Internal Delivery', 'Marketplace', 'Custom'],
        ]);
    }

    /**
     * PUT /api/settings — Update tenant settings.
     */
    public function update(Request $request): JsonResponse
    {
        $allowedKeys = [
            'company_name', 'phone', 'email', 'website',
            'logo_url', 'address', 'vat_number', 'cr_number', 'sales_channel_types'
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
                            'updated_at' => now()
                        ]);
                } else {
                    DB::table('tenant_settings')->insert([
                        'id' => \Illuminate\Support\Str::uuid(),
                        'tenant_id' => $this->getTenantId($request),
                        'key' => $key,
                        'value' => $value,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            }
        }

        return $this->success(null, 'Settings updated successfully');
    }
}


