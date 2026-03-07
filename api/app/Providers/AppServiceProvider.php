<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('zones', function (Request $request) {
            return Limit::perMinute(60)->by($this->resolveIpRateLimitKey($request));
        });

        RateLimiter::for('vendors', function (Request $request) {
            return Limit::perMinute(30)->by($this->resolveIpRateLimitKey($request));
        });

        RateLimiter::for('catalog', function (Request $request) {
            return Limit::perMinute(20)->by($this->resolveIpRateLimitKey($request));
        });

        RateLimiter::for('join-session', function (Request $request) {
            return Limit::perMinutes(10, 10)->by($this->resolveIpRateLimitKey($request));
        });

        RateLimiter::for('join-submit', function (Request $request) {
            $deviceHash = strtolower(trim((string) $request->input('device_hash', 'missing-device')));

            return [
                Limit::perMinutes(15, 5)->by($this->resolveIpRateLimitKey($request)),
                Limit::perMinutes(15, 3)->by("join-submit:device:{$deviceHash}"),
            ];
        });

        RateLimiter::for('cart-token-store', function (Request $request) {
            return Limit::perMinute(10)->by($this->resolveIpRateLimitKey($request));
        });

        RateLimiter::for('cart-token-resolve', function (Request $request) {
            return Limit::perMinute(30)->by($this->resolveIpRateLimitKey($request));
        });

        RateLimiter::for('admin-auth', function (Request $request) {
            $email = strtolower(trim((string) $request->input('email', 'unknown-email')));

            return Limit::perMinutes(10, 10)
                ->by("admin-auth:{$this->resolveIpRateLimitKey($request)}:{$email}")
                ->response(fn (Request $request, array $headers) => $this->buildThrottleResponse($request, $headers, 'admin-auth'));
        });

        RateLimiter::for('admin-read', function (Request $request) {
            return Limit::perMinute(120)
                ->by($this->resolveActorRateLimitKey($request, 'admin-read'))
                ->response(fn (Request $request, array $headers) => $this->buildThrottleResponse($request, $headers, 'admin-read'));
        });

        RateLimiter::for('admin-write', function (Request $request) {
            return Limit::perMinute(30)
                ->by($this->resolveActorRateLimitKey($request, 'admin-write'))
                ->response(fn (Request $request, array $headers) => $this->buildThrottleResponse($request, $headers, 'admin-write'));
        });

        RateLimiter::for('checkout-orders', function (Request $request) {
            $deviceHash = strtolower(trim((string) $request->input('device_hash', 'missing-device')));

            return [
                Limit::perMinutes(10, 10)
                    ->by($this->resolveIpRateLimitKey($request))
                    ->response(fn (Request $request, array $headers) => $this->buildThrottleResponse($request, $headers, 'checkout-orders')),
                Limit::perMinutes(10, 5)
                    ->by("checkout-orders:device:{$deviceHash}")
                    ->response(fn (Request $request, array $headers) => $this->buildThrottleResponse($request, $headers, 'checkout-orders')),
            ];
        });
    }

    private function resolveIpRateLimitKey(Request $request): string
    {
        $ipAddress = $request->ip() ?? 'unknown-ip';

        return "ip:{$ipAddress}";
    }

    private function resolveActorRateLimitKey(Request $request, string $scope): string
    {
        $actorId = $request->user()?->getAuthIdentifier();

        if ($actorId !== null) {
            return "{$scope}:user:{$actorId}";
        }

        return "{$scope}:{$this->resolveIpRateLimitKey($request)}";
    }

    /**
     * @param  array<string, string|int>  $headers
     */
    private function buildThrottleResponse(Request $request, array $headers, string $scope)
    {
        $retryAfter = (int) ($headers['Retry-After'] ?? $headers['retry-after'] ?? 60);
        $requestId = (string) ($request->headers->get('X-Request-Id') ?: Str::uuid());

        return response()->json([
            'message' => 'Too Many Attempts.',
            'retry_after_seconds' => $retryAfter,
            'limit_scope' => $scope,
            'request_id' => $requestId,
        ], 429, $headers);
    }
}
