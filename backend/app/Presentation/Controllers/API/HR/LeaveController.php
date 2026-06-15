<?php

namespace App\Presentation\Controllers\API\HR;

use App\Presentation\Controllers\API\BaseTenantController;
use App\Infrastructure\Eloquent\Models\LeaveModel;
use Illuminate\Http\Request;

class LeaveController extends BaseTenantController
{
    public function index(Request $request)
    {
        $tenantId = $this->getTenantId($request);
        $query = LeaveModel::where('tenant_id', $this->getTenantId($request))->with('employee')
            ->whereHas('employee', fn($q) => $q->where('tenant_id', $tenantId))
            ->orderBy('start_date', 'desc');
        return $this->paginated($query->paginate($request->get('per_page', 25))->toArray());
    }

    public function store(Request $request)
    {
        $validated['tenant_id'] = $this->getTenantId($request);
        $validated['tenant_id'] = $this->getTenantId($request);
        $leave = LeaveModel::create($validated);
        return $this->success($leave, 'Leave applied successfully', 201);
    }

    public function updateStatus(Request $request, string $id)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected,pending',
        ]);

        $leave = LeaveModel::whereHas('employee', fn($q) =>
            $q->where('tenant_id', $this->getTenantId($request))
        )->findOrFail($id);
        
        $leave->update(['status' => $request->status]);

        return $this->success($leave, 'Leave status updated successfully');
    }
}


