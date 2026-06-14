<?php

namespace App\Policies;

use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use Illuminate\Auth\Access\Response;

class InvoicePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(UserModel $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(UserModel $user, InvoiceModel $invoiceModel): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(UserModel $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(UserModel $user, InvoiceModel $invoiceModel): bool
    {
        // Example Row-Level Ownership Check via meta_attributes
        $meta = $user->role->meta_attributes ?? [];
        
        if (isset($meta['can_only_edit_own']) && $meta['can_only_edit_own'] === true) {
            return $user->id === $invoiceModel->created_by;
        }

        return true;
    }

    /**
     * Special Action: Determine if the user can approve a specific discount.
     * This uses the dynamic meta_attributes stored on the Role!
     */
    public function approveDiscount(UserModel $user, InvoiceModel $invoiceModel, float $requestedDiscountPct): Response
    {
        $meta = $user->role->meta_attributes ?? [];
        
        $maxDiscount = $meta['max_discount_pct'] ?? 0;

        if ($requestedDiscountPct > $maxDiscount) {
            return Response::deny("You are only authorized to approve discounts up to {$maxDiscount}%.");
        }

        return Response::allow();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(UserModel $user, InvoiceModel $invoiceModel): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(UserModel $user, InvoiceModel $invoiceModel): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(UserModel $user, InvoiceModel $invoiceModel): bool
    {
        return false;
    }
}
