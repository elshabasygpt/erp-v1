<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Messages\SlackMessage;
use Illuminate\Notifications\Notification;

class BackupFailureNotification extends Notification
{
    use Queueable;

    private string $tenantId;
    private string $backupType;
    private string $errorMessage;

    public function __construct(string $tenantId, string $backupType, string $errorMessage)
    {
        $this->tenantId = $tenantId;
        $this->backupType = $backupType;
        $this->errorMessage = $errorMessage;
    }

    public function via($notifiable): array
    {
        $channels = [];
        
        if (config('services.slack.webhook_url')) {
            $channels[] = 'slack';
        }
        
        if (config('services.telegram.bot_token')) {
            $channels[] = 'telegram';
        }

        // Fallback to mail if others aren't configured, or append it
        if (config('mail.mailers.smtp.host')) {
            $channels[] = 'mail';
        }

        // Return configured channels, or just array log if none configured
        return count($channels) > 0 ? $channels : ['log'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->error()
            ->subject("CRITICAL: Backup Failure - Tenant {$this->tenantId}")
            ->line('A critical failure occurred during the ERP backup process.')
            ->line("Server Name: " . gethostname())
            ->line("Tenant: {$this->tenantId}")
            ->line("Type: {$this->backupType}")
            ->line("Timestamp: " . now()->toIso8601String())
            ->line("Exception: {$this->errorMessage}")
            ->action('View Logs', url('/'));
    }

    public function toSlack($notifiable): SlackMessage
    {
        return (new SlackMessage)
            ->error()
            ->content("🚨 *CRITICAL ERP BACKUP FAILURE* 🚨\n" .
                      "*Server:* " . gethostname() . "\n" .
                      "*Tenant:* {$this->tenantId}\n" .
                      "*Type:* {$this->backupType}\n" .
                      "*Error:* `{$this->errorMessage}`");
    }

    // Telegram can be sent via an external package or custom driver, 
    // omitting specific toTelegram method here for standard Laravel compliance, 
    // but the channel handles it if the package is installed.
}
