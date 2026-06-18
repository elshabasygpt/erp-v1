<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; }
        .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
        .body { padding: 28px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
        .info-card { background: #f8fafc; border-radius: 8px; padding: 16px; border-right: 4px solid #e2e8f0; }
        .info-card.red { border-right-color: #ef4444; }
        .info-card.orange { border-right-color: #f97316; }
        .info-card.green { border-right-color: #22c55e; }
        .info-card label { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
        .info-card span { display: block; font-size: 18px; font-weight: bold; color: #1e293b; }
        .penalty-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; }
        .penalty-box .amount { font-size: 32px; font-weight: bold; color: #dc2626; }
        .penalty-box .label { font-size: 13px; color: #64748b; margin-top: 4px; }
        .footer { background: #f8fafc; padding: 16px 28px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .badge-red { background: #fecaca; color: #dc2626; }
        .badge-orange { background: #fed7aa; color: #ea580c; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ تنبيه تأخير في الحضور</h1>
            <p>{{ $tenantName }} — {{ $attendanceDate }}</p>
        </div>
        <div class="body">
            <p style="color: #475569; margin-top: 0;">
                تم تسجيل حضور الموظف <strong>{{ $employeeName }}</strong> متأخراً عن وقت بدء الدوام الرسمي.
            </p>

            <div class="info-grid">
                <div class="info-card">
                    <label>اسم الموظف</label>
                    <span>{{ $employeeName }}</span>
                </div>
                <div class="info-card">
                    <label>المسمى الوظيفي</label>
                    <span>{{ $employeePosition ?: 'غير محدد' }}</span>
                </div>
                <div class="info-card green">
                    <label>وقت بدء الدوام</label>
                    <span>{{ $shiftStartTime }}</span>
                </div>
                <div class="info-card red">
                    <label>وقت الحضور الفعلي</label>
                    <span>{{ $checkInTime }}</span>
                </div>
                <div class="info-card orange">
                    <label>مدة التأخير</label>
                    <span>{{ $lateMinutes }} دقيقة</span>
                </div>
                <div class="info-card red">
                    <label>التأخير بعد السماح</label>
                    <span>{{ $effectiveLateMinutes }} دقيقة</span>
                </div>
            </div>

            @if($penaltyAmount > 0)
            <div class="penalty-box">
                <div class="label">الجزاء المحتسب</div>
                <div class="amount">{{ number_format($penaltyAmount, 2) }}</div>
                <div class="label" style="margin-top: 8px;">
                    <span class="badge badge-red">{{ $penaltyRuleLabel }}</span>
                </div>
            </div>
            @else
            <div class="penalty-box" style="background: #f0fdf4; border-color: #bbf7d0;">
                <div class="amount" style="color: #16a34a;">لا يوجد جزاء</div>
                <div class="label">التأخير ضمن وقت السماح المحدد</div>
            </div>
            @endif

            <p style="color: #94a3b8; font-size: 13px; margin-bottom: 0;">
                يُرجى مراجعة سجل الحضور واتخاذ الإجراء المناسب إذا لزم الأمر.
            </p>
        </div>
        <div class="footer">
            هذا البريد أُرسل تلقائياً من نظام الموارد البشرية — {{ $tenantName }}
        </div>
    </div>
</body>
</html>
