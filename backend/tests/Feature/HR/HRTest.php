<?php
namespace Tests\Feature\HR;

use Tests\TestCase;


class HRTest extends TestCase
{
    

    public function test_can_list_employees(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/hr/employees');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data']);
    }

    public function test_can_create_employee(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->postJson('/api/hr/employees', [
            'name'        => 'أحمد محمد',
            'position'    => 'محاسب',
            'phone'       => '0500000000',
            'base_salary' => 5000,
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.name', 'أحمد محمد');
    }

    public function test_can_checkin_attendance(): void
    {
        $this->actingAsAuthenticatedUser();

        $employee = $this->createEmployee();

        $response = $this->postJson('/api/hr/attendance/check-in', [
            'employee_id' => $employee->id,
        ]);

        $response->assertStatus(200);
    }

    public function test_can_generate_payroll(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->postJson('/api/hr/payroll/generate', [
            'month'                 => 1,
            'year'                  => 2024,
            'working_days_in_month' => 26,
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure(['data']);
    }

    public function test_unauthenticated_user_cannot_access_hr(): void
    {
        $response = $this->getJson('/api/hr/employees');
        $response->assertStatus(401);
    }
}
