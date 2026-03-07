<?php

use App\Http\Controllers\Api\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\ProviderController as AdminProviderController;
use App\Http\Controllers\Api\CheckoutOrderController;
use App\Http\Controllers\Api\JoinLeadController;
use App\Http\Controllers\Api\CartTokenController;
use App\Http\Controllers\Api\ProviderAssignmentController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\ZoneController;
use Illuminate\Support\Facades\Route;

$adminRoles = array_values(array_filter(
    (array) config('admin.roles', []),
    static fn (mixed $role): bool => is_string($role) && $role !== ''
));
$adminRoleMiddleware = 'role:'.implode('|', $adminRoles).',admin';
$superAdminRoleMiddleware = 'role:'.(string) config('admin.root_role', 'super_admin').',admin';

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

Route::post('/provider/assignments/{assignment}/accept', [ProviderAssignmentController::class, 'accept'])
    ->whereNumber('assignment')
    ->middleware('signed')
    ->name('provider.assignments.accept');

Route::prefix('admin')->group(function () use ($adminRoleMiddleware, $superAdminRoleMiddleware): void {
    Route::prefix('auth')->group(function (): void {
        Route::post('/login', [AdminAuthController::class, 'login'])
            ->middleware('throttle:admin-auth');
    });

    Route::middleware(['auth:admin', $adminRoleMiddleware])->group(function () use ($superAdminRoleMiddleware): void {
        Route::prefix('auth')->group(function () use ($superAdminRoleMiddleware): void {
            Route::post('/logout', [AdminAuthController::class, 'logout'])
                ->middleware('throttle:admin-write');

            Route::get('/me', [AdminAuthController::class, 'me'])
                ->middleware('throttle:admin-read');

            Route::post('/register', [AdminAuthController::class, 'register'])
                ->middleware([$superAdminRoleMiddleware, 'throttle:admin-write']);
        });

        Route::middleware('throttle:admin-read')->group(function (): void {
            Route::get('/providers', [AdminProviderController::class, 'index']);
            Route::get('/providers/{provider}', [AdminProviderController::class, 'show']);
            Route::get('/orders', [AdminOrderController::class, 'index']);
            Route::get('/orders/{order}', [AdminOrderController::class, 'show']);
            Route::get('/customers', [AdminCustomerController::class, 'index']);
            Route::get('/customers/{user}', [AdminCustomerController::class, 'show']);
        });

        Route::middleware('throttle:admin-write')->group(function (): void {
            Route::post('/providers', [AdminProviderController::class, 'store']);
            Route::patch('/providers/{provider}', [AdminProviderController::class, 'update']);
            Route::post('/orders/{order}/mark-in-transit', [AdminOrderController::class, 'markInTransit']);
            Route::post('/orders/{order}/mark-delivered', [AdminOrderController::class, 'markDelivered']);
        });
    });
});
