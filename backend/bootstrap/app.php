<?php

use App\Http\Middleware\PartnerAuth;
use App\Presentation\Middleware\RolePermissionMiddleware;
use App\Presentation\Middleware\SubscriptionActiveMiddleware;
use App\Presentation\Middleware\TenantMiddleware;
use App\Providers\AppServiceProvider;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
    )
    ->withProviders([
        AppServiceProvider::class,
    ])
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'tenant' => TenantMiddleware::class,
            'subscription.active' => SubscriptionActiveMiddleware::class,
            'role' => RolePermissionMiddleware::class,
            'partner.auth' => PartnerAuth::class,
            'rbac' => \App\Http\Middleware\EnforceRbacMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.', 'data' => null], 401);
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'data' => $e->errors(),
            ], 422);
        });

        $exceptions->render(function (DomainException $e, Request $request) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => null,
            ], 400);
        });

        $exceptions->render(function (Throwable $e, Request $request) {
            if (app()->environment('local')) {
                return false; // let Laravel handle it
            }

            $statusCode = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred.',
                'data' => null,
            ], $statusCode);
        });
    })
    ->withSchedule(function (Schedule $schedule) {
        $schedule->command('approvals:escalate')->hourly();
    })
    ->create();
