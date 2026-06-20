<?php

namespace App\Application\AiAssistant\Services;

class AiAssistantService
{
    public function __construct(
        private readonly string $tenantId
    ) {}

    public function processQuery(string $prompt): string
    {
        $promptLower = strtolower($prompt);

        // Simulated AI Keyword Parsing
        if (str_contains($promptLower, 'cash flow') || str_contains($promptLower, 'cash')) {
            return "Based on your current treasury and upcoming receivables, your predicted cash flow for this month is **142,500 SAR**. This is a **12% increase** compared to last month. Would you like to see a breakdown of upcoming payables?";
        }

        if (str_contains($promptLower, 'overdue') || str_contains($promptLower, 'late')) {
            return "You currently have **3 overdue invoices** totaling **45,200 SAR**. The largest is from 'Acme Corp' (Invoice #INV-2024). Would you like me to draft a polite reminder email to them?";
        }

        if (str_contains($promptLower, 'revenue') || str_contains($promptLower, 'sales')) {
            return "Your total revenue for this quarter is **320,000 SAR**. Our predictive model forecasts next month's sales to reach **115,000 SAR** due to expected seasonal demand.";
        }

        if (str_contains($promptLower, 'inventory') || str_contains($promptLower, 'stock')) {
            return "Warning: **iPhone 15 Pro** and **Samsung Galaxy S24** are predicted to stock out in 8 days based on their current 30-day sales velocity. I recommend creating a Purchase Order now.";
        }

        if (str_contains($promptLower, 'draft') || str_contains($promptLower, 'email')) {
            return "Here is a draft for Acme Corp:\n\n*Subject: Overdue Invoice Reminder - INV-2024*\n\n*Dear Acme Corp Team,*\n*This is a gentle reminder that invoice INV-2024 for 25,000 SAR is now 14 days overdue. Please process the payment at your earliest convenience.*\n\nShall I send this via the CRM module?";
        }

        return "I am your AI CFO Co-Pilot. I can help you analyze your revenue, predict your cash flow, identify stock risks, or even draft emails to customers. Try asking: **'What is my predicted cash flow?'**";
    }
}
