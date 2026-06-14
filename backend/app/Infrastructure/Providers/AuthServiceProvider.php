<?php

namespace App\Infrastructure\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Auth\Access\Events\GateEvaluated;
use Spatie\Activitylog\Models\Activity;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        \App\Infrastructure\Eloquent\Models\InvoiceModel::class => \App\Policies\InvoicePolicy::class,
    ];

    public function boot()
    {
        // Manually register policies (since Laravel can't auto-discover custom domain namespaces)
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }

        // Listen to authorization events to provide full audit logging of decisions
        Event::listen(function (GateEvaluated $event) {
            $isDenied = $event->result === false || 
                        $event->result === null || 
                        ($event->result instanceof \Illuminate\Auth\Access\Response && !$event->result->allowed());

            if ($isDenied) {
                $user = $event->user;
                $ability = $event->ability;
                
                $arguments = collect($event->arguments)->map(function ($arg) {
                    if (is_object($arg) && method_exists($arg, 'getKey')) {
                        return get_class($arg) . ':' . $arg->getKey();
                    }
                    return is_scalar($arg) ? $arg : 'complex_argument';
                })->implode(', ');

                $logMessage = "Authorization Denied: User [{$user?->id}] was denied ability [{$ability}] on [{$arguments}]";

                activity('security')
                    ->causedBy($user)
                    ->withProperties([
                        'ability' => $ability,
                        'arguments' => $arguments,
                        'decision' => 'denied',
                    ])
                    ->log($logMessage);
            }
        });
    }
}
