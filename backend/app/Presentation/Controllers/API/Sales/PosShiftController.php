<?php

namespace App\Presentation\Controllers\API\Sales;

use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\Request;
use App\Domain\Sales\Entities\PosShift;
use Carbon\Carbon;

class PosShiftController extends BaseTenantController
{
    public function current(Request $request)
    {
        $shift = PosShift::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        return $this->success($shift);
    }

    public function open(Request $request)
    {
        $request->validate([
            'opening_cash' => 'required|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        $existingShift = PosShift::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        if ($existingShift) {
            return $this->error('A shift is already open.', 400);
        }

        $shift = PosShift::query()->create([
            'tenant_id' => $this->getTenantId($request),
            'user_id' => $request->user()->id,
            'opening_cash' => $request->opening_cash,
            'opened_at' => Carbon::now(),
            'status' => 'open',
            'notes' => $request->notes,
        ]);

        return $this->success($shift, 'Shift opened successfully', 201);
    }

    public function close(Request $request)
    {
        $request->validate([
            'closing_cash' => 'required|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        $shift = PosShift::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        if (!$shift) {
            return $this->error('No active shift found.', 404);
        }

        $shift->update([
            'closing_cash' => $request->closing_cash,
            'closed_at' => Carbon::now(),
            'status' => 'closed',
            'notes' => $request->notes ? $shift->notes . "\n" . $request->notes : $shift->notes,
        ]);

        return $this->success($shift, 'Shift closed successfully');
    }
}
