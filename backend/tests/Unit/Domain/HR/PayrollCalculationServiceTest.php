<?php
namespace Tests\Unit\Domain\HR;

use App\Domain\HR\Services\PayrollCalculationService;
use PHPUnit\Framework\TestCase;

class PayrollCalculationServiceTest extends TestCase
{
    private PayrollCalculationService $service;

    protected function setUp(): void
    {
        $this->service = new PayrollCalculationService();
    }

    public function test_calculates_full_month_with_no_absences(): void
    {
        $result = $this->service->calculate(
            basicSalary: 3000,
            absentDays: 0,
            workingDaysInMonth: 30,
        );

        $this->assertEquals(3000, $result['basic_salary']);
        $this->assertEquals(0, $result['deductions']);
        $this->assertEquals(3000, $result['net_salary']);
    }

    public function test_deducts_correctly_for_absent_days(): void
    {
        $result = $this->service->calculate(
            basicSalary: 3000,
            absentDays: 3,
            workingDaysInMonth: 30,
        );

        $this->assertEquals(300, $result['deductions']);
        $this->assertEquals(2700, $result['net_salary']);
    }

    public function test_adds_bonuses_to_net_salary(): void
    {
        $result = $this->service->calculate(
            basicSalary: 3000,
            absentDays: 0,
            workingDaysInMonth: 30,
            bonuses: 500,
        );

        $this->assertEquals(3500, $result['net_salary']);
    }

    public function test_net_salary_never_goes_below_zero(): void
    {
        $result = $this->service->calculate(
            basicSalary: 1000,
            absentDays: 30,
            workingDaysInMonth: 30,
            extraDeductions: 500,
        );

        $this->assertEquals(0, $result['net_salary']);
    }

    public function test_uses_provided_working_days_not_hardcoded_30(): void
    {
        $result28 = $this->service->calculate(3000, 1, 28);
        $result31 = $this->service->calculate(3000, 1, 31);

        $this->assertNotEquals($result28['deductions'], $result31['deductions']);
        $this->assertGreaterThan($result31['daily_rate'], $result28['daily_rate']);
    }

    public function test_falls_back_to_30_days_when_working_days_is_zero(): void
    {
        $result = $this->service->calculate(3000, 0, 0);
        $this->assertEquals(3000, $result['net_salary']);
    }
}
