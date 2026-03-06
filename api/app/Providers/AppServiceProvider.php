<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

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
    }

    private function resolveIpRateLimitKey(Request $request): string
    {
        $ipAddress = $request->ip() ?? 'unknown-ip';

        return "ip:{$ipAddress}";
    }
}
