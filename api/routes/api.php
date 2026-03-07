<?php

use App\Http\Controllers\Api\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\ProviderController as AdminProviderController;
use App\Http\Controllers\Api\CheckoutOrderController;
use App\Http\Controllers\Api\JoinLeadController;
use App\Http\Controllers\Api\CartTokenController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\ZoneController;
use Illuminate\Support\Facades\Route;

Route::get('/zones', [ZoneController::class, 'index'])
    ->middleware('throttle:zones');

Route::get('/join/session', [JoinLeadController::class, 'session'])
    ->middleware('throttle:join-session');

Route::post('/join/lead', [JoinLeadController::class, 'store'])
    ->middleware('throttle:join-submit');

Route::post('/cart/token', [CartTokenController::class, 'store'])
    ->middleware('throttle:cart-token-store');

Route::get('/cart/token/{token}', [CartTokenController::class, 'resolve'])
    ->middleware('throttle:cart-token-resolve');

Route::get('/vendors', [VendorController::class, 'index'])
    ->middleware('throttle:vendors');

Route::get('/vendors/{id}/catalog', [VendorController::class, 'catalog'])
    ->whereNumber('id')
    ->middleware('throttle:catalog');

Route::post('/checkout/orders', [CheckoutOrderController::class, 'store'])
    ->middleware('throttle:checkout-orders');

Route::prefix('admin')->group(function (): void {
    Route::prefix('auth')->group(function (): void {
        Route::post('/login', [AdminAuthController::class, 'login'])
            ->middleware('throttle:admin-auth');

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::post('/logout', [AdminAuthController::class, 'logout']);
            Route::get('/me', [AdminAuthController::class, 'me']);
        });
    });

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::middleware([
            'throttle:admin-read',
            'role:super_admin|catalog_manager|merchant_success|ops_dispatcher,admin',
        ])->group(function (): void {
            Route::get('/providers', [AdminProviderController::class, 'index']);
            Route::get('/providers/{provider}', [AdminProviderController::class, 'show']);
        });

        Route::middleware([
            'throttle:admin-write',
            'role:super_admin|catalog_manager|merchant_success|ops_dispatcher,admin',
        ])->group(function (): void {
            Route::post('/providers', [AdminProviderController::class, 'store']);
            Route::patch('/providers/{provider}', [AdminProviderController::class, 'update']);
        });

        Route::middleware([
            'throttle:admin-read',
            'role:super_admin|ops_dispatcher|support_analyst|merchant_success,admin',
        ])->group(function (): void {
            Route::get('/orders', [AdminOrderController::class, 'index']);
            Route::get('/orders/{order}', [AdminOrderController::class, 'show']);
            Route::get('/customers', [AdminCustomerController::class, 'index']);
            Route::get('/customers/{user}', [AdminCustomerController::class, 'show']);
        });
    });
});
