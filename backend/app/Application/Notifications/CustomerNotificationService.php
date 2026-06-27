<?php

declare(strict_types=1);

namespace App\Application\Notifications;

use Illuminate\Support\Facades\Log;

/**
 * Abstracted notification channel for customer-facing messages.
 *
 * By default every message is written to the daily log (safe for dev/staging).
 * Set NOTIFICATION_DRIVER=twilio or NOTIFICATION_DRIVER=vonage in .env to
 * activate the real SMS/WhatsApp integrations without touching any other code.
 *
 * WhatsApp Business API (Meta):
 *   WHATSAPP_TOKEN=xxx
 *   WHATSAPP_PHONE_ID=xxx
 *
 * Twilio (SMS + WhatsApp sandbox):
 *   TWILIO_SID=xxx
 *   TWILIO_TOKEN=xxx
 *   TWILIO_FROM=+1xxxxxxxxxx
 *
 * Vonage (Nexmo) SMS:
 *   VONAGE_KEY=xxx
 *   VONAGE_SECRET=xxx
 *   VONAGE_FROM=ERP
 */
class CustomerNotificationService
{
    public function send(
        string  $tenantId,
        string  $customerId,
        string  $channel,      // 'whatsapp' | 'sms' | 'email' | 'log'
        string  $phone,
        string  $message,
        array   $context = [],
    ): bool {
        $driver = strtolower(config('services.notification_driver', env('NOTIFICATION_DRIVER', 'log')));

        try {
            return match (true) {
                $channel === 'whatsapp' && $driver === 'whatsapp' => $this->_sendWhatsApp($phone, $message),
                in_array($channel, ['whatsapp', 'sms']) && $driver === 'twilio'  => $this->_sendTwilio($phone, $message, $channel),
                in_array($channel, ['whatsapp', 'sms']) && $driver === 'vonage'  => $this->_sendVonage($phone, $message),
                default                                                           => $this->_logOnly($tenantId, $customerId, $channel, $phone, $message, $context),
            };
        } catch (\Throwable $e) {
            Log::error("[CustomerNotification] Failed to send {$channel} to {$phone}: " . $e->getMessage(), $context);
            return false;
        }
    }

    // -----------------------------------------------------------------------
    // Drivers
    // -----------------------------------------------------------------------

    private function _sendWhatsApp(string $phone, string $message): bool
    {
        $token   = config('services.whatsapp.token');
        $phoneId = config('services.whatsapp.phone_id');

        if (! $token || ! $phoneId) {
            Log::warning('[CustomerNotification] WhatsApp credentials not configured, falling back to log');
            return $this->_logOnly('', '', 'whatsapp', $phone, $message, []);
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'to'                => preg_replace('/[^0-9]/', '', $phone),
            'type'              => 'text',
            'text'              => ['body' => $message],
        ];

        $response = \Illuminate\Support\Facades\Http::withToken($token)
            ->post("https://graph.facebook.com/v18.0/{$phoneId}/messages", $payload);

        Log::info('[CustomerNotification] WhatsApp sent', ['phone' => $phone, 'status' => $response->status()]);
        return $response->successful();
    }

    private function _sendTwilio(string $phone, string $message, string $channel): bool
    {
        $sid   = config('services.twilio.sid');
        $token = config('services.twilio.token');
        $from  = config('services.twilio.from');

        if (! $sid || ! $token || ! $from) {
            Log::warning('[CustomerNotification] Twilio credentials not configured, falling back to log');
            return $this->_logOnly('', '', $channel, $phone, $message, []);
        }

        $toNumber = ($channel === 'whatsapp')
            ? 'whatsapp:' . preg_replace('/[^0-9+]/', '', $phone)
            : preg_replace('/[^0-9+]/', '', $phone);

        $fromNumber = ($channel === 'whatsapp') ? 'whatsapp:' . $from : $from;

        $response = \Illuminate\Support\Facades\Http::withBasicAuth($sid, $token)
            ->asForm()
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
                'To'   => $toNumber,
                'From' => $fromNumber,
                'Body' => $message,
            ]);

        Log::info('[CustomerNotification] Twilio sent', ['phone' => $phone, 'status' => $response->status()]);
        return $response->successful();
    }

    private function _sendVonage(string $phone, string $message): bool
    {
        $key    = config('services.vonage.key');
        $secret = config('services.vonage.secret');
        $from   = config('services.vonage.from', 'ERP');

        if (! $key || ! $secret) {
            Log::warning('[CustomerNotification] Vonage credentials not configured, falling back to log');
            return $this->_logOnly('', '', 'sms', $phone, $message, []);
        }

        $response = \Illuminate\Support\Facades\Http::post('https://rest.nexmo.com/sms/json', [
            'api_key'    => $key,
            'api_secret' => $secret,
            'to'         => preg_replace('/[^0-9]/', '', $phone),
            'from'       => $from,
            'text'       => $message,
        ]);

        Log::info('[CustomerNotification] Vonage sent', ['phone' => $phone, 'status' => $response->status()]);
        return $response->successful();
    }

    private function _logOnly(
        string $tenantId, string $customerId, string $channel,
        string $phone, string $message, array $context
    ): bool {
        Log::channel('daily')->info('[CustomerNotification][LOG_DRIVER]', [
            'tenant'    => $tenantId,
            'customer'  => $customerId,
            'channel'   => $channel,
            'phone'     => $phone,
            'message'   => $message,
            'context'   => $context,
        ]);
        return true;
    }
}
