<?php

namespace App\Presentation\Controllers\API\Sales;

use App\Presentation\Controllers\API\BaseApiController;
use Illuminate\Http\Request;
use App\Domain\Sales\Entities\PosShift;
use Carbon\Carbon;

class PosShiftController extends BaseApiController
{
    public function current(Request $request)
    {
        $shift = PosShift::where('tenant_id', $request->header('X-Tenant-ID'))
            ->where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        return $this->successResponse($shift);
    }

    public function open(Request $request)
    {
        $request->validate([
            'opening_cash' => 'required|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        $existingShift = PosShift::where('tenant_id', $request->header('X-Tenant-ID'))
            ->where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        if ($existingShift) {
            return $this->errorResponse('A shift is already open.', 400);
        }

        $shift = PosShift::create([
            'tenant_id' => $request->header('X-Tenant-ID'),
            'user_id' => $request->user()->id,
            'opening_cash' => $request->opening_cash,
            'opened_at' => Carbon::now(),
            'status' => 'open',
            'notes' => $request->notes,
        ]);

        return $this->successResponse($shift, 'Shift opened successfully', 201);
    }

    public function close(Request $request)
    {
        $request->validate([
            'closing_cash' => 'required|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        $shift = PosShift::where('tenant_id', $request->header('X-Tenant-ID'))
            ->where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        if (!$shift) {
            return $this->errorResponse('No active shift found.', 404);
        }

        $shift->update([
            'closing_cash' => $request->closing_cash,
            'closed_at' => Carbon::now(),
            'status' => 'closed',
            'notes' => $request->notes ? $shift->notes . "\n" . $request->notes : $shift->notes,
        ]);

        return $this->successResponse($shift, 'Shift closed successfully');
    }
}
