<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;

class BackupSuccessNotification extends Notification
{
    use Queueable;

    private string $tenantId;
    private string $backupType;
    private float $durationSeconds;
    private int $fileSizeBytes;

    public function __construct(string $tenantId, string $backupType, float $durationSeconds, int $fileSizeBytes)
    {
        $this->tenantId = $tenantId;
        $this->backupType = $backupType;
        $this->durationSeconds = $durationSeconds;
        $this->fileSizeBytes = $fileSizeBytes;
    }

    public function via($notifiable): array
    {
        $channels = [];

        if (config('mail.mailers.smtp.host')) {
            $channels[] = 'mail';
        }

        return $channels ?: ['log'];
    }

    public function toMail($notifiable): MailMessage
    {
        $sizeMB = round($this->fileSizeBytes / 1024 / 1024, 2) . ' MB';

        $this->notifySlack($sizeMB);

        return (new MailMessage)
            ->success()
            ->subject("SUCCESS: Backup Completed - Tenant {$this->tenantId}")
            ->line('ERP backup completed successfully and uploaded to secure vault.')
            ->line("Server Name: " . gethostname())
            ->line("Tenant: {$this->tenantId}")
            ->line("Type: {$this->backupType}")
            ->line("Duration: {$this->durationSeconds}s")
            ->line("File Size: {$sizeMB}")
            ->line("Timestamp: " . now()->toIso8601String())
            ->action('View Vault', url('/'));
    }

    private function notifySlack(string $sizeMB): void
    {
        $webhook = config('services.slack.webhook_url');
        if (! $webhook) {
            return;
        }

        Http::post($webhook, [
            'text' => "✅ *ERP BACKUP SUCCESS* ✅\n" .
                      "*Server:* " . gethostname() . "\n" .
                      "*Tenant:* {$this->tenantId}\n" .
                      "*Type:* {$this->backupType}\n" .
                      "*Duration:* {$this->durationSeconds}s\n" .
                      "*File Size:* {$sizeMB}\n" .
                      "*Timestamp:* " . now()->toIso8601String(),
        ]);
    }
}
