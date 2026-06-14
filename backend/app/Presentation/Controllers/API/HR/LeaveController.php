<?php

namespace App\Presentation\Controllers\API\HR;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\LeaveModel;
use Illuminate\Http\Request;

class LeaveController extends BaseController
{
    public function index(Request $request)
    {
        $query = LeaveModel::with('employee')->orderBy('start_date', 'desc');
        return $this->success($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:tenant.employees,id',
            'start_date'  => 'required|date',
            'end_date'    => 'required|date|after_or_equal:start_date',
            'type'        => 'required|in:annual,sick,unpaid,other',
            'reason'      => 'required|string'
        ]);

        $leave = LeaveModel::create($validated);
        return $this->success($leave, 'Leave applied successfully', 201);
    }

    public function updateStatus(Request $request, string $id)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected,pending',
        ]);

        $leave = LeaveModel::findOrFail($id);
        $leave->update(['status' => $request->status]);

        return $this->success($leave, 'Leave status updated successfully');
    }
}
