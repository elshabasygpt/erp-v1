<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Partnerships;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\PartnerModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PartnerController extends BaseController
{
    /**
     * Display a listing of partners.
     */
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', 15);
        
        $partners = PartnerModel::orderBy('created_at', 'desc')
            ->paginate((int) $limit);

        return $this->paginated($partners->toArray(), 'Partners retrieved successfully');
    }

    /**
     * Store a newly created partner in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'capital_amount' => 'required|numeric|min:0',
            'profit_share_percentage' => 'required|numeric|min:0|max:100',
            'duration_type' => 'nullable|string|in:open,days,months,years',
            'duration_value' => 'nullable|integer|min:1',
            'is_active' => 'boolean',
        ]);

        // Check if total profit share exceeds 100%
        $currentTotalPercentage = PartnerModel::where('is_active', true)->sum('profit_share_percentage');
        if (($currentTotalPercentage + $validated['profit_share_percentage']) > 100) {
            return $this->error('Total profit share percentage cannot exceed 100%. Current total: ' . $currentTotalPercentage . '%', 422);
        }

        $partner = PartnerModel::create([
            'id' => Str::uuid()->toString(),
            'name' => $validated['name'],
            'phone' => $validated['phone'] ?? null,
            'capital_amount' => $validated['capital_amount'],
            'profit_share_percentage' => $validated['profit_share_percentage'],
            'duration_type' => $validated['duration_type'] ?? 'open',
            'duration_value' => $validated['duration_value'] ?? null,
            'total_pending' => 0,
            'total_withdrawn' => 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return $this->success($partner, 'Partner added successfully', 201);
    }

    /**
     * Display the specified partner.
     */
    public function show(string $id): JsonResponse
    {
        $partner = PartnerModel::with(['profitShares.distribution', 'withdrawals'])->find($id);

        if (!$partner) {
            return $this->error('Partner not found', 404);
        }

        return $this->success($partner, 'Partner retrieved successfully');
    }

    /**
     * Update the specified partner in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $partner = PartnerModel::find($id);

        if (!$partner) {
            return $this->error('Partner not found', 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'capital_amount' => 'sometimes|required|numeric|min:0',
            'profit_share_percentage' => 'sometimes|required|numeric|min:0|max:100',
            'duration_type' => 'nullable|string|in:open,days,months,years',
            'duration_value' => 'nullable|integer|min:1',
            'is_active' => 'boolean',
        ]);

        if (isset($validated['profit_share_percentage'])) {
            $otherPercentages = PartnerModel::where('is_active', true)
                ->where('id', '!=', $id)
                ->sum('profit_share_percentage');
                
            if (($otherPercentages + $validated['profit_share_percentage']) > 100) {
                 return $this->error('Total profit share percentage cannot exceed 100%.', 422);
            }
        }

        $partner->update($validated);

        return $this->success($partner, 'Partner updated successfully');
    }

    /**
     * Remove the specified partner from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $partner = PartnerModel::find($id);

        if (!$partner) {
            return $this->error('Partner not found', 404);
        }

        if ($partner->total_pending > 0) {
            return $this->error('Cannot delete partner with pending profits. Please settle accounts first.', 422);
        }

        $partner->delete();

        return $this->success(null, 'Partner deleted successfully');
    }

    /**
     * Pay pending profits to a partner (withdrawal)
     */
    public function withdrawProfits(Request $request, string $id): JsonResponse
    {
        $partner = PartnerModel::find($id);

        if (!$partner) {
            return $this->error('Partner not found', 404);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:' . $partner->total_pending,
        ]);

        $amountToWithdraw = $validated['amount'];

        $partner->update([
            'total_pending' => $partner->total_pending - $amountToWithdraw,
            'total_withdrawn' => $partner->total_withdrawn + $amountToWithdraw,
        ]);

        $partner->withdrawals()->create([
            'amount' => $amountToWithdraw,
            'notes' => $request->input('notes', 'Direct Profit Withdrawal'),
        ]);

        // Here we could also record a Journal Entry in Accounting Domain for Cash Out

        return $this->success($partner, 'Profits withdrawn successfully');
    }

    /**
     * Enable portal access for a partner (Admin action)
     */
    public function enablePortal(Request $request, string $id): JsonResponse
    {
        $partner = PartnerModel::find($id);
        if (!$partner) return $this->error('Partner not found', 404);

        $validated = $request->validate([
            'email'          => 'required|email',
            'password'       => 'sometimes|nullable|string|min:8',
            'portal_enabled' => 'boolean',
        ]);

        $updateData = [
            'email'          => $validated['email'],
            'portal_enabled' => $validated['portal_enabled'] ?? true,
        ];

        if (!empty($validated['password'])) {
            $updateData['password_hash'] = \Illuminate\Support\Facades\Hash::make($validated['password']);
        }

        $partner->update($updateData);

        return $this->success([
            'portal_enabled' => $partner->fresh()->portal_enabled,
            'email'          => $partner->fresh()->email,
        ], 'تم تفعيل بوابة الشريك بنجاح.');
    }

    /**
     * Send a magic link to a partner (Admin action)
     */
    public function sendMagicLink(Request $request, string $id): JsonResponse
    {
        $partner = PartnerModel::find($id);
        if (!$partner) return $this->error('Partner not found', 404);
        if (!$partner->email) return $this->error('لا يوجد بريد إلكتروني مسجّل لهذا الشريك.', 422);

        $magicToken = Str::random(64);
        $partner->update([
            'magic_link_token'      => hash('sha256', $magicToken),
            'magic_link_expires_at' => now()->addMinutes(30),
        ]);

        return $this->success(
            app()->environment('local') ? ['magic_token' => $magicToken, 'expires_in' => '30 minutes'] : null,
            'تم إرسال رابط الدخول إلى ' . $partner->email
        );
    }
}
