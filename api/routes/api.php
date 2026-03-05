<?php

use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\ZoneController;
use Illuminate\Support\Facades\Route;

Route::get('/zones', [ZoneController::class, 'index']);
Route::get('/vendors', [VendorController::class, 'index']);
Route::get('/vendors/{id}/catalog', [VendorController::class, 'catalog'])->whereNumber('id');
