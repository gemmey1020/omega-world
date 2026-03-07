<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

$trustedProxies = array_values(array_filter(array_map(
    static fn (string $proxy): string => trim($proxy),
    explode(',', (string) env('TRUSTED_PROXIES', '127.0.0.1,::1'))
), static fn (string $proxy): bool => $proxy !== ''));

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([
        __DIR__.'/../app/Console/Commands',
    ])
    ->withMiddleware(function (Middleware $middleware) use ($trustedProxies): void {
        $middleware->redirectGuestsTo(static function (Request $request): ?string {
            if ($request->is('api/*')) {
                return null;
            }

            return route('login');
        });

        $middleware->web(prepend: [
            \App\Http\Middleware\ResolveSessionCookieName::class,
        ]);

        $middleware->api(prepend: [
            \App\Http\Middleware\ResolveSessionCookieName::class,
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);

        $middleware->statefulApi();
        $middleware->throttleApi('60,1');
        $middleware->trustProxies(at: $trustedProxies);
        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            static fn (Request $request, \Throwable $exception): bool => $request->is('api/*') || $request->expectsJson()
        );

        $exceptions->render(function (AuthenticationException $exception, Request $request) {
            if (! $request->is('api/admin/*')) {
                return null;
            }

            return response()->json([
                'message' => $exception->getMessage(),
            ], 401);
        });
    })->create();
