<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>كشف حساب الشريك - {{ $partner->name }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; padding: 30px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 22px; font-weight: bold; color: #4f46e5; }
        .meta { text-align: left; font-size: 11px; color: #666; }
        .title { font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #1a1a2e; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 30px; }
        .summary-card { background: #f8f9ff; border: 1px solid #e0e0ff; border-radius: 8px; padding: 14px; text-align: center; }
        .summary-card .label { font-size: 11px; color: #666; margin-bottom: 4px; }
        .summary-card .value { font-size: 18px; font-weight: bold; color: #4f46e5; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #4f46e5; color: white; padding: 10px; text-align: right; font-size: 12px; }
        td { padding: 9px 10px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
        tr:nth-child(even) td { background: #fafafa; }
        .credit { color: #059669; font-weight: bold; }
        .debit { color: #dc2626; font-weight: bold; }
        .balance { font-weight: bold; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
        @media print { body { padding: 15px; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🏦 نظام المحاسبة السحابي</div>
        <div class="meta">
            <div>كشف حساب: <strong>{{ $partner->name }}</strong></div>
            <div>تاريخ الإصدار: {{ $generatedAt }}</div>
        </div>
    </div>

    <div class="title">كشف الحساب التفصيلي للشريك</div>

    <div class="summary-grid">
        <div class="summary-card">
            <div class="label">إجمالي الأرباح المستحقة</div>
            <div class="value">{{ number_format($partner->total_pending + $partner->total_withdrawn, 2) }} ر.س</div>
        </div>
        <div class="summary-card">
            <div class="label">المسحوب</div>
            <div class="value">{{ number_format($partner->total_withdrawn, 2) }} ر.س</div>
        </div>
        <div class="summary-card">
            <div class="label">الرصيد الحالي</div>
            <div class="value">{{ number_format($partner->total_pending, 2) }} ر.س</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>التاريخ</th>
                <th>البيان</th>
                <th>نوع</th>
                <th>المبلغ</th>
            </tr>
        </thead>
        <tbody>
            @foreach($sharesQuery as $share)
            <tr>
                <td>{{ $share->created_at?->format('Y-m-d') ?? 'N/A' }}</td>
                <td>توزيع أرباح - {{ $share->distribution?->created_at?->format('Y-m-d') ?? '' }}</td>
                <td><span class="credit">دائن ▲</span></td>
                <td class="credit">+{{ number_format($share->amount, 2) }} ر.س</td>
            </tr>
            @endforeach
            @foreach($withdrawalsQuery as $w)
            <tr>
                <td>{{ $w->created_at?->format('Y-m-d') ?? 'N/A' }}</td>
                <td>{{ $w->notes ?? 'سحب أرباح' }}</td>
                <td><span class="debit">مدين ▼</span></td>
                <td class="debit">-{{ number_format($w->amount, 2) }} ر.س</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        هذا المستند صادر آلياً من نظام المحاسبة السحابي · {{ $generatedAt }}
        <br>جميع المبالغ بالريال السعودي (ر.س)
    </div>

    <script>window.onload = function() { window.print(); }</script>
</body>
</html>
