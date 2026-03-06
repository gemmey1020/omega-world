<?php

use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\ZoneController;
use Illuminate\Support\Facades\Route;

Route::get('/zones', [ZoneController::class, 'index'])
    ->middleware('throttle:zones');

Route::get('/vendors', [VendorController::class, 'index'])
    ->middleware('throttle:vendors');

Route::get('/vendors/{id}/catalog', [VendorController::class, 'catalog'])
    ->whereNumber('id')
    ->middleware('throttle:catalog');
