<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LateAttendanceNotification extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $employeeName,
        public readonly string $employeePosition,
        public readonly string $checkInTime,
        public readonly string $shiftStartTime,
        public readonly int    $lateMinutes,
        public readonly int    $effectiveLateMinutes,
        public readonly float  $penaltyAmount,
        public readonly string $penaltyRuleLabel,
        public readonly string $attendanceDate,
        public readonly string $tenantName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "⚠️ تنبيه تأخير | {$this->employeeName} — {$this->attendanceDate}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.late-attendance',
        );
    }
}
