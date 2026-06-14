<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class BranchScope implements Scope
{
    public function apply(Builder $builder, Model $model)
    {
        if (Auth::hasUser()) {
            $user = Auth::user();
            
            // If the user has a branch assigned, restrict data to that branch.
            // If they don't have a branch_id (e.g., they are a super-admin), they see everything.
            if ($user->branch_id) {
                // Determine the table name to avoid ambiguity in joins
                $table = $model->getTable();
                $builder->where("{$table}.branch_id", $user->branch_id);
            }
        }
    }
}
