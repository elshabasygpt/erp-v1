<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Presentation\Middleware\TenantMiddleware;
use App\Presentation\Middleware\SubscriptionActiveMiddleware;
use App\Presentation\Middleware\RolePermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'tenant' => TenantMiddleware::class,
            'subscription.active' => SubscriptionActiveMiddleware::class,
            'role' => RolePermissionMiddleware::class,
            'partner.auth' => \App\Http\Middleware\PartnerAuth::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.', 'data' => null], 401);
        });

        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, \Illuminate\Http\Request $request) {
            return response()->json([
                'success' => false, 
                'message' => 'Validation error', 
                'data' => $e->errors()
            ], 422);
        });

        $exceptions->render(function (\DomainException $e, \Illuminate\Http\Request $request) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => null
            ], 400);
        });

        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            if (app()->environment('local')) {
                return false; // let Laravel handle it
            }

            $statusCode = $e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface ? $e->getStatusCode() : 500;
            
            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred.',
                'data' => null
            ], $statusCode);
        });
    })
    ->withSchedule(function (\Illuminate\Console\Scheduling\Schedule $schedule) {
        $schedule->command('approvals:escalate')->hourly();
    })
    ->create();
