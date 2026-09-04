<?php

/**
 * Settings Routes
 *
 * Routes for managing user account settings: profile info, password,
 * account deletion, and appearance preferences.
 *
 * Two middleware groups are used:
 *  - `auth`            → profile view & update (email not yet verified is OK).
 *  - `auth` + `verified` → destructive actions (delete account) and password changes.
 */

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ── Profile (authentication required, verification NOT required) ──────

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

// ── Password, Account Deletion & Appearance (verified users only) ────

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('user-password.edit');

    // Throttled to 6 attempts per minute to prevent brute-force password changes.
    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance.edit');
});
