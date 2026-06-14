<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Traits;

use App\Infrastructure\Eloquent\Scopes\BranchScope;

trait BranchScoped
{
    /**
     * Boot the branch scoped trait for a model.
     *
     * @return void
     */
    protected static function bootBranchScoped()
    {
        static::addGlobalScope(new BranchScope);
    }
}
