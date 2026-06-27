<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;

class BackupFailureNotification extends Notification
{
    use Queueable;

    private string $tenantId;
    private string $backupType;
    private string $errorMessage;
    private float $durationSeconds;
    private ?int $fileSizeBytes;

    public function __construct(string $tenantId, string $backupType, string $errorMessage, float $durationSeconds = 0.0, ?int $fileSizeBytes = null)
    {
        $this->tenantId = $tenantId;
        $this->backupType = $backupType;
        $this->errorMessage = $errorMessage;
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
        $sizeMB = $this->fileSizeBytes ? round($this->fileSizeBytes / 1024 / 1024, 2) . ' MB' : 'Unknown';

        $this->notifySlack($sizeMB);

        return (new MailMessage)
            ->error()
            ->subject("CRITICAL: Backup Failure - Tenant {$this->tenantId}")
            ->line('A critical failure occurred during the ERP backup process.')
            ->line("Server Name: " . gethostname())
            ->line("Tenant: {$this->tenantId}")
            ->line("Type: {$this->backupType}")
            ->line("Duration: {$this->durationSeconds}s")
            ->line("File Size: {$sizeMB}")
            ->line("Timestamp: " . now()->toIso8601String())
            ->line("Exception: {$this->errorMessage}")
            ->action('View Logs', url('/'));
    }

    private function notifySlack(string $sizeMB): void
    {
        $webhook = config('services.slack.webhook_url');
        if (! $webhook) {
            return;
        }

        Http::post($webhook, [
            'text' => "🚨 *CRITICAL ERP BACKUP FAILURE* 🚨\n" .
                      "*Server:* " . gethostname() . "\n" .
                      "*Tenant:* {$this->tenantId}\n" .
                      "*Type:* {$this->backupType}\n" .
                      "*Duration:* {$this->durationSeconds}s\n" .
                      "*File Size:* {$sizeMB}\n" .
                      "*Timestamp:* " . now()->toIso8601String() . "\n" .
                      "*Error:* `{$this->errorMessage}`",
        ]);
    }
}
