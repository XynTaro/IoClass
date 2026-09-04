<?php

use App\Http\Controllers\Api\RfidController;
use Illuminate\Support\Facades\Route;

Route::prefix('rfid')->group(function () {
    Route::get('ping', fn () => response()->json(['ok' => true]))->name('api.rfid.ping');

    Route::middleware(['rfid.device', 'throttle:60,1'])->group(function () {
        Route::post('scan', [RfidController::class, 'scan'])->name('api.rfid.scan');
        Route::post('capture', [RfidController::class, 'capture'])->name('api.rfid.capture');
        Route::post('register', [RfidController::class, 'register'])->name('api.rfid.register');
    });
});
